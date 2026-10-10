// Lokaler Modus: jede Tabelle ist eine JSON-Datei in data/db/. Nur für Entwicklung/Demo.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { TabDef } from "../tabs";
import type { Table } from "./table";

export const LOCAL_DIR = join(process.cwd(), "data", "db");

export class LocalTable<T> implements Table<T> {
  constructor(public def: TabDef<T>) {}
  private get file() { return join(LOCAL_DIR, `${this.def.name}.json`); }

  async all(): Promise<T[]> {
    return existsSync(this.file) ? (JSON.parse(readFileSync(this.file, "utf8")) as T[]) : [];
  }
  private write(rows: T[]) {
    mkdirSync(LOCAL_DIR, { recursive: true });
    writeFileSync(this.file, JSON.stringify(rows, null, 2) + "\n");
  }
  async append(rows: T[]) { this.write([...(await this.all()), ...rows]); }
  async upsert(row: T) {
    const rows = await this.all();
    const key = this.def.key;
    const i = rows.findIndex((r) => String((r as Record<string, unknown>)[key]) === String((row as Record<string, unknown>)[key]));
    if (i >= 0) rows[i] = row; else rows.push(row);
    this.write(rows);
  }
  async replaceAll(rows: T[]) { this.write(rows); }
}
