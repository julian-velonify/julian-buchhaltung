import { gmailApi } from "./auth";

const b64url = (b: Buffer) => b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const encHeader = (s: string) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${Buffer.from(s).toString("base64")}?=`);
const wrap76 = (s: string) => s.replace(/(.{76})/g, "$1\r\n");

/** Legt einen Gmail-ENTWURF mit PDF-Anhang an. Es wird nichts versendet. */
export async function createInvoiceDraft(p: {
  to: string; subject: string; body: string; fileName: string; pdf: Buffer; from?: string;
}): Promise<string> {
  const boundary = `b_${Date.now().toString(36)}`;
  const parts = [
    ...(p.from ? [`From: ${p.from}`] : []),
    `To: ${p.to}`,
    `Subject: ${encHeader(p.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    wrap76(Buffer.from(p.body, "utf8").toString("base64")),
    `--${boundary}`,
    `Content-Type: application/pdf; name="${p.fileName}"`,
    `Content-Disposition: attachment; filename="${p.fileName}"`,
    "Content-Transfer-Encoding: base64",
    "",
    wrap76(p.pdf.toString("base64")),
    `--${boundary}--`,
    "",
  ];
  const res = await gmailApi().users.drafts.create({
    userId: "me",
    requestBody: { message: { raw: b64url(Buffer.from(parts.join("\r\n"), "utf8")) } },
  });
  return res.data.id!;
}
