// Datenmodell. Jede Tabelle entspricht einem Tabellenblatt in der Google-Sheet-„Datenbank".

export type Contact = {
  id: string;               // Kunden-Nr.
  name: string;
  contactPerson: string;
  category: string;         // Kunde | Lieferant | …
  street: string;
  zip: string;
  city: string;
  country: string;
  email: string;
  vatId: string;
  paymentTermsDays: number;
  salutation: string;       // z. B. "Lieber Noa,"
  tone: "du" | "sie";
  active: boolean;
};

/** Eine Position eines wiederkehrenden Vertrags (monatlich). */
export type ContractLine = {
  id: string;
  customer: string;         // Kunden-Nr.
  description: string;
  details: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  validFrom: string;        // ISO, leer = immer
  validTo: string;          // ISO, leer = offen
  active: boolean;
};

/** Einmalige Leistung, wird im angegebenen Monat mit abgerechnet. */
export type OneOff = {
  id: string;
  customer: string;
  description: string;
  details: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  billingMonth: string;     // YYYY-MM
  status: "offen" | "abgerechnet";
};

export type InvoiceStatus = "Entwurf" | "Versendet" | "Bezahlt" | "Storniert";

export type Invoice = {
  number: string;           // RE-2026-1071
  customer: string;
  date: string;             // Rechnungsdatum ISO
  serviceDate: string;      // Leistungs-/Lieferdatum ISO
  period: string;           // YYYY-MM (Abrechnungsmonat) oder leer
  dueDate: string;
  net: number;
  vat: number;
  gross: number;
  status: InvoiceStatus;
  paidOn: string;
  kind: "Monat" | "Einmalig";
  pdfFileId: string;
  pdfUrl: string;
  draftId: string;          // Gmail-Entwurf
  createdAt: string;
};

export type InvoiceLine = {
  invoice: string;
  pos: number;
  description: string;
  details: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
};

export type Receipt = {
  id: string;
  date: string;
  vendor: string;
  description: string;
  gross: number;
  net: number;
  vat: number;
  category: string;
  driveUrl: string;
  paidPrivately: boolean;
  ledgerRef: string;
};

export type LogEntry = { timestamp: string; action: string; details: string };
export type Setting = { key: string; value: string };
export type TaxRegime = { validFrom: string; type: "kleinunternehmer" | "regelbesteuert"; vatRate: number };
export type Counter = { year: number; last: number };

/** Zeile aus der bestehenden GuV-Tabelle (Blatt pro Jahr). */
export type LedgerRow = {
  year: number;
  date: string;
  seq: number;
  month: number;
  text: string;
  income: number;
  expense: number;
  profit: number;
  file: string;
  note: string;
};

export type Sender = {
  name: string; street: string; zip: string; city: string; country: string;
  phone: string; email: string; taxNumber: string; vatId: string;
  bank: string; iban: string; bic: string; contactPerson: string;
};
