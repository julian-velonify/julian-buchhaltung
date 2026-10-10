import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { addDays, monthName, round2 } from "./format";
import { createInvoiceDraft } from "./google/gmail";
import { uploadInvoicePdf } from "./google/drive";
import { googleConfigured } from "./google/auth";
import { renderInvoiceHtml } from "./invoice/html";
import { htmlToPdf } from "./invoice/pdf";
import { loadSender, logAction, regimeFor, type Db } from "./store";
import type { Contact, ContractLine, Invoice, InvoiceLine, OneOff } from "./types";

export type BillingPlanItem = {
  contact: Contact;
  invoice: Invoice;
  lines: InvoiceLine[];
  oneOffIds: string[];
};
export type BillingResult = {
  planned: BillingPlanItem[];
  skipped: { customer: string; name: string; reason: string }[];
  created: { number: string; customer: string; name: string; gross: number; pdf: string; draft: string; warning?: string }[];
};

const inRange = (l: ContractLine, date: string) => l.active && (!l.validFrom || l.validFrom <= date) && (!l.validTo || l.validTo >= date);

export async function planBilling(db: Db, opts: { date: string; period?: string }): Promise<BillingResult> {
  const period = opts.period ?? opts.date.slice(0, 7);
  const year = Number(opts.date.slice(0, 4));
  const [contacts, contract, oneOffs, invoices, regimes, counters] = await Promise.all([
    db.contacts.all(), db.contracts.all(), db.oneOffs.all(), db.invoices.all(), db.taxRegimes.all(), db.counters.all(),
  ]);
  const regime = regimeFor(regimes, opts.date);

  const nums = invoices
    .filter((i) => i.number.startsWith(`RE-${year}-`))
    .map((i) => Number(i.number.split("-")[2]))
    .filter(Number.isFinite);
  let next = Math.max(counters.find((c) => c.year === year)?.last ?? 0, ...nums, 0) + 1;

  const result: BillingResult = { planned: [], skipped: [], created: [] };
  const customers = [...new Set([...contract.filter((l) => inRange(l, opts.date)).map((l) => l.customer),
    ...oneOffs.filter((o) => o.status === "offen" && o.billingMonth <= period).map((o) => o.customer)])];

  for (const id of customers.sort((a, b) => Number(a) - Number(b))) {
    const contact = contacts.find((c) => c.id === id);
    if (!contact) { result.skipped.push({ customer: id, name: "?", reason: "Kunde nicht in Kontakte" }); continue; }
    if (!contact.active) { result.skipped.push({ customer: id, name: contact.name, reason: "Kontakt inaktiv" }); continue; }
    if (invoices.some((i) => i.customer === id && i.period === period && i.kind === "Monat" && i.status !== "Storniert")) {
      result.skipped.push({ customer: id, name: contact.name, reason: `Rechnung für ${period} existiert bereits` });
      continue;
    }

    const cl = contract.filter((l) => l.customer === id && inRange(l, opts.date));
    const oo: OneOff[] = oneOffs.filter((o) => o.customer === id && o.status === "offen" && o.billingMonth <= period);
    const src = [...cl, ...oo];
    if (!src.length) continue;

    const number = `RE-${year}-${next++}`;
    const lines: InvoiceLine[] = src.map((l, i) => ({
      invoice: number, pos: i + 1, description: l.description, details: l.details,
      quantity: l.quantity, unit: l.unit || "Stk", unitPrice: l.unitPrice, total: round2(l.quantity * l.unitPrice),
    }));
    const net = round2(lines.reduce((a, l) => a + l.total, 0));
    const vat = regime.type === "regelbesteuert" ? round2(net * regime.vatRate) : 0;
    const terms = contact.paymentTermsDays || 14;

    result.planned.push({
      contact, lines, oneOffIds: oo.map((o) => o.id),
      invoice: {
        number, customer: id, date: opts.date, serviceDate: opts.date, period, dueDate: addDays(opts.date, terms),
        net, vat, gross: round2(net + vat), status: "Entwurf", paidOn: "", kind: "Monat",
        pdfFileId: "", pdfUrl: "", draftId: "", createdAt: new Date().toISOString(),
      },
    });
  }
  return result;
}

function mailBody(contact: Contact, inv: Invoice, senderName: string): string {
  const du = contact.tone === "du";
  const first = contact.salutation || (du ? "Hallo," : "Guten Tag,");
  const [m] = [monthName(inv.date)];
  return [
    first, "",
    du
      ? `anbei findest du die Rechnung ${inv.number} über ${inv.gross.toLocaleString("de-DE", { minimumFractionDigits: 2 })} € für ${m}.`
      : `anbei erhalten Sie die Rechnung ${inv.number} über ${inv.gross.toLocaleString("de-DE", { minimumFractionDigits: 2 })} € für ${m}.`,
    "", `Fällig bis ${inv.dueDate.split("-").reverse().join(".")}.`, "",
    du ? "Bei Fragen melde dich gern." : "Bei Fragen melden Sie sich gern.", "",
    "Viele Grüße", senderName,
  ].join("\n");
}

/** Erzeugt PDFs, legt sie in Drive (oder lokal) ab, erstellt Gmail-Entwürfe und schreibt das Rechnungsregister. */
export async function executeBilling(db: Db, opts: { date: string; period?: string; only?: string[] }): Promise<BillingResult> {
  const plan = await planBilling(db, opts);
  const [sender, regimes] = await Promise.all([loadSender(db), db.taxRegimes.all()]);
  const regime = regimeFor(regimes, opts.date);
  const useGoogle = googleConfigured();
  const root = process.env.DRIVE_ROOT_FOLDER_ID;
  const year = Number(opts.date.slice(0, 4));
  const items = opts.only ? plan.planned.filter((p) => opts.only!.includes(p.contact.id)) : plan.planned;
  plan.planned = items;

  for (const it of items) {
    const { invoice: inv, lines, contact } = it;
    const pdf = await htmlToPdf(renderInvoiceHtml({ invoice: inv, lines, contact, sender, regime }));
    const fileName = `${inv.number}.pdf`;
    let where = "";
    let warning: string | undefined;

    if (useGoogle && root) {
      const up = await uploadInvoicePdf({ rootFolderId: root, year, monthName: monthName(inv.date), fileName, pdf });
      inv.pdfFileId = up.id; inv.pdfUrl = up.url; where = up.url;
    } else {
      const dir = join(process.cwd(), "data", "out", String(year), monthName(inv.date));
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, fileName), pdf);
      inv.pdfUrl = `local:${year}/${monthName(inv.date)}/${fileName}`; where = inv.pdfUrl;
    }

    if (useGoogle && contact.email) {
      inv.draftId = await createInvoiceDraft({
        to: contact.email, subject: `Rechnung ${inv.number}`, body: mailBody(contact, inv, sender.name), fileName, pdf,
      });
    } else {
      warning = !contact.email ? "Keine E-Mail-Adresse – kein Gmail-Entwurf" : "Google nicht verbunden – kein Gmail-Entwurf";
    }

    await db.invoices.append([inv]);
    await db.invoiceLines.append(lines);
    for (const id of it.oneOffIds) {
      const o = (await db.oneOffs.all()).find((x) => x.id === id);
      if (o) await db.oneOffs.upsert({ ...o, status: "abgerechnet" });
    }
    const counters = await db.counters.all();
    await db.counters.upsert({ year, last: Math.max(counters.find((c) => c.year === year)?.last ?? 0, Number(inv.number.split("-")[2])) });
    await logAction(db, "Rechnung erstellt", `${inv.number} · ${contact.name} · ${inv.gross.toFixed(2)} EUR${inv.draftId ? " · Gmail-Entwurf" : ""}`);

    plan.created.push({ number: inv.number, customer: contact.id, name: contact.name, gross: inv.gross, pdf: where, draft: inv.draftId, warning });
  }
  return plan;
}
