import { todayKey, type Session, type State } from "./store";

export function fmtDur(ms: number) {
  const mins = Math.round(ms / 60000);
  if (ms > 0 && mins === 0) return `${Math.max(1, Math.round(ms / 1000))}s`;
  const h = Math.floor(mins / 60); const m = mins % 60;
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

export const sessionsOn = (sessions: Session[], date: string) =>
  sessions.filter((x) => x.date === date).sort((a, b) => a.startedAt - b.startedAt);

export type ActivityTotal = { activity: string; ms: number; count: number; pct: number };

/** Groups sessions by activity name (case-insensitive), largest first. */
export function byActivity(list: Session[]): ActivityTotal[] {
  const map = new Map<string, ActivityTotal>();
  for (const x of list) {
    const k = x.activity.trim().toLowerCase();
    const cur = map.get(k) ?? { activity: x.activity.trim(), ms: 0, count: 0, pct: 0 };
    cur.ms += x.ms; cur.count += 1; map.set(k, cur);
  }
  const total = list.reduce((a, x) => a + x.ms, 0);
  return [...map.values()].map((a) => ({ ...a, pct: total ? Math.round((a.ms / total) * 100) : 0 })).sort((a, b) => b.ms - a.ms);
}

export function dayReport(s: State, date: string) {
  const list = sessionsOn(s.sessions, date);
  const totalMs = list.reduce((a, x) => a + x.ms, 0);
  const tasks = s.tasks.filter((x) => x.date === date);
  const tasksDone = tasks.filter((x) => x.done).length;
  const habitsDone = s.habits.filter((h) => h.log.includes(date)).length;
  const mood = s.days.find((d) => d.date === date)?.mood;
  const goalMs = Math.max(1, s.settings.focusGoal) * 60000;
  const goalPct = Math.min(100, Math.round((totalMs / goalMs) * 100));
  const parts = [goalPct];
  if (tasks.length) parts.push((tasksDone / tasks.length) * 100);
  if (s.habits.length) parts.push((habitsDone / s.habits.length) * 100);
  const score = Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
  return {
    date, list, totalMs, activities: byActivity(list), goalPct, score,
    tasksDone, tasksTotal: tasks.length, habitsDone, habitsTotal: s.habits.length, mood,
  };
}

/** Tracked time for the `n` days ending at `end` (oldest first). */
export function lastDays(s: State, end: string, n = 7) {
  const out: { date: string; ms: number }[] = [];
  const base = new Date(`${end}T12:00:00`);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base); d.setDate(base.getDate() - i);
    const k = todayKey(d);
    out.push({ date: k, ms: s.sessions.filter((x) => x.date === k).reduce((a, x) => a + x.ms, 0) });
  }
  return out;
}
