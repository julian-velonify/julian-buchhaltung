import { googleConfigured } from "../google/auth";
import {
  CONTACTS, CONTRACTS, COUNTERS, INVOICES, INVOICE_LINES, LOG, ONEOFFS, RECEIPTS, SETTINGS, TAX_REGIMES, type TabDef,
} from "../tabs";
import type { Sender, TaxRegime } from "../types";
import { LocalTable } from "./local";
import { SheetTable } from "./sheets";
import type { Table } from "./table";

export type Db = ReturnType<typeof openDb>;

export function storageMode(): "sheet" | "local" {
  return process.env.DB_SHEET_ID && googleConfigured() ? "sheet" : "local";
}

function open<T>(def: TabDef<T>): Table<T> {
  return storageMode() === "sheet" ? new SheetTable(def, process.env.DB_SHEET_ID!) : new LocalTable(def);
}

export function openDb() {
  return {
    mode: storageMode(),
    contacts: open(CONTACTS),
    contracts: open(CONTRACTS),
    oneOffs: open(ONEOFFS),
    invoices: open(INVOICES),
    invoiceLines: open(INVOICE_LINES),
    receipts: open(RECEIPTS),
    log: open(LOG),
    settings: open(SETTINGS),
    taxRegimes: open(TAX_REGIMES),
    counters: open(COUNTERS),
  };
}

export async function loadSender(db: Db): Promise<Sender> {
  const s = Object.fromEntries((await db.settings.all()).map((x) => [x.key, x.value]));
  return {
    name: s.name ?? "", street: s.street ?? "", zip: s.zip ?? "", city: s.city ?? "", country: s.country ?? "Deutschland",
    phone: s.phone ?? "", email: s.email ?? "", taxNumber: s.taxNumber ?? "", vatId: s.vatId ?? "",
    bank: s.bank ?? "", iban: s.iban ?? "", bic: s.bic ?? "", contactPerson: s.contactPerson ?? s.name ?? "",
  };
}

export function regimeFor(regimes: TaxRegime[], isoDate: string): TaxRegime {
  const sorted = [...regimes].filter((r) => r.validFrom <= isoDate).sort((a, b) => b.validFrom.localeCompare(a.validFrom));
  return sorted[0] ?? { validFrom: "1970-01-01", type: "kleinunternehmer", vatRate: 0 };
}

export async function logAction(db: Db, action: string, details: string) {
  await db.log.append([{ timestamp: new Date().toISOString(), action, details }]);
}
