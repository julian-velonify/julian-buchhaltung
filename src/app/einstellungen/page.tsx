import { dmy } from "@/lib/format";
import { googleConfigured } from "@/lib/google/auth";
import { ledgerSource } from "@/lib/ledger";
import { openDb, storageMode } from "@/lib/store";
import { saveSettingsAction } from "../actions";
import { Pill } from "../ui";

export const dynamic = "force-dynamic";

const FIELDS: [string, string][] = [
  ["name", "Name / Firma"], ["street", "Straße"], ["zip", "PLZ"], ["city", "Ort"], ["country", "Land"],
  ["phone", "Telefon"], ["email", "E-Mail"], ["contactPerson", "Ansprechpartner"],
  ["taxNumber", "Steuernummer"], ["vatId", "USt-IdNr. (ab Regelbesteuerung)"],
  ["bank", "Bank"], ["iban", "IBAN"], ["bic", "BIC"],
];

export default async function Settings() {
  const db = openDb();
  const [settings, regimes] = await Promise.all([db.settings.all(), db.taxRegimes.all()]);
  const v = (k: string) => settings.find((s) => s.key === k)?.value ?? "";
  const check = (ok: boolean) => <Pill tone={ok ? "ok" : "warn"}>{ok ? "verbunden" : "nicht verbunden"}</Pill>;

  return (
    <>
      <div className="head"><div><h1>Einstellungen</h1><div className="sub">Absender, Steuerregime, Verbindungen</div></div></div>

      <div className="grid g2" style={{ marginBottom: 18 }}>
        <div className="card">
          <h2>Verbindungen</h2>
          <div className="rowline"><span>Datenbank (Google Sheet)</span>{check(storageMode() === "sheet")}</div>
          <div className="rowline"><span>Google OAuth (Drive, Gmail)</span>{check(googleConfigured())}</div>
          <div className="rowline"><span>GuV-Tabelle</span>{check(ledgerSource() !== "none")}</div>
          <div className="rowline"><span>Drive-Ordner Buchhaltung</span>{check(Boolean(process.env.DRIVE_ROOT_FOLDER_ID))}</div>
        </div>
        <div className="card">
          <h2>Steuerregime</h2>
          {regimes.sort((a, b) => a.validFrom.localeCompare(b.validFrom)).map((r) => (
            <div className="rowline" key={r.validFrom}>
              <span>ab {dmy(r.validFrom)}</span>
              <span>{r.type === "kleinunternehmer" ? "Kleinunternehmer §19 UStG" : `Regelbesteuerung ${Math.round(r.vatRate * 100)} %`}</span>
            </div>
          ))}
          <div className="sub" style={{ fontSize: 13, marginTop: 10 }}>Änderbar im Tabellenblatt „Steuerregime“ der Datenbank.</div>
        </div>
      </div>

      <form action={saveSettingsAction} className="card">
        <h2>Absender</h2>
        <div className="fgrid">
          {FIELDS.map(([k, l]) => <label className="f" key={k}>{l}<input name={k} defaultValue={v(k)} /></label>)}
          <label className="f">USt-Versteuerung (ab 2027)
            <select name="ust_versteuerung" defaultValue={v("ust_versteuerung") || "Soll"}>
              <option value="Soll">Soll (nach Rechnungsdatum)</option><option value="Ist">Ist (nach Zahlungseingang, §20 UStG)</option>
            </select>
          </label>
        </div>
        <div style={{ marginTop: 20 }}><button className="btn primary">Speichern</button></div>
      </form>
    </>
  );
}
