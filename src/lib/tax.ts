import { round2 } from "./format";
import type { Invoice, LedgerRow, Receipt, TaxRegime } from "./types";

export type MonthlyTotals = { month: number; income: number; expense: number; profit: number };

export function monthly(rows: LedgerRow[]): MonthlyTotals[] {
  return Array.from({ length: 12 }, (_, i) => {
    const m = rows.filter((r) => r.month === i + 1);
    const income = round2(m.reduce((a, r) => a + r.income, 0));
    const expense = round2(m.reduce((a, r) => a + r.expense, 0));
    return { month: i + 1, income, expense, profit: round2(income - expense) };
  });
}

export const totals = (rows: LedgerRow[]) => {
  const income = round2(rows.reduce((a, r) => a + r.income, 0));
  const expense = round2(rows.reduce((a, r) => a + r.expense, 0));
  return { income, expense, profit: round2(income - expense) };
};

/** §19 UStG: Vorjahr ≤ 25.000 € und laufendes Jahr voraussichtlich ≤ 100.000 €. */
export function kleinunternehmerStatus(incomeThisYear: number, incomeLastYear: number) {
  const LIMIT_PREV = 25_000, LIMIT_CUR = 100_000;
  return {
    incomeThisYear, incomeLastYear, limitPrev: LIMIT_PREV, limitCur: LIMIT_CUR,
    nextYearRegular: incomeThisYear > LIMIT_PREV,         // ab Folgejahr Regelbesteuerung
    thisYearExceeded: incomeThisYear > LIMIT_CUR,         // Regelbesteuerung schon im laufenden Jahr
    shareOfCurLimit: Math.min(1, incomeThisYear / LIMIT_CUR),
  };
}

export type UStVAQuarter = {
  quarter: number; label: string;
  taxableNet19: number; outputVat: number; inputVat: number; payable: number; applicable: boolean;
};

/** UStVA je Quartal. Soll-Versteuerung: nach Rechnungsdatum; Ist: nach Zahlungsdatum. */
export function ustva(opts: {
  year: number; invoices: Invoice[]; receipts: Receipt[]; regimes: TaxRegime[]; method: "Soll" | "Ist";
}): UStVAQuarter[] {
  const { year, invoices, receipts, regimes, method } = opts;
  const regular = (d: string) =>
    [...regimes].filter((r) => r.validFrom <= d).sort((a, b) => b.validFrom.localeCompare(a.validFrom))[0]?.type === "regelbesteuert";
  return [1, 2, 3, 4].map((q) => {
    const inQ = (d: string) => d.startsWith(String(year)) && Math.ceil(Number(d.slice(5, 7)) / 3) === q;
    const out = invoices.filter((i) => i.status !== "Storniert" && i.status !== "Entwurf" && regular(i.serviceDate || i.date)
      && inQ(method === "Soll" ? i.date : i.paidOn || ""));
    const taxableNet19 = round2(out.reduce((a, i) => a + i.net, 0));
    const outputVat = round2(out.reduce((a, i) => a + i.vat, 0));
    const inputVat = round2(receipts.filter((r) => inQ(r.date) && regular(r.date)).reduce((a, r) => a + r.vat, 0));
    return {
      quarter: q, label: `Q${q} ${year}`, taxableNet19, outputVat, inputVat,
      payable: round2(outputVat - inputVat), applicable: regular(`${year}-${String(q * 3).padStart(2, "0")}-01`),
    };
  });
}
