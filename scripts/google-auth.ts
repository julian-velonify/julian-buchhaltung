// Einmalige Anmeldung: erzeugt GOOGLE_REFRESH_TOKEN für Sheets + Drive + Gmail-Entwürfe.
//   1. In der Google Cloud Console einen OAuth-Client „Desktop-App" anlegen (README)
//   2. GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in .env eintragen
//   3. npm run google:auth
import "./env";
import { createServer } from "node:http";
import { exec } from "node:child_process";
import { google } from "googleapis";
import { SCOPES } from "../src/lib/google/auth";

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET fehlen in .env");
  process.exit(1);
}
const PORT = 53682;
const redirect = `http://127.0.0.1:${PORT}/callback`;
const client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, redirect);
const url = client.generateAuthUrl({ access_type: "offline", prompt: "consent", scope: SCOPES });

const server = createServer(async (req, res) => {
  const u = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
  if (u.pathname !== "/callback") { res.end(); return; }
  const code = u.searchParams.get("code");
  if (!code) { res.end("Kein Code erhalten."); return; }
  const { tokens } = await client.getToken(code);
  res.end("Fertig – du kannst dieses Fenster schließen.");
  console.log("\nIn .env eintragen:\n\nGOOGLE_REFRESH_TOKEN=" + tokens.refresh_token + "\n");
  server.close();
});
server.listen(PORT, () => {
  console.log("Öffne im Browser:\n" + url + "\n");
  exec(`open "${url}"`);
});
