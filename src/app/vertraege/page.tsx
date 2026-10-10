import { eurSym, isoDate, round2 } from "@/lib/format";
import { openDb } from "@/lib/store";
import { addContractLineAction, addOneOffAction, toggleContractLineAction } from "../actions";
import { Pill } from "../ui";

export const dynamic = "force-dynamic";

export default async function Contracts() {
  const db = openDb();
  const [lines, oneOffs, contacts] = await Promise.all([db.contracts.all(), db.oneOffs.all(), db.contacts.all()]);
  const name = (id: string) => contacts.find((c) => c.id === id)?.name ?? id;
  const customers = [...new Set(lines.map((l) => l.customer))].sort((a, b) => Number(a) - Number(b));
  const monthSum = round2(lines.filter((l) => l.active).reduce((a, l) => a + l.quantity * l.unitPrice, 0));
  const opts = contacts.filter((c) => c.category !== "Lieferant").sort((a, b) => Number(a.id) - Number(b.id));
  const month = isoDate(new Date()).slice(0, 7);

  return (
    <>
      <div className="head"><div><h1>Verträge</h1><div className="sub">Monatlich wiederkehrend: {eurSym(monthSum)}</div></div></div>

      {customers.map((cid) => {
        const ls = lines.filter((l) => l.customer === cid);
        const sum = round2(ls.filter((l) => l.active).reduce((a, l) => a + l.quantity * l.unitPrice, 0));
        return (
          <div key={cid} className="card tight" style={{ marginBottom: 18 }}>
            <div style={{ padding: "16px 18px", display: "flex", justifyContent: "space-between" }}>
              <b>{name(cid)} <span className="sub">· Kd.-Nr. {cid}</span></b><b className="num">{eurSym(sum)} / Monat</b>
            </div>
            <table className="t">
              <thead><tr><th>Beschreibung</th><th className="num">Menge</th><th className="num">Einzelpreis</th><th className="num">Summe</th><th></th></tr></thead>
              <tbody>
                {ls.map((l) => (
                  <tr key={l.id}>
                    <td>{l.description}{l.details && <div className="sub" style={{ fontSize: 13 }}>{l.details}</div>}</td>
                    <td className="num">{l.quantity} {l.unit}</td><td className="num">{eurSym(l.unitPrice)}</td>
                    <td className="num">{eurSym(round2(l.quantity * l.unitPrice))}</td>
                    <td className="num">
                      <form action={toggleContractLineAction}><input type="hidden" name="id" value={l.id} />
                        <button className="btn small">{l.active ? <Pill tone="ok">aktiv</Pill> : <Pill>pausiert</Pill>}</button></form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      <div className="grid g2">
        <form action={addContractLineAction} className="card">
          <h2>Vertragsposition hinzufügen</h2>
          <div className="fgrid">
            <label className="f">Kunde<select name="customer">{opts.map((c) => <option key={c.id} value={c.id}>{c.id} · {c.name}</option>)}</select></label>
            <label className="f">Beschreibung<input name="description" required /></label>
            <label className="f">Menge<input name="quantity" defaultValue="1" /></label>
            <label className="f">Einzelpreis (€)<input name="unitPrice" required /></label>
            <label className="f">Einheit<input name="unit" defaultValue="Stk" /></label>
            <label className="f">Details (optional)<input name="details" /></label>
          </div>
          <div style={{ marginTop: 16 }}><button className="btn primary">Hinzufügen</button></div>
        </form>

        <form action={addOneOffAction} className="card">
          <h2>Einmalige Leistung</h2>
          <div className="fgrid">
            <label className="f">Kunde<select name="customer">{opts.map((c) => <option key={c.id} value={c.id}>{c.id} · {c.name}</option>)}</select></label>
            <label className="f">Beschreibung<input name="description" required /></label>
            <label className="f">Menge<input name="quantity" defaultValue="1" /></label>
            <label className="f">Einzelpreis (€)<input name="unitPrice" required /></label>
            <label className="f">Mit abrechnen im Monat<input name="billingMonth" defaultValue={month} /></label>
            <label className="f">Einheit<input name="unit" defaultValue="Stk" /></label>
          </div>
          <div style={{ marginTop: 16 }}><button className="btn primary">Vormerken</button></div>
          {oneOffs.filter((o) => o.status === "offen").length > 0 && (
            <div style={{ marginTop: 16 }}>
              {oneOffs.filter((o) => o.status === "offen").map((o) => (
                <div className="rowline" key={o.id}><span>{name(o.customer)} · {o.description}</span><span className="sub">{o.billingMonth} · {eurSym(o.quantity * o.unitPrice)}</span></div>
              ))}
            </div>
          )}
        </form>
      </div>
    </>
  );
}
