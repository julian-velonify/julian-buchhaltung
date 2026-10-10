import Link from "next/link";
import { notFound } from "next/navigation";
import { openDb } from "@/lib/store";
import type { Contact } from "@/lib/types";
import { createContactAction, saveContactAction } from "../../actions";

export const dynamic = "force-dynamic";

const EMPTY: Contact = {
  id: "", name: "", contactPerson: "", category: "Kunde", street: "", zip: "", city: "", country: "Deutschland", email: "",
  vatId: "", paymentTermsDays: 14, salutation: "", tone: "sie", active: true,
};

export default async function ContactEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === "neu";
  const c = isNew ? EMPTY : (await openDb().contacts.all()).find((x) => x.id === id);
  if (!c) notFound();
  const F = ({ name, label, value, type }: { name: string; label: string; value: string | number; type?: string }) => (
    <label className="f">{label}<input name={name} defaultValue={value} type={type} /></label>
  );
  return (
    <>
      <div className="head"><div><Link href="/kontakte" className="sub">← Kontakte</Link><h1>{isNew ? "Kunde anlegen" : c.name}</h1></div></div>
      <form action={isNew ? createContactAction : saveContactAction} className="card">
        {!isNew && <input type="hidden" name="id" value={c.id} />}
        <div className="fgrid">
          <F name="name" label="Name / Firma" value={c.name} />
          <F name="contactPerson" label="Ansprechpartner" value={c.contactPerson} />
          <F name="street" label="Straße" value={c.street} />
          <F name="email" label="E-Mail (für Gmail-Entwurf)" value={c.email} type="email" />
          <F name="zip" label="PLZ" value={c.zip} />
          <F name="city" label="Ort" value={c.city} />
          <F name="country" label="Land" value={c.country} />
          <F name="vatId" label="USt-IdNr. (ab 2027 für EU-Kunden wichtig)" value={c.vatId} />
          <F name="salutation" label="Anrede in der Rechnung (z. B. „Lieber Noa,“)" value={c.salutation} />
          <label className="f">Ansprache
            <select name="tone" defaultValue={c.tone}><option value="sie">Sie</option><option value="du">du</option></select>
          </label>
          <F name="paymentTermsDays" label="Zahlungsziel (Tage)" value={c.paymentTermsDays} type="number" />
          {!isNew && <label className="f">Monatliche Rechnung<span><input type="checkbox" name="active" defaultChecked={c.active} /> aktiv</span></label>}
        </div>
        <div style={{ marginTop: 20 }}><button className="btn primary">Speichern</button></div>
      </form>
    </>
  );
}
