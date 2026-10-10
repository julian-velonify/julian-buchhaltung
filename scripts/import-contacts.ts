// Importiert den Sevdesk-Kontaktexport (CSV, ;-getrennt) nach data/contacts.json.
// Bewusst NICHT übernommen: IBAN/BIC der Kontakte (privat, werden nicht gebraucht).
import { readFileSync, writeFileSync } from "node:fs";

const src = process.argv[2];
if (!src) {
  console.error("Usage: npm run contacts:import -- <pfad/zur/Contacts from Sevdesk.csv>");
  process.exit(1);
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ";") { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cur); cur = "";
      if (row.some((v) => v !== "")) rows.push(row);
      row = [];
    } else cur += c;
  }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

const raw = readFileSync(src, "utf8").replace(/^﻿/, "");
const [header, ...rows] = parseCsv(raw);
const idx = (name: string) => header.findIndex((h) => h.trim() === name);
const col = (r: string[], name: string) => (r[idx(name)] ?? "").trim();

const contacts = rows
  .filter((r) => col(r, "Kunden-Nr."))
  .map((r) => {
    const person = [col(r, "Vorname"), col(r, "Nachname")].filter(Boolean).join(" ");
    return {
      id: col(r, "Kunden-Nr."),
      name: col(r, "Organisation") || person,
      contactPerson: col(r, "Namenszusatz") || undefined,
      category: col(r, "Kategorie") || undefined,
      street: col(r, "Strasse").replace(/,$/, "") || undefined,
      zip: col(r, "PLZ") || undefined,
      city: col(r, "Ort") || undefined,
      country: col(r, "Land") || undefined,
      email: col(r, "E-Mail") || undefined,
      vatId: col(r, "UmSt.-ID") || undefined,
      paymentTermsDays: Number(col(r, "Zahlungsziel Tage")) || undefined,
    };
  })
  .sort((a, b) => Number(a.id) - Number(b.id));

writeFileSync("data/contacts.json", JSON.stringify(contacts, null, 2) + "\n");
console.log(`${contacts.length} Kontakte → data/contacts.json`);
