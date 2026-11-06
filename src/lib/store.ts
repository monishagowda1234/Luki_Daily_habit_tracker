import { useEffect, useState, useCallback } from "react";

export type Task = { id: string; title: string; time?: string | undefined; done: boolean; date: string };
export type Habit = { id: string; name: string; emoji: string; log: string[] };
export type DayLog = { date: string; mood: number; note: string };
export type Dream = { id: string; title: string; why: string; created: string };
export type ChatMsg = { role: "user" | "assistant"; content: string };
export type Settings = { name: string; phone: string; wake: string; sleep: string };

export const todayKey = (d = new Date()) => d.toISOString().slice(0, 10);
export const uid = () => Math.random().toString(36).slice(2, 10);

type State = {
  tasks: Task[]; habits: Habit[]; days: DayLog[]; dreams: Dream[]; chat: ChatMsg[]; settings: Settings;
};
const DEFAULT: State = {
  tasks: [],
  habits: [
    { id: "h1", name: "Drink water", emoji: "💧", log: [] },
    { id: "h2", name: "Read 20 min", emoji: "📖", log: [] },
    { id: "h3", name: "Move body", emoji: "🧘", log: [] },
  ],
  days: [], dreams: [], chat: [],
  settings: { name: "", phone: "", wake: "07:00", sleep: "22:00" },
};
const KEY = "luki-app-v1";
let state: State = DEFAULT;
let loaded = false;
const subs = new Set<() => void>();
function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try { const raw = localStorage.getItem(KEY); if (raw) state = { ...DEFAULT, ...JSON.parse(raw) }; } catch {}
}
export function update(fn: (s: State) => State) {
  load();
  state = fn(state);
  localStorage.setItem(KEY, JSON.stringify(state));
  subs.forEach((f) => f());
}
export function getState() { load(); return state; }

export function useStore() {
  const [, set] = useState(0);
  const [ready, setReady] = useState(false);
  useEffect(() => { load(); setReady(true); const f = () => set((n) => n + 1); subs.add(f); return () => { subs.delete(f); }; }, []);
  return { s: ready ? state : DEFAULT, ready, update: useCallback(update, []) };
}
