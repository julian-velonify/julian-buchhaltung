"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { executeBilling } from "@/lib/billing";
import { isoDate } from "@/lib/format";
import { logAction, openDb } from "@/lib/store";
import type { Contact } from "@/lib/types";

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const n = (f: FormData, k: string) => Number(String(f.get(k) ?? "0").replace(",", ".")) || 0;

export async function generateInvoicesAction(f: FormData) {
  const db = openDb();
  const date = s(f, "date") || isoDate(new Date());
  const only = f.getAll("only").map(String).filter(Boolean);
  const res = await executeBilling(db, { date, only: only.length ? only : undefined });
  revalidatePath("/", "layout");
  const q = new URLSearchParams({ created: String(res.created.length), skipped: String(res.skipped.length) });
  redirect(`/rechnungen?${q}`);
}

export async function saveContactAction(f: FormData) {
  const db = openDb();
  const id = s(f, "id");
  const old = (await db.contacts.all()).find((c) => c.id === id);
  if (!old) return;
  const next: Contact = {
    ...old,
    name: s(f, "name"), contactPerson: s(f, "contactPerson"), street: s(f, "street"), zip: s(f, "zip"), city: s(f, "city"),
    country: s(f, "country"), email: s(f, "email"), vatId: s(f, "vatId"), salutation: s(f, "salutation"),
    tone: s(f, "tone") === "du" ? "du" : "sie", paymentTermsDays: n(f, "paymentTermsDays") || 14, active: f.get("active") === "on",
  };
  await db.contacts.upsert(next);
  await logAction(db, "Kontakt geändert", `${next.id} · ${next.name}`);
  revalidatePath("/", "layout");
  redirect("/kontakte");
}

export async function createContactAction(f: FormData) {
  const db = openDb();
  const all = await db.contacts.all();
  const id = String(Math.max(1000, ...all.map((c) => Number(c.id) || 0)) + 1);
  const c: Contact = {
    id, name: s(f, "name"), contactPerson: s(f, "contactPerson"), category: "Kunde", street: s(f, "street"), zip: s(f, "zip"),
    city: s(f, "city"), country: s(f, "country") || "Deutschland", email: s(f, "email"), vatId: s(f, "vatId"),
    paymentTermsDays: n(f, "paymentTermsDays") || 14, salutation: s(f, "salutation"), tone: s(f, "tone") === "du" ? "du" : "sie", active: true,
  };
  if (!c.name) return;
  await db.contacts.append([c]);
  await logAction(db, "Kontakt angelegt", `${c.id} · ${c.name}`);
  revalidatePath("/", "layout");
  redirect(`/kontakte/${id}`);
}

export async function markPaidAction(f: FormData) {
  const db = openDb();
  const number = s(f, "number");
  const inv = (await db.invoices.all()).find((i) => i.number === number);
  if (!inv) return;
  await db.invoices.upsert({ ...inv, status: "Bezahlt", paidOn: s(f, "paidOn") || isoDate(new Date()) });
  await logAction(db, "Als bezahlt markiert", number);
  revalidatePath("/", "layout");
}

export async function addContractLineAction(f: FormData) {
  const db = openDb();
  const customer = s(f, "customer");
  const existing = (await db.contracts.all()).filter((l) => l.customer === customer);
  const description = s(f, "description");
  if (!customer || !description) return;
  await db.contracts.append([{
    id: `V-${customer}-${existing.length + 1}-${Date.now().toString(36).slice(-3)}`, customer, description,
    details: s(f, "details"), quantity: n(f, "quantity") || 1, unit: s(f, "unit") || "Stk", unitPrice: n(f, "unitPrice"),
    validFrom: "", validTo: "", active: true,
  }]);
  await logAction(db, "Vertragsposition angelegt", `${customer} · ${description}`);
  revalidatePath("/vertraege");
}

export async function toggleContractLineAction(f: FormData) {
  const db = openDb();
  const l = (await db.contracts.all()).find((x) => x.id === s(f, "id"));
  if (!l) return;
  await db.contracts.upsert({ ...l, active: !l.active });
  revalidatePath("/vertraege");
}

export async function addOneOffAction(f: FormData) {
  const db = openDb();
  const customer = s(f, "customer");
  const description = s(f, "description");
  if (!customer || !description) return;
  await db.oneOffs.append([{
    id: `E-${Date.now().toString(36)}`, customer, description, details: s(f, "details"),
    quantity: n(f, "quantity") || 1, unit: s(f, "unit") || "Stk", unitPrice: n(f, "unitPrice"),
    billingMonth: s(f, "billingMonth") || isoDate(new Date()).slice(0, 7), status: "offen",
  }]);
  await logAction(db, "Einmalige Leistung angelegt", `${customer} · ${description}`);
  revalidatePath("/vertraege");
}

export async function saveSettingsAction(f: FormData) {
  const db = openDb();
  for (const [k, v] of f.entries()) {
    if (k.startsWith("$")) continue;
    await db.settings.upsert({ key: k, value: String(v).trim() });
  }
  await logAction(db, "Einstellungen gespeichert", "");
  revalidatePath("/", "layout");
}
