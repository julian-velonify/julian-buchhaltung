import Link from "next/link";
import { openDb } from "@/lib/store";
import { Pill } from "../ui";

export const dynamic = "force-dynamic";

export default async function Contacts() {
  const contacts = (await openDb().contacts.all()).sort((a, b) => Number(a.id) - Number(b.id));
  const missing = contacts.filter((c) => c.active && !c.email).length;
  return (
    <>
      <div className="head">
        <div><h1>Kontakte</h1><div className="sub">{contacts.length} Kontakte</div></div>
        <Link href="/kontakte/neu" className="btn primary">Kunde anlegen</Link>
      </div>
      {missing > 0 && <div className="note warn">{missing} aktive(r) Kunde(n) ohne E-Mail-Adresse – für diese kann kein Gmail-Entwurf erstellt werden.</div>}
      <div className="card tight">
        <table className="t">
          <thead><tr><th>Nr.</th><th>Name</th><th>Ansprechpartner</th><th>Ort</th><th>E-Mail</th><th>Status</th></tr></thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id} className="row">
                <td>{c.id}</td>
                <td><Link href={`/kontakte/${c.id}`}><b>{c.name || "–"}</b></Link><div className="sub" style={{ fontSize: 13 }}>{c.category}</div></td>
                <td>{c.contactPerson}</td>
                <td>{[c.zip, c.city].filter(Boolean).join(" ")}</td>
                <td>{c.email || (c.active ? <Pill tone="warn">fehlt</Pill> : "")}</td>
                <td>{c.active ? <Pill tone="ok">Rechnung aktiv</Pill> : <Pill>inaktiv</Pill>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
