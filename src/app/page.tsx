import Link from "next/link";
import { eurSym, isoDate, MONTHS, round2 } from "@/lib/format";
import { ledgerSource, loadLedger } from "@/lib/ledger";
import { openDb } from "@/lib/store";
import { kleinunternehmerStatus, monthly, totals } from "@/lib/tax";
import { BarChart, effectiveStatus } from "./ui";

export const dynamic = "force-dynamic";

export default async function Overview() {
  const db = openDb();
  const year = new Date().getFullYear();
  const today = isoDate(new Date());
  const [invoices, contacts, log, ledger, prevLedger] = await Promise.all([
    db.invoices.all(), db.contacts.all(), db.log.all(), loadLedger(year).catch(() => []), loadLedger(year - 1).catch(() => []),
  ]);
  const src = ledgerSource();
  const paidNumbers = new Set(ledger.filter((r) => r.income > 0).map((r) => /RE[\s_-]*(\d{4})[\s_-]*(\d{4})/i.exec(r.file)).filter(Boolean).map((m) => `RE-${m![1]}-${m![2]}`));

  // Einnahmen/Ausgaben: GuV, sonst fakturierte Beträge aus dem Register
  const fromLedger = ledger.length > 0;
  const m = fromLedger
    ? monthly(ledger)
    : Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        income: round2(invoices.filter((x) => x.date.startsWith(String(year)) && Number(x.date.slice(5, 7)) === i + 1 && x.status !== "Storniert").reduce((a, x) => a + x.gross, 0)),
        expense: 0, profit: 0,
      }));
  const t = fromLedger ? totals(ledger) : { income: round2(m.reduce((a, x) => a + x.income, 0)), expense: 0, profit: 0 };
  if (!fromLedger) t.profit = t.income;

  const rows = invoices
    .filter((i) => i.date.startsWith(String(year)))
    .map((i) => ({ i, st: effectiveStatus(i, paidNumbers.has(i.number), today) }));
  const due = rows.filter((r) => r.st === "Fällig");
  const open = rows.filter((r) => r.st === "Offen");
  const sum = (a: typeof rows) => round2(a.reduce((x, r) => x + r.i.gross, 0));

  const prevIncome = totals(prevLedger).income;
  const ku = kleinunternehmerStatus(t.income, prevIncome);

  const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - 3);
  const byCust = new Map<string, number>();
  for (const i of invoices.filter((x) => x.date >= isoDate(cutoff) && x.status !== "Storniert")) byCust.set(i.customer, (byCust.get(i.customer) ?? 0) + i.gross);
  const top = [...byCust.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topMax = Math.max(1, ...top.map((x) => x[1]));

  return (
    <>
      <div className="head">
        <div><h1>Übersicht</h1><div className="sub">{year} · {db.mode === "sheet" ? "live aus deinem Google Sheet" : "lokale Daten"}</div></div>
        <form action="/rechnungen"><button className="btn primary">Rechnungen erzeugen</button></form>
      </div>

      {src === "none" && (
        <div className="note warn">
          Die GuV-Tabelle ist noch nicht verbunden. Die Zahlen unten zeigen deshalb <b>fakturierte Rechnungen</b>, nicht eingegangene Zahlungen.
          Verbinde Google (README, Schritt 2), dann liest die App Einnahmen und Ausgaben direkt aus deiner GuV.
        </div>
      )}

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="grid" style={{ gridTemplateColumns: "1fr auto auto", alignItems: "start" }}>
          <div>
            <div className="sub">{fromLedger ? "Gewinn vor Steuern" : "Fakturiert (Rechnungsregister)"}</div>
            <div className="big">{eurSym(t.profit)}</div>
          </div>
          <div className="stat"><div className="k">Einnahmen</div><div className="v">{eurSym(t.income)}</div></div>
          <div className="stat"><div className="k">Ausgaben</div><div className="v">{eurSym(t.expense)}</div></div>
        </div>
        <BarChart data={m} labels={MONTHS.map((x) => x.slice(0, 3))} />
      </div>

      <div className="grid g2" style={{ marginBottom: 18 }}>
        <div className="card">
          <h2>Ausstehende Rechnungen</h2>
          <div className="stat" style={{ marginBottom: 6 }}><div className="k">Ausstehender Betrag</div><div className="v">{eurSym(sum(due) + sum(open))}</div></div>
          <Link href="/rechnungen?f=faellig" className="rowline"><span><span className="pill bad">{due.length}</span>&nbsp; Fällig</span><b className="num">{eurSym(sum(due))}</b></Link>
          <Link href="/rechnungen?f=offen" className="rowline"><span><span className="pill warn">{open.length}</span>&nbsp; Offen</span><b className="num">{eurSym(sum(open))}</b></Link>
          <div className="sub" style={{ marginTop: 10, fontSize: 13 }}>
            {src === "none" ? "Ohne GuV-Verbindung gilt eine Rechnung erst nach „Als bezahlt markieren“ als bezahlt." : "Eine Rechnung gilt als bezahlt, sobald sie in der GuV als Einnahme steht."}
          </div>
        </div>

        <div className="card">
          <h2>Kleinunternehmergrenze</h2>
          <div className="stat"><div className="k">Umsatz {year}{fromLedger ? " (vereinnahmt)" : " (fakturiert)"}</div><div className="v">{eurSym(ku.incomeThisYear)}</div></div>
          <div className="meter"><div style={{ width: `${Math.min(100, (ku.incomeThisYear / ku.limitCur) * 100)}%` }} /></div>
          <div className="sub" style={{ fontSize: 13, display: "flex", justifyContent: "space-between" }}><span>0 €</span><span>{eurSym(ku.limitCur)} (laufendes Jahr)</span></div>
          {ku.nextYearRegular ? (
            <div className="note warn" style={{ marginTop: 14, marginBottom: 0 }}>
              Über {eurSym(ku.limitPrev)} im Jahr {year}: ab 01.01.{year + 1} <b>Regelbesteuerung</b> mit 19&nbsp;% USt. Bitte mit dem Steuerberater bestätigen.
            </div>
          ) : <div className="sub" style={{ marginTop: 14 }}>Unter {eurSym(ku.limitPrev)} – Kleinunternehmerregelung bleibt.</div>}
        </div>
      </div>

      <div className="grid g2">
        <div className="card">
          <h2>Top 5 Kunden · letzte 3 Monate</h2>
          {top.length === 0 && <div className="empty">Noch keine Rechnungen.</div>}
          {top.map(([id, v]) => (
            <div key={id} style={{ marginBottom: 12 }}>
              <div className="rowline" style={{ border: 0, padding: "0 0 4px" }}><span>{contacts.find((c) => c.id === id)?.name ?? id}</span><b className="num">{eurSym(v)}</b></div>
              <div className="meter" style={{ margin: 0, height: 8 }}><div style={{ width: `${(v / topMax) * 100}%` }} /></div>
            </div>
          ))}
        </div>
        <div className="card">
          <h2>Verlauf</h2>
          {log.length === 0 && <div className="empty">Noch keine Aktivität.</div>}
          {[...log].reverse().slice(0, 8).map((l) => (
            <div className="rowline" key={l.timestamp + l.details}>
              <span><b>{l.action}</b><div className="sub" style={{ fontSize: 13 }}>{l.details}</div></span>
              <span className="sub" style={{ fontSize: 12.5 }}>{l.timestamp.slice(0, 16).replace("T", " ")}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
