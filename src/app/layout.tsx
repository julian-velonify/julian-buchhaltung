import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "./sidebar";
import { storageMode } from "@/lib/store";

export const metadata: Metadata = { title: "Velonify Buchhaltung", description: "Rechnungen, Kontakte, Steuer & GuV-Abgleich" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        <div className="shell">
          <Sidebar mode={storageMode()} />
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
