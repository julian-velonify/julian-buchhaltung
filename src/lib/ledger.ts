// Liest deine bestehende „Gewinn & Verlust Tabelle" (ein Blatt pro Jahr, Spalten A–J).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { googleConfigured, sheetsApi } from "./google/auth";
import { toIsoDate, toNumber } from "./format";
import type { LedgerRow } from "./types";

export const LEDGER_YEARS = [2024, 2025, 2026];

export function ledgerSource(): "sheet" | "local" | "none" {
  if (process.env.GUV_SHEET_ID && googleConfigured()) return "sheet";
  return existsSync(join(process.cwd(), "data", "db", "GuV-2026.json")) ? "local" : "none";
}

function parseRows(year: number, values: unknown[][]): LedgerRow[] {
  const out: LedgerRow[] = [];
  for (const r of values.slice(3)) {                // 3 Kopfzeilen
    const text = String(r[4] ?? "").trim();
    const income = toNumber(r[5]);
    const expense = toNumber(r[6]);
    if (!text && !income && !expense) continue;
    out.push({
      year, date: toIsoDate(r[0]), seq: toNumber(r[1]), month: toNumber(r[2]), text, income, expense,
      profit: toNumber(r[7]), file: String(r[8] ?? "").trim(), note: String(r[9] ?? "").trim(),
    });
  }
  return out;
}

export async function loadLedger(year: number): Promise<LedgerRow[]> {
  const src = ledgerSource();
  if (src === "sheet") {
    const res = await sheetsApi().spreadsheets.values.get({
      spreadsheetId: process.env.GUV_SHEET_ID!, range: `'${year}'!A1:J400`, valueRenderOption: "UNFORMATTED_VALUE",
    });
    return parseRows(year, (res.data.values ?? []) as unknown[][]);
  }
  if (src === "local") {
    const f = join(process.cwd(), "data", "db", `GuV-${year}.json`);
    return existsSync(f) ? (JSON.parse(readFileSync(f, "utf8")) as LedgerRow[]) : [];
  }
  return [];
}

export async function loadAllLedgers(): Promise<LedgerRow[]> {
  const parts = await Promise.all(LEDGER_YEARS.map((y) => loadLedger(y).catch(() => [])));
  return parts.flat();
}

export const parseLedgerRows = parseRows;
