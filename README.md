# Velonify Buchhaltung

Rechnungen, Kontakte, Verträge, Steuer-Übersicht und GuV-Abgleich als kleine Web-App.
Die **Datenbank ist ein Google Sheet**, PDFs landen in **Google Drive**, Rechnungsmails als **Gmail-Entwurf**.

> Dieses Repo enthält nur Code. Geschäftsdaten (Kunden, Preise, IBAN …) liegen im Google Sheet bzw. im
> ignorierten Ordner `data/` und gehören nie ins Repo.

## Schnellstart (lokal)

```bash
npm install
cp .env.example .env
npm run dev            # http://localhost:3000
```

Ohne Google-Verbindung läuft die App im **lokalen Modus** (`data/db/*.json`). Startdaten:
`data/config.yaml`, `data/contracts.yaml`, `data/contacts.json`, `data/history.json` anlegen und `npm run db:seed` ausführen.

## Google verbinden

1. **Google Cloud Console** → Projekt anlegen → APIs aktivieren: *Google Sheets API*, *Google Drive API*, *Gmail API*.
2. **OAuth-Zustimmungsbildschirm** (extern, Testmodus, dich als Testnutzer eintragen) → **Anmeldedaten → OAuth-Client-ID → Desktop-App**.
3. `GOOGLE_CLIENT_ID` und `GOOGLE_CLIENT_SECRET` in `.env` eintragen, dann:
   ```bash
   npm run google:auth    # Browser öffnet sich → zustimmen → GOOGLE_REFRESH_TOKEN in .env eintragen
   ```
4. `DB_SHEET_ID` (leere Tabelle „Datenbank"), `GUV_SHEET_ID` (bestehende GuV) und `DRIVE_ROOT_FOLDER_ID` (Ordner „Buchhaltung") eintragen.
   Das angemeldete Google-Konto muss auf alle drei Zugriff haben.
5. Einmalig die Tabellenblätter anlegen und befüllen:
   ```bash
   npm run db:push
   ```

Danach liest und schreibt die App im Sheet. Fehlende E-Mails o. Ä. kannst du direkt im Sheet **oder** in der App pflegen.

## Monatslauf (am 01.)

```bash
npm run billing:monthly -- --dry     # nur anzeigen
npm run billing:monthly              # PDFs → Drive, Gmail-Entwürfe, Register
```

Es wird **nichts versendet**: Du prüfst die Entwürfe in Gmail und sendest selbst.

## Aufbau

| Pfad | Inhalt |
|---|---|
| `src/lib/tabs.ts` | Spalten jedes Tabellenblatts (Überschrift ↔ Feld) |
| `src/lib/store/` | Speicher: Google Sheet oder lokale JSON-Dateien |
| `src/lib/billing.ts` | Monatsabrechnung, Nummernkreis, Steuerlogik |
| `src/lib/invoice/` | Rechnungs-HTML (Briefpapier) und PDF-Erzeugung |
| `src/lib/reconcile.ts` | Abgleich GuV ↔ Rechnungen ↔ Belege |
| `src/lib/tax.ts` | EÜR-Summen, UStVA, Kleinunternehmergrenze |
| `docs/PLAN.md` | Roadmap und offene fachliche Punkte |

## Mehrere Firmen

Die Einzelfirma (§19 → Regelbesteuerung ab 2027) und eine spätere **Velonify GmbH** sind getrennte Mandanten:
eigenes Sheet, eigener Drive-Ordner, eigene `.env`. Die GmbH braucht zusätzlich doppelte Buchführung/Bilanz
und ist ein eigenes Modul – nicht Teil der EÜR-Logik hier.
