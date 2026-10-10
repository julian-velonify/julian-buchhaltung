import { eurSym, MONTHS } from "@/lib/format";
import { ledgerSource, loadAllLedgers, LEDGER_YEARS } from "@/lib/ledger";
import { openDb } from "@/lib/store";
import { kleinunternehmerStatus, monthly, totals, ustva } from "@/lib/tax";

export const dynamic = "force-dynamic";

export default async function Taxes({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const { year: y } = await searchParams;
  const year = Number(y) || new Date().getFullYear();
  const db = openDb();
  const [invoices, receipts, regimes, settings, ledgerAll] = await Promise.all([
    db.invoices.all(), db.receipts.all(), db.taxRegimes.all(), db.settings.all(), loadAllLedgers(),
  ]);
  const method = settings.find((s) => s.key === "ust_versteuerung")?.value === "Ist" ? "Ist" : "Soll";
  const rows = ledgerAll.filter((r) => r.year === year);
  const prev = ledgerAll.filter((r) => r.year === year - 1);
  const t = totals(rows);
  const ku = kleinunternehmerStatus(t.income, totals(prev).income);
  const q = ustva({ year, invoices, receipts, regimes, method });
  const m = monthly(rows);

  return (
    <>
      <div className="head">
        <div><h1>Steuern</h1><div className="sub">EÜR {year} · UStVA · Kleinunternehmerstatus</div></div>
        <form className="inline"><select name="year" defaultValue={year}>{[...LEDGER_YEARS, 2027].map((v) => <option key={v}>{v}</option>)}</select><button className="btn">Anzeigen</button></form>
      </div>

      {ledgerSource() === "none" && <div className="note warn">GuV nicht verbunden – EÜR-Zahlen sind leer, bis Google verbunden ist.</div>}

      <div className="grid g2" style={{ marginBottom: 18 }}>
        <div className="card">
          <h2>Einnahmen-Überschuss-Rechnung {year}</h2>
          <div className="rowline"><span>Betriebseinnahmen</span><b className="num">{eurSym(t.income)}</b></div>
          <div className="rowline"><span>Betriebsausgaben</span><b className="num">{eurSym(t.expense)}</b></div>
          <div className="rowline"><span>Gewinn vor Steuern</span><b className="num">{eurSym(t.profit)}</b></div>
          <div className="sub" style={{ fontSize: 13, marginTop: 10 }}>Quelle: deine GuV-Tabelle. Die Zahlen trägst du selbst in ELSTER ein (Anlage EÜR) – es gibt keine freie Schnittstelle.</div>
        </div>
        <div className="card">
          <h2>Kleinunternehmerstatus</h2>
          <div className="rowline"><span>Umsatz {year}</span><b className="num">{eurSym(ku.incomeThisYear)}</b></div>
          <div className="rowline"><span>Umsatz {year - 1}</span><b className="num">{eurSym(ku.incomeLastYear)}</b></div>
          <div className="rowline"><span>Grenze Vorjahr / laufend</span><span className="num">25.000 € / 100.000 €</span></div>
          <div className={`note ${ku.nextYearRegular ? "warn" : ""}`} style={{ marginTop: 14, marginBottom: 0 }}>
            {ku.nextYearRegular
              ? `${year + 1}: Regelbesteuerung (19 % USt), weil ${year} über 25.000 € liegt. Mit dem Steuerberater bestätigen.`
              : `${year + 1}: Kleinunternehmerregelung bleibt, solange ${year} ≤ 25.000 € bleibt.`}
          </div>
        </div>
      </div>

      <div className="card tight" style={{ marginBottom: 18 }}>
        <div style={{ padding: "16px 18px" }}><b>Umsatzsteuer-Voranmeldung {year}</b> <span className="sub">· {method}-Versteuerung (Einstellung)</span></div>
        <table className="t">
          <thead><tr><th>Quartal</th><th>Regime</th><th className="num">Steuerpfl. Umsätze (netto)</th><th className="num">USt</th><th className="num">Vorsteuer</th><th className="num">Zahllast</th></tr></thead>
          <tbody>
            {q.map((x) => (
              <tr key={x.quarter}>
                <td>{x.label}</td><td>{x.applicable ? "Regelbesteuerung" : "§19 – keine USt"}</td>
                <td className="num">{eurSym(x.taxableNet19)}</td><td className="num">{eurSym(x.outputVat)}</td>
                <td className="num">{eurSym(x.inputVat)}</td><td className="num"><b>{eurSym(x.payable)}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card tight">
        <table className="t">
          <thead><tr><th>Monat</th><th className="num">Einnahmen</th><th className="num">Ausgaben</th><th className="num">Gewinn</th></tr></thead>
          <tbody>
            {m.map((x) => (
              <tr key={x.month}><td>{MONTHS[x.month - 1]}</td><td className="num">{eurSym(x.income)}</td><td className="num">{eurSym(x.expense)}</td><td className="num"><b>{eurSym(x.profit)}</b></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
