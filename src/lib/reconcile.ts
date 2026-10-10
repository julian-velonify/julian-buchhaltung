// Abgleich: deine GuV  ↔  Rechnungsregister (dieses Tool)  ↔  Belege.
import { round2 } from "./format";
import type { Invoice, LedgerRow, Receipt } from "./types";

export type Severity = "fehler" | "warnung" | "info";
export type Finding = { severity: Severity; code: string; title: string; detail: string; ref?: string };

/** "Invoice RE-2026-1037.pdf" | "RE 2026 1034.pdf" | "RE2025-1035.pdf" → "RE-2026-1037" */
export function invoiceNumberFromFile(name: string): string | null {
  const m = /RE[\s_-]*(\d{4})[\s_-]*(\d{4})/i.exec(name);
  return m ? `RE-${m[1]}-${m[2]}` : null;
}

export function reconcile(opts: { year: number; ledger: LedgerRow[]; invoices: Invoice[]; receipts: Receipt[] }): Finding[] {
  const { year, ledger, invoices, receipts } = opts;
  const rows = ledger.filter((r) => r.year === year);
  const out: Finding[] = [];
  const byNumber = new Map<string, LedgerRow[]>();
  for (const r of rows) {
    const n = invoiceNumberFromFile(r.file);
    if (n) byNumber.set(n, [...(byNumber.get(n) ?? []), r]);
  }

  // 1) Rechnungsregister → GuV
  for (const inv of invoices.filter((i) => i.date.startsWith(String(year)) && i.status !== "Storniert")) {
    const hits = byNumber.get(inv.number) ?? [];
    if (!hits.length) {
      out.push({
        severity: inv.status === "Bezahlt" ? "fehler" : "info", code: "RE_NICHT_IN_GUV", ref: inv.number,
        title: `${inv.number} nicht in der GuV`,
        detail: inv.status === "Bezahlt"
          ? `Als bezahlt markiert (${inv.gross.toFixed(2)} €), aber keine GuV-Zeile mit dieser Rechnung.`
          : `Noch nicht eingetragen – ok, solange die Zahlung nicht eingegangen ist (${inv.gross.toFixed(2)} €).`,
      });
      continue;
    }
    const sum = round2(hits.reduce((a, r) => a + r.income, 0));
    if (Math.abs(sum - inv.gross) > 0.009) {
      out.push({
        severity: "fehler", code: "BETRAG_ABWEICHEND", ref: inv.number,
        title: `${inv.number}: Betrag weicht ab`,
        detail: `Rechnung ${inv.gross.toFixed(2)} € · GuV ${sum.toFixed(2)} €.`,
      });
    }
  }

  // 2) GuV → Rechnungsregister
  const known = new Set(invoices.map((i) => i.number));
  for (const [n, rs] of byNumber) {
    if (!known.has(n) && rs.some((r) => r.income > 0)) {
      out.push({
        severity: "info", code: "GUV_OHNE_REGISTER", ref: n,
        title: `${n} steht in der GuV, nicht im Register`,
        detail: "Vermutlich eine Rechnung aus Sevdesk-Zeiten – ggf. nachtragen.",
      });
    }
    if (rs.length > 1 && rs.every((r) => r.income > 0)) {
      out.push({ severity: "warnung", code: "DOPPELT", ref: n, title: `${n} mehrfach in der GuV`, detail: `${rs.length} Zeilen mit derselben Rechnung.` });
    }
  }

  // 3) Plausibilität einzelner GuV-Zeilen
  for (const r of rows) {
    if (r.date && !r.date.startsWith(String(year))) {
      out.push({
        severity: "warnung", code: "DATUM_JAHR", ref: `#${r.seq}`,
        title: `Zeile ${r.seq} „${r.text}": Datum liegt im Jahr ${r.date.slice(0, 4)}`,
        detail: `Im Blatt ${year} steht ${r.date.split("-").reverse().join(".")} – vermutlich Tippfehler.`,
      });
    }
    if (r.income > 0 && !r.file) {
      out.push({ severity: "warnung", code: "EINNAHME_OHNE_RE", ref: `#${r.seq}`, title: `Zeile ${r.seq} „${r.text}": Einnahme ohne Rechnungsdatei`, detail: `${r.income.toFixed(2)} €` });
    }
    if (r.note && /nicht bezahlt/i.test(r.note) && r.income === 0) {
      out.push({ severity: "info", code: "NICHT_BEZAHLT", ref: `#${r.seq}`, title: `Zeile ${r.seq} „${r.text}": als nicht bezahlt vermerkt`, detail: r.file });
    }
  }

  // 4) Belege → GuV-Ausgaben (Betrag + Monat)
  for (const b of receipts.filter((x) => x.date.startsWith(String(year)))) {
    const month = Number(b.date.slice(5, 7));
    const hit = rows.some((r) => r.expense > 0 && Math.abs(r.expense - b.gross) < 0.01 && (r.month === month || Math.abs(r.month - month) <= 1));
    if (!hit) {
      out.push({
        severity: "warnung", code: "BELEG_NICHT_IN_GUV", ref: b.id,
        title: `Beleg „${b.vendor}" ${b.gross.toFixed(2)} € nicht in der GuV`,
        detail: `Belegdatum ${b.date.split("-").reverse().join(".")} – keine passende Ausgabe gefunden.`,
      });
    }
  }

  const rank: Record<Severity, number> = { fehler: 0, warnung: 1, info: 2 };
  return out.sort((a, b) => rank[a.severity] - rank[b.severity]);
}
