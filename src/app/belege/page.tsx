import { dmy, eurSym } from "@/lib/format";
import { openDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Receipts() {
  const rows = (await openDb().receipts.all()).sort((a, b) => b.date.localeCompare(a.date));
  return (
    <>
      <div className="head"><div><h1>Belege</h1><div className="sub">Eingangsrechnungen & Ausgaben</div></div></div>
      <div className="note">
        Belege werden künftig aus dem Drive-Ordner <code>Eingangsrechnungen</code> eingelesen (Datum, Lieferant, Netto/USt/Brutto, Kategorie) und mit deiner GuV abgeglichen.
        Diese Funktion ist der nächste Baustein – hier erscheinen die Einträge aus dem Tabellenblatt <b>Belege</b>.
      </div>
      <div className="card tight">
        <table className="t">
          <thead><tr><th>Datum</th><th>Lieferant</th><th>Beschreibung</th><th>Kategorie</th><th className="num">Brutto</th><th className="num">USt</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}><td>{dmy(r.date)}</td><td>{r.vendor}</td><td>{r.description}</td><td>{r.category}</td>
                <td className="num">{eurSym(r.gross)}</td><td className="num">{eurSym(r.vat)}</td></tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="empty">Noch keine Belege erfasst.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
