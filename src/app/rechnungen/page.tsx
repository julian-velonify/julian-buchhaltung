import Link from "next/link";
import { planBilling } from "@/lib/billing";
import { dmy, eurSym, isoDate } from "@/lib/format";
import { ledgerSource, loadLedger } from "@/lib/ledger";
import { invoiceNumberFromFile } from "@/lib/reconcile";
import { openDb } from "@/lib/store";
import { generateInvoicesAction } from "../actions";
import { effectiveStatus, StatusPill } from "../ui";

export const dynamic = "force-dynamic";

export default async function Invoices({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const db = openDb();
  const today = isoDate(new Date());
  const date = sp.date || today;
  const [invoices, contacts, ledger, plan] = await Promise.all([
    db.invoices.all(), db.contacts.all(), loadLedger(new Date().getFullYear()).catch(() => []), planBilling(db, { date }),
  ]);
  const paid = new Set(ledger.filter((r) => r.income > 0).map((r) => invoiceNumberFromFile(r.file)).filter(Boolean));
  const name = (id: string) => contacts.find((c) => c.id === id)?.name ?? id;

  const rows = [...invoices].sort((a, b) => b.number.localeCompare(a.number)).map((i) => ({ i, st: effectiveStatus(i, paid.has(i.number), today) }));
  const f = sp.f;
  const shown = rows.filter((r) => !f || (f === "faellig" ? r.st === "Fällig" : f === "offen" ? r.st === "Offen" : f === "bezahlt" ? r.st === "Bezahlt" : true));
  const openSum = rows.filter((r) => r.st === "Offen" || r.st === "Fällig").reduce((a, r) => a + r.i.gross, 0);

  return (
    <>
      <div className="head">
        <div><h1>Rechnungen</h1><div className="sub">Offene Rechnungen: {eurSym(openSum)}</div></div>
      </div>

      {sp.created !== undefined && (
        <div className="note">{sp.created} Rechnung(en) erstellt{Number(sp.skipped) ? `, ${sp.skipped} übersprungen` : ""}. PDFs liegen in Drive bzw. <code>data/out/</code>, gesendet wird nichts – Gmail-Entwürfe prüfst du in Gmail.</div>
      )}

      <div className="card" style={{ marginBottom: 18 }}>
        <h2>Monatsrechnungen</h2>
        <form className="inline" action="/rechnungen" style={{ marginBottom: 14 }}>
          <label className="f">Rechnungsdatum<input type="date" name="date" defaultValue={date} /></label>
          <button className="btn" style={{ alignSelf: "end" }}>Vorschau aktualisieren</button>
        </form>
        {plan.planned.length === 0 ? (
          <div className="sub">Für {dmy(date)} gibt es nichts zu erzeugen.{plan.skipped.length ? ` (${plan.skipped.length} bereits abgerechnet bzw. übersprungen)` : ""}</div>
        ) : (
          <form action={generateInvoicesAction}>
            <input type="hidden" name="date" value={date} />
            <table className="t" style={{ border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
              <thead><tr><th></th><th>Nr.</th><th>Kunde</th><th className="num">Brutto</th><th>Fällig</th><th>Gmail an</th></tr></thead>
              <tbody>
                {plan.planned.map((p) => (
                  <tr key={p.invoice.number}>
                    <td><input type="checkbox" name="only" value={p.contact.id} defaultChecked /></td>
                    <td>{p.invoice.number}</td><td>{p.contact.name}</td>
                    <td className="num">{eurSym(p.invoice.gross)}</td><td>{dmy(p.invoice.dueDate)}</td>
                    <td>{p.contact.email || <span className="pill warn">E-Mail fehlt</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 14, display: "flex", gap: 12, alignItems: "center" }}>
              <button className="btn primary">Rechnungen erstellen + Gmail-Entwürfe anlegen</button>
              <span className="sub" style={{ fontSize: 13 }}>Es wird nichts versendet.</span>
            </div>
          </form>
        )}
        {plan.skipped.length > 0 && plan.planned.length > 0 && (
          <div className="sub" style={{ marginTop: 10, fontSize: 13 }}>Übersprungen: {plan.skipped.map((s) => `${s.name} (${s.reason})`).join(" · ")}</div>
        )}
      </div>

      <div className="tabs">
        {[["", "Alle"], ["offen", "Offen"], ["faellig", "Fällig"], ["bezahlt", "Bezahlt"]].map(([k, l]) => (
          <Link key={k} href={k ? `/rechnungen?f=${k}` : "/rechnungen"} className={(f ?? "") === k ? "on" : ""}>{l}</Link>
        ))}
      </div>
      <div className="card tight">
        <table className="t">
          <thead><tr><th>Status</th><th>Fällig</th><th>Rechnungs-Nr.</th><th>Kunde</th><th>Datum</th><th className="num">Betrag (brutto)</th></tr></thead>
          <tbody>
            {shown.map(({ i, st }) => (
              <tr key={i.number} className="row">
                <td><StatusPill s={st} /></td>
                <td>{dmy(i.dueDate)}</td>
                <td><Link href={`/rechnungen/${i.number}`}><b>{i.number}</b></Link></td>
                <td>{name(i.customer)}</td><td>{dmy(i.date)}</td><td className="num">{eurSym(i.gross)}</td>
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan={6} className="empty">Keine Rechnungen.</td></tr>}
          </tbody>
        </table>
      </div>
      {ledgerSource() === "none" && <div className="sub" style={{ marginTop: 12, fontSize: 13 }}>GuV nicht verbunden – „Bezahlt“ nur per Hand.</div>}
    </>
  );
}
