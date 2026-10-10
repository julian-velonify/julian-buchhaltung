// Legt in der Google-Sheet-„Datenbank" alle Tabellenblätter an und kopiert den lokalen Stand hinein.
//   npm run db:push        (benötigt DB_SHEET_ID + Google-OAuth in .env)
import "./env";
import { googleConfigured } from "../src/lib/google/auth";
import { SheetTable, ensureTabs } from "../src/lib/store/sheets";
import { LocalTable } from "../src/lib/store/local";
import { ALL_TABS } from "../src/lib/tabs";

const id = process.env.DB_SHEET_ID;
if (!id || !googleConfigured()) {
  console.error("DB_SHEET_ID und GOOGLE_* müssen in .env gesetzt sein (siehe README).");
  process.exit(1);
}
await ensureTabs(id, ALL_TABS as never);
for (const def of ALL_TABS) {
  const rows = await new LocalTable(def as never).all();
  await new SheetTable(def as never, id).replaceAll(rows as never);
  console.log(`${def.name}: ${rows.length} Zeilen`);
}
console.log("Fertig. Ab jetzt DB_SHEET_ID gesetzt lassen – die App liest und schreibt im Sheet.");
