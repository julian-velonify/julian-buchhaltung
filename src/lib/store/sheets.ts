// Google-Sheet-Modus: jede Tabelle ist ein Tabellenblatt in der „Datenbank"-Tabelle.
import type { sheets_v4 } from "googleapis";
import { sheetsApi } from "../google/auth";
import type { TabDef } from "../tabs";
import { objectToRow, rowToObject, type Table } from "./table";

const colLetter = (n: number) => {
  let s = "";
  for (n += 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};

export class SheetTable<T> implements Table<T> {
  private api: sheets_v4.Sheets;
  constructor(public def: TabDef<T>, private sheetId: string) {
    this.api = sheetsApi();
  }

  private async readRaw(): Promise<unknown[][]> {
    const res = await this.api.spreadsheets.values.get({
      spreadsheetId: this.sheetId,
      range: `'${this.def.name}'`,
      valueRenderOption: "UNFORMATTED_VALUE",
    });
    return (res.data.values ?? []) as unknown[][];
  }

  async all(): Promise<T[]> {
    const [header, ...rows] = await this.readRaw();
    if (!header) return [];
    const h = header.map(String);
    return rows.map((r) => rowToObject(this.def, h, r)).filter((x): x is T => x !== null);
  }

  private async header(): Promise<string[]> {
    const res = await this.api.spreadsheets.values.get({ spreadsheetId: this.sheetId, range: `'${this.def.name}'!1:1` });
    const h = (res.data.values?.[0] ?? []).map(String);
    return h.length ? h : this.def.cols.map((c) => c.header);
  }

  async append(rows: T[]): Promise<void> {
    if (!rows.length) return;
    const h = await this.header();
    await this.api.spreadsheets.values.append({
      spreadsheetId: this.sheetId,
      range: `'${this.def.name}'!A1`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: rows.map((r) => objectToRow(this.def, h, r)) },
    });
  }

  async upsert(row: T): Promise<void> {
    const raw = await this.readRaw();
    const h = (raw[0] ?? this.def.cols.map((c) => c.header)).map(String);
    const keyIdx = h.findIndex((x) => x === this.def.cols.find((c) => c.key === this.def.key)!.header);
    const keyVal = String((row as Record<string, unknown>)[this.def.key]);
    const rowIdx = raw.findIndex((r, i) => i > 0 && String(r[keyIdx]) === keyVal);
    if (rowIdx < 0) return this.append([row]);
    const values = objectToRow(this.def, h, row);
    await this.api.spreadsheets.values.update({
      spreadsheetId: this.sheetId,
      range: `'${this.def.name}'!A${rowIdx + 1}:${colLetter(h.length - 1)}${rowIdx + 1}`,
      valueInputOption: "RAW",
      requestBody: { values: [values] },
    });
  }

  async replaceAll(rows: T[]): Promise<void> {
    const h = this.def.cols.map((c) => c.header);
    await this.api.spreadsheets.values.clear({ spreadsheetId: this.sheetId, range: `'${this.def.name}'` });
    await this.api.spreadsheets.values.update({
      spreadsheetId: this.sheetId,
      range: `'${this.def.name}'!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [h, ...rows.map((r) => objectToRow(this.def, h, r))] },
    });
  }
}

/** Legt fehlende Tabellenblätter mit Kopfzeile an. */
export async function ensureTabs(sheetId: string, defs: readonly TabDef<never>[]) {
  const api = sheetsApi();
  const meta = await api.spreadsheets.get({ spreadsheetId: sheetId });
  const existing = new Map((meta.data.sheets ?? []).map((s) => [s.properties?.title, s.properties?.sheetId]));
  const add = defs.filter((d) => !existing.has(d.name));
  if (add.length) {
    await api.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: { requests: add.map((d) => ({ addSheet: { properties: { title: d.name, gridProperties: { frozenRowCount: 1 } } } })) },
    });
  }
  for (const d of defs) {
    const res = await api.spreadsheets.values.get({ spreadsheetId: sheetId, range: `'${d.name}'!1:1` });
    if (!res.data.values?.length) {
      await api.spreadsheets.values.update({
        spreadsheetId: sheetId, range: `'${d.name}'!A1`, valueInputOption: "RAW",
        requestBody: { values: [d.cols.map((c) => c.header)] },
      });
    }
  }
  // Standard-Blatt „Sheet1"/„Tabellenblatt1" entfernen, falls leer
  const stale = (meta.data.sheets ?? []).find((s) => /^(Sheet1|Tabellenblatt1)$/.test(s.properties?.title ?? ""));
  if (stale?.properties?.sheetId !== undefined && stale.properties.sheetId !== null && (meta.data.sheets?.length ?? 0) + add.length > 1) {
    await api.spreadsheets.batchUpdate({
      spreadsheetId: sheetId, requestBody: { requests: [{ deleteSheet: { sheetId: stale.properties.sheetId } }] },
    }).catch(() => undefined);
  }
}
