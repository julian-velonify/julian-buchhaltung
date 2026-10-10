import { ledgerSource, loadLedger, LEDGER_YEARS } from "@/lib/ledger";
import { reconcile } from "@/lib/reconcile";
import { openDb } from "@/lib/store";
import { Pill } from "../ui";

export const dynamic = "force-dynamic";

export default async function Reconcile({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const { year: y } = await searchParams;
  const year = Number(y) || new Date().getFullYear();
  const db = openDb();
  const [ledger, invoices, receipts] = await Promise.all([loadLedger(year).catch(() => []), db.invoices.all(), db.receipts.all()]);
  const findings = reconcile({ year, ledger, invoices, receipts });
  const tone = { fehler: "bad", warnung: "warn", info: undefined } as const;
  const count = (s: string) => findings.filter((f) => f.severity === s).length;

  return (
    <>
      <div className="head">
        <div><h1>GuV-Abgleich</h1><div className="sub">Deine GuV ↔ Rechnungsregister ↔ Belege · {year}</div></div>
        <form className="inline"><select name="year" defaultValue={year}>{LEDGER_YEARS.map((v) => <option key={v}>{v}</option>)}</select><button className="btn">Prüfen</button></form>
      </div>

      {ledgerSource() === "none" ? (
        <div className="note warn">Die GuV-Tabelle ist nicht verbunden, daher kann nichts abgeglichen werden. Sobald Google verbunden ist (README, Schritt 2), liest die App dein Blatt „{year}“.</div>
      ) : (
        <div className="grid g4" style={{ marginBottom: 18 }}>
          <div className="stat"><div className="k">GuV-Zeilen</div><div className="v">{ledger.length}</div></div>
          <div className="stat"><div className="k">Fehler</div><div className="v">{count("fehler")}</div></div>
          <div className="stat"><div className="k">Warnungen</div><div className="v">{count("warnung")}</div></div>
          <div className="stat"><div className="k">Hinweise</div><div className="v">{count("info")}</div></div>
        </div>
      )}

      <div className="card tight">
        <table className="t">
          <thead><tr><th>Stufe</th><th>Befund</th><th>Details</th></tr></thead>
          <tbody>
            {findings.map((f, i) => (
              <tr key={i}><td><Pill tone={tone[f.severity]}>{f.severity}</Pill></td><td><b>{f.title}</b></td><td className="sub">{f.detail}</td></tr>
            ))}
            {findings.length === 0 && <tr><td colSpan={3} className="empty">{ledgerSource() === "none" ? "Keine Daten." : "Alles stimmig – keine Abweichungen gefunden."}</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
