// Monatsrechnungen erzeugen (am 01. per Cron/Task):
//   npm run billing:monthly -- --dry                 nur anzeigen
//   npm run billing:monthly                          heute, alle Kunden
//   npm run billing:monthly -- --date 2026-11-01 --only 1002,1013
import "./env";
import { executeBilling, planBilling } from "../src/lib/billing";
import { isoDate } from "../src/lib/format";
import { openDb } from "../src/lib/store";

const arg = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const date = arg("date") ?? isoDate(new Date());
const only = arg("only")?.split(",").map((s) => s.trim());
const db = openDb();

console.log(`Modus: ${db.mode} · Rechnungsdatum ${date}${only ? ` · nur ${only.join(", ")}` : ""}`);
if (process.argv.includes("--dry")) {
  const plan = await planBilling(db, { date });
  for (const p of plan.planned.filter((x) => !only || only.includes(x.contact.id))) {
    console.log(`${p.invoice.number}  ${p.contact.name.padEnd(30)} ${p.invoice.gross.toFixed(2).padStart(10)} EUR  fällig ${p.invoice.dueDate}  ${p.contact.email || "⚠ keine E-Mail"}`);
  }
  for (const s of plan.skipped) console.log(`übersprungen  ${s.name}: ${s.reason}`);
} else {
  const r = await executeBilling(db, { date, only });
  for (const c of r.created) console.log(`✓ ${c.number}  ${c.name.padEnd(30)} ${c.gross.toFixed(2).padStart(10)} EUR  ${c.warning ? "⚠ " + c.warning : "Entwurf in Gmail"}`);
  for (const s of r.skipped) console.log(`übersprungen  ${s.name}: ${s.reason}`);
}
