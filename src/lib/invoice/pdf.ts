// HTML → PDF über headless Chrome. Lokal reicht ein installiertes Chrome (CHROME_PATH).
// Für Serverless später gegen @sparticuz/chromium + puppeteer-core austauschen – Signatur bleibt gleich.
//
// Hinweis: Chrome (headless=new) schreibt die PDF, beendet sich aber nicht immer von selbst.
// Daher: starten, auf stabile Datei warten, Prozess beenden.
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = () => process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fileSize(p: string): Promise<number> {
  try { return (await stat(p)).size; } catch { return 0; }
}

export async function htmlToPdf(html: string): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "inv-"));
  const htmlPath = join(dir, "in.html");
  const pdfPath = join(dir, "out.pdf");
  await writeFile(htmlPath, html);

  const child = spawn(CHROME(), [
    "--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--no-first-run",
    `--user-data-dir=${join(dir, "profile")}`, `--print-to-pdf=${pdfPath}`, `file://${htmlPath}`,
  ], { stdio: "ignore" });
  let exited = false;
  child.on("exit", () => { exited = true; });

  try {
    const deadline = Date.now() + 30_000;
    let last = -1;
    while (Date.now() < deadline) {
      const size = await fileSize(pdfPath);
      if (size > 0 && size === last) break;       // Größe seit 250 ms unverändert → fertig
      last = size;
      if (exited && size > 0) break;
      await sleep(250);
    }
    if ((await fileSize(pdfPath)) === 0) throw new Error("PDF-Erzeugung fehlgeschlagen (Chrome hat keine Datei geschrieben)");
    return await readFile(pdfPath);
  } finally {
    if (!exited) child.kill("SIGKILL");
    await sleep(100);
    await rm(dir, { recursive: true, force: true });
  }
}
