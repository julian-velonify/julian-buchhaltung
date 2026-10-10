import { readFileSync } from "node:fs";
import { join } from "node:path";
import { dmy, eur, num } from "../format";
import type { Contact, Invoice, InvoiceLine, Sender, TaxRegime } from "../types";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

let cssCache: string | undefined;
let logoCache: string | undefined;
const css = () => (cssCache ??= readFileSync(join(process.cwd(), "src/lib/invoice/invoice.css"), "utf8"));
const logo = () => (logoCache ??= readFileSync(join(process.cwd(), "assets/logo.png")).toString("base64"));

export function renderInvoiceHtml(p: {
  invoice: Invoice; lines: InvoiceLine[]; contact: Contact; sender: Sender; regime: TaxRegime;
}): string {
  const { invoice: inv, lines, contact, sender: s, regime } = p;
  const du = contact.tone === "du";

  const rows = lines.map((l) => `
    <tr>
      <td class="desc">${l.pos}. ${esc(l.description)}${l.details ? `<div class="sub">${esc(l.details)}</div>` : ""}</td>
      <td class="r">${num(l.quantity)} ${esc(l.unit)}</td>
      <td class="r">${eur(l.unitPrice)}</td>
      <td class="r">${eur(l.total)}</td>
    </tr>`).join("");

  const taxRows = regime.type === "kleinunternehmer"
    ? `<tr><td>Gesamtbetrag netto</td><td class="r">${eur(inv.net)}</td></tr>
       <tr><td colspan="2" class="note">Umsatzsteuer nicht erhoben gemäß §19 UStG.</td></tr>
       <tr class="total"><td>Gesamtbetrag brutto</td><td class="r">${eur(inv.gross)}</td></tr>`
    : `<tr><td>Gesamtbetrag netto</td><td class="r">${eur(inv.net)}</td></tr>
       <tr><td>Umsatzsteuer ${Math.round(regime.vatRate * 100)} %</td><td class="r">${eur(inv.vat)}</td></tr>
       <tr class="total"><td>Gesamtbetrag brutto</td><td class="r">${eur(inv.gross)}</td></tr>`;

  const intro = du
    ? "vielen Dank für deinen Auftrag und das damit verbundene Vertrauen! Hiermit stelle ich dir die folgenden Leistungen in Rechnung:"
    : "vielen Dank für Ihren Auftrag und das damit verbundene Vertrauen! Hiermit stelle ich Ihnen die folgenden Leistungen in Rechnung:";

  const addr = [contact.name, contact.contactPerson, contact.street, `${contact.zip} ${contact.city}`.trim(), contact.country]
    .filter(Boolean).map(esc).join("<br>");

  const taxId = s.vatId ? `USt-IdNr. ${esc(s.vatId)}<br>` : "";

  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${esc(inv.number)}</title><style>${css()}</style></head><body>
<div class="page">
  <div class="bar"></div><div class="stripe"></div>
  <div class="logo"><img src="data:image/png;base64,${logo()}"></div>
  <div class="vline"></div>

  <div class="sender-line">${esc(s.name)} → ${esc(s.street)} → ${esc(s.zip)} ${esc(s.city)}</div>
  <div class="address">${addr}</div>
  <dl class="meta">
    <dt>Rechnungs-Nr.</dt><dd>${esc(inv.number)}</dd>
    <dt>Rechnungsdatum</dt><dd>${dmy(inv.date)}</dd>
    <dt>Lieferdatum</dt><dd>${dmy(inv.serviceDate)}</dd>
    <dt>Ihre Kundennummer</dt><dd>${esc(contact.id)}</dd>
    <dt>Ihr Ansprechpartner</dt><dd>${esc(s.contactPerson)}</dd>
  </dl>

  <div class="body">
    <h1>Rechnung Nr. ${esc(inv.number)} <span>${dmy(inv.date)}</span></h1>
    <p>${esc(contact.salutation || (du ? "Hallo," : "Sehr geehrte Damen und Herren,"))}</p>
    <p>${intro}</p>
    <table class="items">
      <thead><tr><th>Beschreibung</th><th class="r">Menge</th><th class="r">Einzelpreis</th><th class="r">Gesamtpreis</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <table class="sum">${taxRows}</table>
    <p class="terms">Zahlungsbedingungen: Zahlung innerhalb von ${contact.paymentTermsDays} Tagen ab Rechnungseingang ohne Abzüge.</p>
    <p>Bitte überweisen Sie den Rechnungsbetrag unter Angabe der Rechnungsnummer auf das unten angegebene Konto. Der Rechnungsbetrag ist bis zum ${dmy(inv.dueDate)} fällig.</p>
    <p>Mit freundlichen Grüßen<br>${esc(s.name)}</p>
  </div>

  <div class="footer">
    <div><b>${esc(s.name)}</b><br>${esc(s.street)}<br>${esc(s.zip)} ${esc(s.city)}<br>${esc(s.country)}</div>
    <div>Tel. ${esc(s.phone)}<br>E-Mail<br>${esc(s.email)}</div>
    <div>Bank ${esc(s.bank)}<br>IBAN ${esc(s.iban)}<br>BIC ${esc(s.bic)}<br>Steuer-Nr. ${esc(s.taxNumber)}<br>${taxId}</div>
  </div>
</div></body></html>`;
}
