import { useEffect, useState, useCallback } from "react";

export type Task = { id: string; title: string; time?: string | undefined; done: boolean; date: string };
export type Habit = { id: string; name: string; emoji: string; log: string[] };
export type DayLog = { date: string; mood: number; note: string };
export type Dream = { id: string; title: string; why: string; created: string };
export type ChatMsg = { role: "user" | "assistant"; content: string };
export type Settings = { name: string; phone: string; wake: string; sleep: string; focusGoal: number; joined: string };
/** One tracked block of time spent on an activity. */
export type Session = { id: string; activity: string; date: string; startedAt: number; ms: number; kind: "timer" | "stopwatch" | "manual" };
/** The live timer. elapsed = time banked before the current run; runningSince = when the current run began. */
export type TimerState = { mode: "timer" | "stopwatch"; activity: string; duration: number; elapsed: number; runningSince: number | null; firstStart: number | null };

export const todayKey = (d = new Date()) => {
  const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, "0"); const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
export const uid = () => Math.random().toString(36).slice(2, 10);

export type State = {
  tasks: Task[]; habits: Habit[]; days: DayLog[]; dreams: Dream[]; chat: ChatMsg[]; settings: Settings;
  sessions: Session[]; timer: TimerState;
};
export const DEFAULT_TIMER: TimerState = { mode: "timer", activity: "Focus", duration: 25 * 60_000, elapsed: 0, runningSince: null, firstStart: null };
export const DEFAULT: State = {
  tasks: [],
  habits: [
    { id: "h1", name: "Drink water", emoji: "💧", log: [] },
    { id: "h2", name: "Read 20 min", emoji: "📖", log: [] },
    { id: "h3", name: "Move body", emoji: "🧘", log: [] },
  ],
  days: [], dreams: [], chat: [], sessions: [],
  settings: { name: "", phone: "", wake: "07:00", sleep: "22:00", focusGoal: 120, joined: "" },
  timer: DEFAULT_TIMER,
};
const LEGACY_KEY = "luki-app-v1";
const cacheKey = (id: string) => `luki-app-v1:${id}`;
let state: State = DEFAULT;
let loaded = false;
const subs = new Set<() => void>();
const notify = () => subs.forEach((f) => f());

function parse(raw: string | null): State | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Partial<State>;
    return { ...DEFAULT, ...p, settings: { ...DEFAULT.settings, ...p.settings }, timer: { ...DEFAULT_TIMER, ...p.timer }, sessions: p.sessions ?? [], tasks: p.tasks ?? [] };
  } catch { return null; /* corrupted storage: start fresh */ }
}
function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
}

// ---------- Online account sync (Lovable Cloud) ----------
let userId: string | null = null;
let hydratedFor: string | null = null;
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let lastProfile = "";

type Row = { id: string; title: string; time: string | null; date: string; done: boolean };
const toTask = (r: Row): Task => ({ id: r.id, title: r.title, time: r.time ?? undefined, date: r.date, done: r.done });
const toRow = (uidv: string, t: Task) => ({ user_id: uidv, id: t.id, title: t.title.slice(0, 200) || "Untitled", time: t.time ?? null, date: t.date, done: t.done });

async function db() { return (await import("@/integrations/supabase/client")).supabase; }

export const isHydrated = (id: string) => hydratedFor === id;

/** Loads the signed-in user's data from the cloud (first sign-in uploads what was on this phone). */
export async function hydrateFor(id: string) {
  if (hydratedFor === id) return;
  const sb = await db();
  const [{ data: row, error: e1 }, { data: rows, error: e2 }, { data: profile }] = await Promise.all([
    sb.from("user_state").select("data").eq("user_id", id).maybeSingle(),
    sb.from("tasks").select("id,title,time,date,done").eq("user_id", id),
    sb.from("profiles").select("name,phone").eq("id", id).maybeSingle(),
  ]);
  if (e1 || e2) throw new Error(e1?.message ?? e2?.message);
  let next: State;
  if (row) {
    next = parse(JSON.stringify(row.data)) ?? DEFAULT;
    next.tasks = (rows ?? []).map(toTask);
  } else {
    // First time on Cloud: bring over anything saved on this phone before accounts existed.
    const local = parse(localStorage.getItem(cacheKey(id))) ?? parse(localStorage.getItem(LEGACY_KEY)) ?? DEFAULT;
    next = { ...local, tasks: [...(rows ?? []).map(toTask), ...local.tasks.filter((t) => !(rows ?? []).some((r) => r.id === t.id))] };
    const fresh = next.tasks.filter((t) => !(rows ?? []).some((r) => r.id === t.id));
    if (fresh.length) await sb.from("tasks").upsert(fresh.map((t) => toRow(id, t)));
    await sb.from("user_state").upsert({ user_id: id, data: withoutTasks(next) });
    localStorage.removeItem(LEGACY_KEY);
  }
  if (profile) next.settings = { ...next.settings, name: profile.name || next.settings.name, phone: profile.phone || next.settings.phone };
  next.settings.joined ||= todayKey();
  lastProfile = JSON.stringify([next.settings.name, next.settings.phone]);
  userId = id; hydratedFor = id; state = next; loaded = true;
  localStorage.setItem(cacheKey(id), JSON.stringify(state));
  notify();
}

/** Re-reads plan items from the cloud (e.g. after Luki changed them on a call). */
export async function refreshTasks() {
  const id = userId; if (!id) return;
  const { data, error } = await (await db()).from("tasks").select("id,title,time,date,done").eq("user_id", id);
  if (error || userId !== id) return;
  state = { ...state, tasks: (data ?? []).map(toTask) };
  localStorage.setItem(cacheKey(id), JSON.stringify(state));
  notify();
}

export function clearSession() {
  clearTimeout(saveTimer);
  userId = null; hydratedFor = null; state = DEFAULT; notify();
}

const withoutTasks = (s: State) => { const { tasks: _t, ...rest } = s; return rest; };

function syncTasks(id: string, prev: Task[], next: Task[]) {
  const before = new Map(prev.map((t) => [t.id, t]));
  const after = new Set(next.map((t) => t.id));
  const changed = next.filter((t) => { const b = before.get(t.id); return !b || b.title !== t.title || b.time !== t.time || b.done !== t.done || b.date !== t.date; });
  const removed = prev.filter((t) => !after.has(t.id)).map((t) => t.id);
  void (async () => {
    const sb = await db();
    if (changed.length) { const { error } = await sb.from("tasks").upsert(changed.map((t) => toRow(id, t))); if (error) console.error("Task sync failed", error.message); }
    if (removed.length) { const { error } = await sb.from("tasks").delete().eq("user_id", id).in("id", removed); if (error) console.error("Task delete failed", error.message); }
  })();
}

function scheduleSave(id: string) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    if (userId !== id) return;
    const sb = await db();
    const { error } = await sb.from("user_state").upsert({ user_id: id, data: withoutTasks(state), updated_at: new Date().toISOString() });
    if (error) console.error("Save failed", error.message);
    const prof = JSON.stringify([state.settings.name, state.settings.phone]);
    if (prof !== lastProfile) {
      const { error: pe } = await sb.from("profiles").update({ name: state.settings.name, phone: state.settings.phone, updated_at: new Date().toISOString() }).eq("id", id);
      if (!pe) lastProfile = prof;
    }
  }, 700);
}

export function update(fn: (s: State) => State) {
  load();
  const prev = state;
  state = fn(state);
  if (userId) {
    localStorage.setItem(cacheKey(userId), JSON.stringify(state));
    if (prev.tasks !== state.tasks) syncTasks(userId, prev.tasks, state.tasks);
    scheduleSave(userId);
  }
  notify();
}
export function getState() { load(); return state; }
/** Wipes tasks, habits, reports etc. but keeps the account's name, number and call times. */
export function resetAll() { update((s) => ({ ...DEFAULT, settings: s.settings })); }

export function useStore() {
  const [, set] = useState(0);
  const [ready, setReady] = useState(false);
  useEffect(() => { load(); setReady(true); const f = () => set((n) => n + 1); subs.add(f); return () => { subs.delete(f); }; }, []);
  return { s: ready ? state : DEFAULT, ready, update: useCallback(update, []) };
}
