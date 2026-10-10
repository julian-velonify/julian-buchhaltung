"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const MAIN = [
  ["/", "Übersicht"], ["/rechnungen", "Rechnungen"], ["/belege", "Belege"], ["/steuern", "Steuern"], ["/abgleich", "GuV-Abgleich"],
] as const;
const MANAGE = [
  ["/kontakte", "Kontakte"], ["/vertraege", "Verträge"], ["/einstellungen", "Einstellungen"],
] as const;

export function Sidebar({ mode }: { mode: "sheet" | "local" }) {
  const path = usePathname();
  const on = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const link = ([href, label]: readonly [string, string]) => (
    <Link key={href} href={href} className={on(href) ? "on" : ""}>{label}</Link>
  );
  return (
    <aside className="side">
      <div className="brand"><i /> Velonify</div>
      <nav className="nav">
        {MAIN.map(link)}
        <div className="grp">Verwalten</div>
        {MANAGE.map(link)}
      </nav>
      <div className={`mode ${mode}`}>
        {mode === "sheet" ? "Datenbank: Google Sheet" : "Lokaler Modus – nicht mit Google Sheet verbunden"}
      </div>
    </aside>
  );
}
