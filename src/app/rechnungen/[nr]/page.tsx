import Link from "next/link";
import { notFound } from "next/navigation";
import { dmy, eurSym, isoDate } from "@/lib/format";
import { ledgerSource, loadLedger } from "@/lib/ledger";
import { invoiceNumberFromFile } from "@/lib/reconcile";
import { openDb } from "@/lib/store";
import { markPaidAction } from "../../actions";
import { effectiveStatus, StatusPill } from "../../ui";

export const dynamic = "force-dynamic";

export default async function InvoiceDetail({ params }: { params: Promise<{ nr: string }> }) {
  const { nr } = await params;
  const db = openDb();
  const inv = (await db.invoices.all()).find((i) => i.number === nr);
  if (!inv) notFound();
  const [contact, lines, ledger] = await Promise.all([
    db.contacts.all().then((c) => c.find((x) => x.id === inv.customer)),
    db.invoiceLines.all().then((l) => l.filter((x) => x.invoice === nr)),
    loadLedger(Number(inv.date.slice(0, 4))).catch(() => []),
  ]);
  const inLedger = ledger.filter((r) => invoiceNumberFromFile(r.file) === nr);
  const st = effectiveStatus(inv, inLedger.some((r) => r.income > 0), isoDate(new Date()));
  const hasFile = Boolean(inv.pdfUrl) && lines.length > 0;

  return (
    <>
      <div className="head">
        <div><Link href="/rechnungen" className="sub">← Rechnungen</Link><h1>Rechnung {inv.number}</h1></div>
        {st !== "Bezahlt" && (
          <form action={markPaidAction} className="inline">
            <input type="hidden" name="number" value={inv.number} />
            <input type="date" name="paidOn" defaultValue={isoDate(new Date())} />
            <button className="btn primary">Als bezahlt markieren</button>
          </form>
        )}
      </div>
      <div className="grid" style={{ gridTemplateColumns: "minmax(0,1fr) 340px", alignItems: "start" }}>
        {hasFile ? <iframe className="pdf" src={`/rechnungen/${inv.number}/pdf`} title={inv.number} />
          : <div className="card"><div className="empty">Für diese Rechnung liegt hier keine PDF mit Positionen vor (aus Sevdesk übernommen). Die Datei findest du in Drive unter Ausgangsrechnungen.</div></div>}
        <div className="card">
          <div className="rowline"><span>Status</span><StatusPill s={st} /></div>
          <div className="rowline"><span>Kunde</span><b>{contact?.name ?? inv.customer}</b></div>
          <div className="rowline"><span>Rechnungsdatum</span><span>{dmy(inv.date)}</span></div>
          <div className="rowline"><span>Fällig</span><span>{dmy(inv.dueDate)}</span></div>
          <div className="rowline"><span>Netto</span><span className="num">{eurSym(inv.net)}</span></div>
          <div className="rowline"><span>USt</span><span className="num">{eurSym(inv.vat)}</span></div>
          <div className="rowline"><span>Brutto</span><b className="num">{eurSym(inv.gross)}</b></div>
          {inv.paidOn && <div className="rowline"><span>Bezahlt am</span><span>{dmy(inv.paidOn)}</span></div>}
          <div className="rowline"><span>GuV</span>
            <span>{ledgerSource() === "none" ? "nicht verbunden" : inLedger.length ? `Zeile ${inLedger.map((r) => r.seq).join(", ")}` : "nicht eingetragen"}</span></div>
          {inv.draftId && <div className="rowline"><span>Gmail</span><a href="https://mail.google.com/mail/u/0/#drafts" target="_blank">Entwurf öffnen</a></div>}
          {inv.pdfUrl.startsWith("http") && <div className="rowline"><span>Drive</span><a href={inv.pdfUrl} target="_blank">PDF öffnen</a></div>}
        </div>
      </div>
    </>
  );
}
