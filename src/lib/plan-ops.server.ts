import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** Plan (task) operations shared by Luki's in-app voice call and real phone calls.
 * Every query filters by user_id explicitly so it is safe with both user and admin clients. */
export type Db = SupabaseClient<Database>;
export type PlanItem = { id: string; title: string; time: string | null; date: string; done: boolean };

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function addDays(date: string, n: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export async function listPlan(db: Db, userId: string, date: string): Promise<PlanItem[]> {
  if (!DATE_RE.test(date)) throw new Error("Invalid date");
  const { data, error } = await db.from("tasks").select("id,title,time,date,done").eq("user_id", userId).eq("date", date).order("time", { ascending: true, nullsFirst: false }).limit(100);
  if (error) throw new Error(`Could not read the plan: ${error.message}`);
  return data ?? [];
}

export async function addPlanItem(db: Db, userId: string, item: { title: string; time: string | null; date: string }): Promise<PlanItem> {
  const title = item.title.trim().slice(0, 200);
  if (!title) throw new Error("A plan item needs a title");
  if (!DATE_RE.test(item.date)) throw new Error("Invalid date");
  const time = item.time && TIME_RE.test(item.time) ? item.time : null;
  const row = { user_id: userId, id: crypto.randomUUID().replace(/-/g, "").slice(0, 10), title, time, date: item.date, done: false };
  const { data, error } = await db.from("tasks").insert(row).select("id,title,time,date,done").single();
  if (error || !data) throw new Error(`Could not add the plan item: ${error?.message ?? "unknown"}`);
  return data;
}

export async function removePlanItem(db: Db, userId: string, id: string): Promise<PlanItem | null> {
  const { data, error } = await db.from("tasks").delete().eq("user_id", userId).eq("id", id).select("id,title,time,date,done");
  if (error) throw new Error(`Could not remove the plan item: ${error.message}`);
  return data?.[0] ?? null;
}

export async function setPlanItemDone(db: Db, userId: string, id: string, done: boolean): Promise<PlanItem | null> {
  const { data, error } = await db.from("tasks").update({ done }).eq("user_id", userId).eq("id", id).select("id,title,time,date,done");
  if (error) throw new Error(`Could not update the plan item: ${error.message}`);
  return data?.[0] ?? null;
}

export function planText(items: PlanItem[]) {
  if (!items.length) return "nothing planned yet";
  return items.slice(0, 30).map((t) => `- [${t.done ? "done" : "todo"}] ${t.time ? t.time + " " : ""}${t.title.slice(0, 80)} (id ${t.id})`).join("\n");
}

/** Creates a database client that acts as the signed-in user (RLS applies). */
export async function userClient(accessToken: string) {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env["SUPABASE_URL"] ?? "";
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? "";
  if (!url || !key) throw new Error("Backend is not configured");
  const db = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data, error } = await db.auth.getUser(accessToken);
  if (error || !data.user) throw new Error("Please sign in again");
  return { db, userId: data.user.id };
}
