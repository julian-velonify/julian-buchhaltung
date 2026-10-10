// Befüllt den lokalen Modus (data/db/*.json) aus den privaten Startdaten in data/.
//   data/config.yaml, data/contracts.yaml, data/contacts.json  (nicht im Repo!)
import "./env";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { openDb } from "../src/lib/store";
import { LocalTable } from "../src/lib/store/local";
import { ALL_TABS } from "../src/lib/tabs";
import type { Contact, ContractLine, Invoice, Setting, TaxRegime } from "../src/lib/types";

const root = process.cwd();
const cfg = parse(readFileSync(join(root, "data/config.yaml"), "utf8")) as {
  sender: Record<string, string>; taxRegimes: { validFrom: string; type: TaxRegime["type"]; vatRate?: number }[];
};
const { contracts } = parse(readFileSync(join(root, "data/contracts.yaml"), "utf8")) as {
  contracts: { customer: string; salutation: string; tone: "du" | "sie"; paymentTermsDays: number; active?: boolean;
    items: { description: string; details?: string; quantity: number; unit: string; unitPrice: number }[] }[];
};
const raw = JSON.parse(readFileSync(join(root, "data/contacts.json"), "utf8")) as Record<string, string | number | undefined>[];

const byCustomer = new Map(contracts.map((c) => [c.customer, c]));
const contacts: Contact[] = raw.map((r) => {
  const k = byCustomer.get(String(r.id));
  return {
    id: String(r.id), name: String(r.name ?? ""), contactPerson: String(r.contactPerson ?? ""), category: String(r.category ?? ""),
    street: String(r.street ?? ""), zip: String(r.zip ?? ""), city: String(r.city ?? ""), country: String(r.country ?? ""),
    email: String(r.email ?? ""), vatId: String(r.vatId ?? ""),
    paymentTermsDays: k?.paymentTermsDays ?? (Number(r.paymentTermsDays) || 14),
    salutation: k?.salutation ?? "", tone: k?.tone ?? "sie",
    active: Boolean(k) && k?.active !== false,
  };
});

const lines: ContractLine[] = contracts.flatMap((c) =>
  c.items.map((it, i) => ({
    id: `V-${c.customer}-${i + 1}`, customer: c.customer, description: it.description, details: it.details ?? "",
    quantity: it.quantity, unit: it.unit, unitPrice: it.unitPrice, validFrom: "", validTo: "", active: c.active !== false,
  })));

const sender = cfg.sender;
const settings: Setting[] = [
  ...Object.entries(sender).map(([key, value]) => ({ key, value: String(value) })),
  { key: "ust_versteuerung", value: "Soll" },   // Soll | Ist – mit Steuerberater klären (§20 UStG)
];

const regimes: TaxRegime[] = cfg.taxRegimes.map((r) => ({ validFrom: r.validFrom, type: r.type, vatRate: r.vatRate ?? 0 }));

// Bereits ausgestellte Rechnungen (aus den Drive-PDFs gelesen) – damit Nummernkreis & Duplikatschutz stimmen.
// Liegt in data/history.json (nicht im Repo): { year, lastNumber, invoices: [[nr, kunde, datum, brutto], …] }
const history = JSON.parse(readFileSync(join(root, "data/history.json"), "utf8")) as {
  year: number; lastNumber: number; invoices: [string, string, string, number][];
};
const hist = history.invoices;
const addDays = (iso: string, d: number) => { const t = new Date(iso + "T12:00:00"); t.setDate(t.getDate() + d); return t.toISOString().slice(0, 10); };
const invoices: Invoice[] = hist.map(([n, cust, date, gross]) => ({
  number: `RE-${history.year}-${n}`, customer: cust, date, serviceDate: date, period: date.slice(0, 7),
  dueDate: addDays(date, byCustomer.get(cust)?.paymentTermsDays ?? 14), net: gross, vat: 0, gross,
  status: "Versendet", paidOn: "", kind: "Monat", pdfFileId: "", pdfUrl: "", draftId: "", createdAt: "",
}));

const { mkdirSync } = await import("node:fs");
mkdirSync(join(root, "data/db"), { recursive: true });
const w = <T,>(def: (typeof ALL_TABS)[number], rows: T[]) => new LocalTable(def as never).replaceAll(rows as never);
await w(ALL_TABS[0], contacts);
await w(ALL_TABS[1], lines);
await w(ALL_TABS[3], invoices);
await w(ALL_TABS[7], settings);
await w(ALL_TABS[8], regimes);
await w(ALL_TABS[9], [{ year: history.year, last: history.lastNumber }]);
for (const i of [2, 4, 5, 6]) await w(ALL_TABS[i], []);   // Einmalig, Positionen, Belege, Verlauf

void openDb;
console.log(`Seed: ${contacts.length} Kontakte, ${lines.length} Vertragspositionen, ${invoices.length} Rechnungen → data/db/`);
