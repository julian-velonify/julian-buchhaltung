import { Readable } from "node:stream";
import { driveApi } from "./auth";

async function findOrCreateFolder(parentId: string, name: string): Promise<string> {
  const api = driveApi();
  const q = `'${parentId}' in parents and name = '${name.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const found = await api.files.list({ q, fields: "files(id)", pageSize: 1, supportsAllDrives: true, includeItemsFromAllDrives: true });
  if (found.data.files?.[0]?.id) return found.data.files[0].id;
  const created = await api.files.create({
    requestBody: { name, mimeType: "application/vnd.google-apps.folder", parents: [parentId] },
    fields: "id", supportsAllDrives: true,
  });
  return created.data.id!;
}

/** Legt <root>/<Jahr>/Ausgangsrechnungen/<Monat> an (passt zur bestehenden Struktur) und lädt die PDF hoch. */
export async function uploadInvoicePdf(opts: { rootFolderId: string; year: number; monthName: string; fileName: string; pdf: Buffer }) {
  const yearId = await findOrCreateFolder(opts.rootFolderId, String(opts.year));
  const outId = await findOrCreateFolder(yearId, "Ausgangsrechnungen");
  const monthId = await findOrCreateFolder(outId, opts.monthName);
  const res = await driveApi().files.create({
    requestBody: { name: opts.fileName, parents: [monthId] },
    media: { mimeType: "application/pdf", body: Readable.from(opts.pdf) },
    fields: "id, webViewLink", supportsAllDrives: true,
  });
  return { id: res.data.id!, url: res.data.webViewLink ?? `https://drive.google.com/file/d/${res.data.id}/view` };
}
