# Velonify Buchhaltung – Plan

Ziel: Sevdesk ersetzen. Rechnungen, Kontakte, Belege, GuV-Abgleich und Steuer-Zahlen aus einem System,
Daten liegen in Google Drive.

## Prinzipien
- **Deterministisch:** Beträge, Nummern, Steuer werden berechnet, nie von einem LLM „geschrieben".
- **Unveränderlich (GoBD):** Versendete Rechnungen werden nie überschrieben, Korrektur = Storno + neue Rechnung.
- **Drive ist das Archiv:** `/Buchhaltung/<Jahr>/Ausgangsrechnungen/<Monat>/RE-<Jahr>-<Nr>.pdf`, Eingang analog.
- **Mensch bestätigt:** Mails landen als Gmail-Entwurf, nichts geht ohne Klick raus.
- **Steuerregime ist Konfiguration:** §19 bis 31.12.2026, ab 01.01.2027 Regelbesteuerung (`data/config.yaml`).

## Module & Reihenfolge
| # | Modul | Status |
|---|---|---|
| 1 | Kontakte (Import aus Sevdesk) | ✅ `contacts:import` |
| 2 | Verträge + Monatsrechnungen als PDF | ✅ Prototyp, Entwurf der Verträge prüfen |
| 3 | Ablage in Drive + Gmail-Entwurf je Kunde | offen (braucht Google-OAuth) |
| 4 | Einmalige Projekte (`einmalig.yaml`) + Teilrechnungen (1/2, 2/2) | offen |
| 5 | Rechnungsregister (gesendet / bezahlt / überfällig, Mahnung-Entwurf) | offen |
| 6 | Beleg-Eingang: Upload in Drive → Claude liest Datum/Lieferant/Netto/USt/Brutto/Kategorie | offen |
| 7 | GuV-Abgleich: Sheet ↔ Register ↔ Belege, Abweichungen als Liste | offen |
| 8 | Steuer: EÜR-Summen, UStVA-Kennzahlen, Rücklagen-Rechner, Export für ELSTER | offen |
| 9 | Dashboard (Web) | offen |
| 10 | E-Rechnung (ZUGFeRD/XRechnung) für Ausgang ab 2028, Eingang lesen | offen |

## Offene fachliche Punkte (mit Steuerberater klären)
- Umstellung 01.01.2027: Voranmeldungszeitraum, Soll- vs. Ist-Versteuerung (§20 UStG-Antrag), USt-IdNr.
- Abrechnung im Voraus oder Nachhinein → welche Rechnung am 01.01.2027 schon USt trägt.
- EU-Kunden: Reverse-Charge, USt-IdNr. des Kunden nötig.
- ELSTER hat keine freie Schnittstelle für Privatpersonen: das Tool liefert die Zahlen, du trägst sie ein.
