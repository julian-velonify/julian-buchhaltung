import type { Invoice } from "@/lib/types";

export function Pill({ tone, children }: { tone?: "ok" | "warn" | "bad"; children: React.ReactNode }) {
  return <span className={`pill ${tone ?? ""}`}>{children}</span>;
}

export type EffStatus = "Entwurf" | "Offen" | "Fällig" | "Bezahlt" | "Storniert";

/** Status inkl. Fälligkeit; Bezahlt auch dann, wenn die Rechnung in der GuV als Einnahme steht. */
export function effectiveStatus(inv: Invoice, paidInLedger: boolean, today: string): EffStatus {
  if (inv.status === "Storniert") return "Storniert";
  if (inv.status === "Bezahlt" || paidInLedger) return "Bezahlt";
  if (inv.status === "Entwurf") return "Entwurf";
  return inv.dueDate && inv.dueDate < today ? "Fällig" : "Offen";
}

export function StatusPill({ s }: { s: EffStatus }) {
  const tone = s === "Bezahlt" ? "ok" : s === "Fällig" ? "bad" : s === "Offen" ? "warn" : undefined;
  return <Pill tone={tone}>{s}</Pill>;
}

export function BarChart({ data, labels }: { data: { income: number; expense: number }[]; labels: string[] }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  return (
    <div>
      <div className="bars">
        {data.map((d, i) => (
          <div className="bar" key={i} title={`${labels[i]}: Einnahmen ${d.income.toFixed(2)} € · Ausgaben ${d.expense.toFixed(2)} €`}>
            <div className="pair">
              <div className="col" style={{ height: `${(d.income / max) * 100}%` }} />
              <div className="col exp" style={{ height: `${(d.expense / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="xl">{labels.map((l) => <span key={l}>{l}</span>)}</div>
      <div className="legend"><span><i />Einnahmen</span><span><i className="e" />Ausgaben</span></div>
    </div>
  );
}
