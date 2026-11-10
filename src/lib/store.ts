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
const KEY = "luki-app-v1";
let state: State = DEFAULT;
let loaded = false;
const subs = new Set<() => void>();
function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<State>;
      state = { ...DEFAULT, ...p, settings: { ...DEFAULT.settings, ...p.settings }, timer: { ...DEFAULT_TIMER, ...p.timer }, sessions: p.sessions ?? [] };
    }
  } catch { /* corrupted storage: start fresh */ }
}
export function update(fn: (s: State) => State) {
  load();
  state = fn(state);
  localStorage.setItem(KEY, JSON.stringify(state));
  subs.forEach((f) => f());
}
export function getState() { load(); return state; }
export function resetAll() { update(() => DEFAULT); }

export function useStore() {
  const [, set] = useState(0);
  const [ready, setReady] = useState(false);
  useEffect(() => { load(); setReady(true); const f = () => set((n) => n + 1); subs.add(f); return () => { subs.delete(f); }; }, []);
  return { s: ready ? state : DEFAULT, ready, update: useCallback(update, []) };
}
