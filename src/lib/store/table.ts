import type { Col, TabDef } from "../tabs";
import { toBool, toIsoDate, toNumber } from "../format";

/** Gemeinsame Schnittstelle für alle Tabellen – egal ob Google Sheet oder lokale JSON-Datei. */
export interface Table<T> {
  def: TabDef<T>;
  all(): Promise<T[]>;
  append(rows: T[]): Promise<void>;
  /** Zeile mit gleichem Schlüssel ersetzen, sonst anhängen. */
  upsert(row: T): Promise<void>;
  /** Alle Zeilen ersetzen (nur für Seeding). */
  replaceAll(rows: T[]): Promise<void>;
}

export function parseCell<T>(col: Col<T>, raw: unknown): unknown {
  switch (col.type) {
    case "number": return toNumber(raw);
    case "boolean": return toBool(raw);
    case "date": return toIsoDate(raw);
    default: return raw === null || raw === undefined ? "" : String(raw).trim();
  }
}

export function rowToObject<T>(def: TabDef<T>, header: string[], values: unknown[]): T | null {
  const obj: Record<string, unknown> = {};
  for (const col of def.cols) {
    const i = header.findIndex((h) => h.trim() === col.header);
    obj[col.key] = parseCell(col, i >= 0 ? values[i] : "");
  }
  const key = obj[def.key];
  if (key === "" || key === 0 || key === undefined) return null; // leere Zeile
  return obj as T;
}

export function objectToRow<T>(def: TabDef<T>, header: string[], obj: T): (string | number | boolean)[] {
  return header.map((h) => {
    const col = def.cols.find((c) => c.header === h.trim());
    if (!col) return "";
    const v = (obj as Record<string, unknown>)[col.key];
    return v === undefined || v === null ? "" : (v as string | number | boolean);
  });
}
