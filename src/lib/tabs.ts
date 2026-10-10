// Spalten-Definition jedes Tabellenblatts. Die Überschrift (header) ist das, was du im Sheet siehst;
// key ist das Feld im Code. Reihenfolge der Spalten im Sheet ist egal, es wird über die Überschrift gemappt.
import type { Contact, ContractLine, Counter, Invoice, InvoiceLine, LogEntry, OneOff, Receipt, Setting, TaxRegime } from "./types";

export type ColType = "string" | "number" | "boolean" | "date";
export type Col<T> = { key: keyof T & string; header: string; type: ColType };
export type TabDef<T> = { name: string; key: keyof T & string; cols: Col<T>[] };

const c = <T>(key: keyof T & string, header: string, type: ColType = "string"): Col<T> => ({ key, header, type });

export const CONTACTS: TabDef<Contact> = {
  name: "Kontakte", key: "id",
  cols: [
    c("id", "Kunden-Nr."), c("name", "Name"), c("contactPerson", "Ansprechpartner"), c("category", "Kategorie"),
    c("street", "Straße"), c("zip", "PLZ"), c("city", "Ort"), c("country", "Land"),
    c("email", "E-Mail"), c("vatId", "USt-IdNr."), c("paymentTermsDays", "Zahlungsziel (Tage)", "number"),
    c("salutation", "Anrede"), c("tone", "Ansprache (du/sie)"), c("active", "Aktiv", "boolean"),
  ],
};

export const CONTRACTS: TabDef<ContractLine> = {
  name: "Verträge", key: "id",
  cols: [
    c("id", "ID"), c("customer", "Kunden-Nr."), c("description", "Beschreibung"), c("details", "Details"),
    c("quantity", "Menge", "number"), c("unit", "Einheit"), c("unitPrice", "Einzelpreis", "number"),
    c("validFrom", "Gültig ab", "date"), c("validTo", "Gültig bis", "date"), c("active", "Aktiv", "boolean"),
  ],
};

export const ONEOFFS: TabDef<OneOff> = {
  name: "Einmalig", key: "id",
  cols: [
    c("id", "ID"), c("customer", "Kunden-Nr."), c("description", "Beschreibung"), c("details", "Details"),
    c("quantity", "Menge", "number"), c("unit", "Einheit"), c("unitPrice", "Einzelpreis", "number"),
    c("billingMonth", "Abrechnungsmonat (YYYY-MM)"), c("status", "Status"),
  ],
};

export const INVOICES: TabDef<Invoice> = {
  name: "Rechnungen", key: "number",
  cols: [
    c("number", "Rechnungs-Nr."), c("customer", "Kunden-Nr."), c("date", "Rechnungsdatum", "date"),
    c("serviceDate", "Leistungsdatum", "date"), c("period", "Abrechnungsmonat"), c("dueDate", "Fällig am", "date"),
    c("net", "Netto", "number"), c("vat", "USt", "number"), c("gross", "Brutto", "number"),
    c("status", "Status"), c("paidOn", "Bezahlt am", "date"), c("kind", "Art"),
    c("pdfFileId", "Drive-Datei-ID"), c("pdfUrl", "Drive-Link"), c("draftId", "Gmail-Entwurf-ID"), c("createdAt", "Erstellt am"),
  ],
};

export const INVOICE_LINES: TabDef<InvoiceLine> = {
  name: "Positionen", key: "invoice",
  cols: [
    c("invoice", "Rechnungs-Nr."), c("pos", "Pos", "number"), c("description", "Beschreibung"), c("details", "Details"),
    c("quantity", "Menge", "number"), c("unit", "Einheit"), c("unitPrice", "Einzelpreis", "number"), c("total", "Gesamt", "number"),
  ],
};

export const RECEIPTS: TabDef<Receipt> = {
  name: "Belege", key: "id",
  cols: [
    c("id", "ID"), c("date", "Belegdatum", "date"), c("vendor", "Lieferant"), c("description", "Beschreibung"),
    c("gross", "Brutto", "number"), c("net", "Netto", "number"), c("vat", "USt", "number"), c("category", "Kategorie"),
    c("driveUrl", "Drive-Link"), c("paidPrivately", "Privat bezahlt", "boolean"), c("ledgerRef", "GuV-Zeile"),
  ],
};

export const LOG: TabDef<LogEntry> = {
  name: "Verlauf", key: "timestamp",
  cols: [c("timestamp", "Zeitpunkt"), c("action", "Aktion"), c("details", "Details")],
};

export const SETTINGS: TabDef<Setting> = {
  name: "Einstellungen", key: "key",
  cols: [c("key", "Schlüssel"), c("value", "Wert")],
};

export const TAX_REGIMES: TabDef<TaxRegime> = {
  name: "Steuerregime", key: "validFrom",
  cols: [c("validFrom", "Gültig ab", "date"), c("type", "Art (kleinunternehmer/regelbesteuert)"), c("vatRate", "USt-Satz", "number")],
};

export const COUNTERS: TabDef<Counter> = {
  name: "Nummernkreis", key: "year",
  cols: [c("year", "Jahr", "number"), c("last", "Letzte Rechnungsnummer", "number")],
};

export const ALL_TABS = [CONTACTS, CONTRACTS, ONEOFFS, INVOICES, INVOICE_LINES, RECEIPTS, LOG, SETTINGS, TAX_REGIMES, COUNTERS] as const;
