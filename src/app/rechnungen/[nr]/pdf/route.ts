import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { renderInvoiceHtml } from "@/lib/invoice/html";
import { htmlToPdf } from "@/lib/invoice/pdf";
import { loadSender, openDb, regimeFor } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ nr: string }> }) {
  const { nr } = await params;
  const db = openDb();
  const inv = (await db.invoices.all()).find((i) => i.number === nr);
  if (!inv) return new NextResponse("Nicht gefunden", { status: 404 });

  // 1) Festgeschriebene Datei bevorzugen (GoBD: ausgestellte Rechnung bleibt unverändert)
  if (inv.pdfUrl.startsWith("local:")) {
    try {
      const buf = await readFile(join(process.cwd(), "data", "out", inv.pdfUrl.slice(6)));
      return new NextResponse(new Uint8Array(buf), { headers: { "content-type": "application/pdf" } });
    } catch { /* fällt auf Neurendern zurück */ }
  }
  if (inv.pdfFileId && process.env.GOOGLE_REFRESH_TOKEN) {
    const { driveApi } = await import("@/lib/google/auth");
    const res = await driveApi().files.get({ fileId: inv.pdfFileId, alt: "media", supportsAllDrives: true }, { responseType: "arraybuffer" });
    return new NextResponse(new Uint8Array(res.data as ArrayBuffer), { headers: { "content-type": "application/pdf" } });
  }

  // 2) Fallback: aus den gespeicherten Positionen neu rendern (nur Vorschau)
  const [contact, lines, sender, regimes] = await Promise.all([
    db.contacts.all().then((c) => c.find((x) => x.id === inv.customer)),
    db.invoiceLines.all().then((l) => l.filter((x) => x.invoice === nr)),
    loadSender(db), db.taxRegimes.all(),
  ]);
  if (!contact || !lines.length) return new NextResponse("Keine Positionen gespeichert", { status: 404 });
  const pdf = await htmlToPdf(renderInvoiceHtml({ invoice: inv, lines, contact, sender, regime: regimeFor(regimes, inv.serviceDate || inv.date) }));
  return new NextResponse(new Uint8Array(pdf), { headers: { "content-type": "application/pdf" } });
}
