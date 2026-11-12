import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { ChevronLeft, ChevronRight, Trash2, Plus, Sparkles, Timer } from "lucide-react";
import { AppShell, Header } from "@/components/AppShell";
import { HeatMap } from "@/components/HeatMap";
import { useStore, todayKey, uid, getState } from "@/lib/store";
import { dayReport, fmtDur, lastDays } from "@/lib/report";
import { askLuki } from "@/lib/luki.functions";

export const Route = createFileRoute("/_authenticated/report")({
  head: () => ({
    meta: [
      { title: "Daily Report — Luki" },
      { name: "description", content: "See where your time went today, your tasks, habits and mood, with a report from Luki." },
      { property: "og:title", content: "Daily Report — Luki" },
      { property: "og:description", content: "See where your time went today, your tasks, habits and mood, with a report from Luki." },
    ],
  }),
  component: Report,
});

const MOODS = ["😢", "😕", "😐", "🙂", "🥰"];
const shift = (date: string, n: number) => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() + n); return todayKey(d); };
const hm = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function Report() {
  const { s, update } = useStore();
  const [date, setDate] = useState(todayKey());
  const [aiText, setAiText] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [act, setAct] = useState("");
  const [mins, setMins] = useState("");
  const [at, setAt] = useState("");
  const r = dayReport(s, date);
  const week = lastDays(s, date, 7);
  const weekMax = Math.max(s.settings.focusGoal * 60000, ...week.map((d) => d.ms), 1);
  const weekTotal = week.reduce((a, d) => a + d.ms, 0);
  const isToday = date === todayKey();
  const label = isToday ? "Today" : date === shift(todayKey(), -1) ? "Yesterday" : new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

  const addManual = () => {
    const m = Number(mins);
    if (!act.trim() || !(m > 0 && m <= 1440)) return;
    const start = new Date(`${date}T${at || new Date().toTimeString().slice(0, 5)}:00`).getTime();
    update((st) => ({ ...st, sessions: [...st.sessions, { id: uid(), activity: act.trim(), date, startedAt: start, ms: Math.round(m * 60000), kind: "manual" }] }));
    setAct(""); setMins(""); setAt("");
  };

  const askReport = async () => {
    setBusy(true);
    const st = getState();
    const tasks = st.tasks.filter((x) => x.date === date).map((x) => `${x.done ? "done" : "not done"}: ${x.title}`).join("; ") || "none";
    const ctx = `User: ${st.settings.name || "friend"}. Report date: ${date}.
Tracked time: ${fmtDur(r.totalMs)} of a ${st.settings.focusGoal} min daily goal (${r.goalPct}%).
Activities: ${r.activities.map((a) => `${a.activity} ${fmtDur(a.ms)}`).join(", ") || "none"}.
Timeline: ${r.list.map((x) => `${hm(x.startedAt)} ${x.activity} ${fmtDur(x.ms)}`).join(", ") || "none"}.
Tasks: ${tasks}. Habits done: ${r.habitsDone}/${r.habitsTotal}. Mood: ${r.mood !== undefined ? MOODS[r.mood] : "not recorded"}.
Last 7 days tracked: ${week.map((d) => `${d.date} ${fmtDur(d.ms)}`).join(", ")}.`;
    try {
      const res = await askLuki({ data: { context: ctx, messages: [{ role: "user", content: "Write my daily activity report in under 140 words using markdown: a one-line summary, 2-3 short bullet highlights about where my time went, one thing to improve, and one cute encouraging line. Do not add or change any tasks." }] } });
      setAiText((p) => ({ ...p, [date]: res.text }));
    } catch {
      setAiText((p) => ({ ...p, [date]: "Oops, I couldn't write your report right now. Try again? 🥺" }));
    } finally { setBusy(false); }
  };

  return (
    <AppShell>
      <Header title="Daily report" sub="Where your time went and how your day went." />
      <div className="space-y-4 px-5">
        <div className="glass flex items-center justify-between p-2">
          <button aria-label="Previous day" onClick={() => setDate(shift(date, -1))} className="rounded-xl bg-secondary p-2"><ChevronLeft className="h-4 w-4" /></button>
          <span className="font-display text-lg font-semibold">{label}</span>
          <button aria-label="Next day" disabled={isToday} onClick={() => setDate(shift(date, 1))} className="rounded-xl bg-secondary p-2 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
        </div>

        <div className="glass flex items-center gap-5 p-5">
          <div className="relative h-24 w-24 shrink-0">
            <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-muted" strokeWidth="4" />
              <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-primary transition-all duration-700" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${r.score * 0.974} 100`} />
            </svg>
            <span className="absolute inset-0 flex flex-col items-center justify-center"><b className="font-display text-2xl">{r.score}</b><span className="text-[10px] text-muted-foreground">day score</span></span>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-2 text-center">
            <Stat label="Tracked" value={fmtDur(r.totalMs)} sub={`${r.goalPct}% of goal`} />
            <Stat label="Tasks" value={`${r.tasksDone}/${r.tasksTotal}`} />
            <Stat label="Habits" value={`${r.habitsDone}/${r.habitsTotal}`} />
            <Stat label="Mood" value={r.mood !== undefined ? MOODS[r.mood] ?? "—" : "—"} />
          </div>
        </div>

        <div className="glass p-4">
          <h2 className="mb-3 font-semibold">Where your time went</h2>
          {r.activities.length === 0 ? (
            <div className="py-2 text-center text-sm text-muted-foreground">
              Nothing tracked {isToday ? "yet today" : "this day"}.
              {isToday && <Link to="/timer" className="mt-2 flex items-center justify-center gap-1 font-bold text-primary"><Timer className="h-4 w-4" /> Start the timer</Link>}
            </div>
          ) : (
            <div className="space-y-2.5">
              {r.activities.map((a) => (
                <div key={a.activity}>
                  <div className="mb-1 flex justify-between text-sm"><span className="font-semibold">{a.activity} <span className="text-xs text-muted-foreground">×{a.count}</span></span><span className="font-bold">{fmtDur(a.ms)} · {a.pct}%</span></div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(3, a.pct)}%` }} /></div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Luki's report</h2>
            <button onClick={askReport} disabled={busy} className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-60">
              <Sparkles className="h-3.5 w-3.5" /> {busy ? "Writing…" : aiText[date] ? "Rewrite" : "Write my report"}
            </button>
          </div>
          {aiText[date] ? (
            <div className="prose prose-sm max-w-none text-sm text-foreground [&_ul]:list-disc [&_ul]:pl-5"><ReactMarkdown>{aiText[date]}</ReactMarkdown></div>
          ) : <p className="text-sm text-muted-foreground">Luki will read your day and write a short summary with tips.</p>}
        </div>

        <div className="glass p-4">
          <h2 className="mb-2 font-semibold">Timeline</h2>
          {r.list.length === 0 && <p className="text-sm text-muted-foreground">No activities logged.</p>}
          <ul className="space-y-1.5">
            {r.list.map((x) => (
              <li key={x.id} className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-sm">
                <span className="w-24 shrink-0 text-xs text-muted-foreground">{hm(x.startedAt)}–{hm(x.startedAt + x.ms)}</span>
                <span className="flex-1 truncate font-semibold">{x.activity}{x.kind === "manual" && <span className="ml-1 text-[10px] text-muted-foreground">added</span>}</span>
                <span className="font-bold">{fmtDur(x.ms)}</span>
                <button aria-label={`Remove ${x.activity}`} onClick={() => update((st) => ({ ...st, sessions: st.sessions.filter((y) => y.id !== x.id) }))} className="text-muted-foreground"><Trash2 className="h-3.5 w-3.5" /></button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-1.5">
            <input value={act} onChange={(e) => setAct(e.target.value)} placeholder="Activity" className="min-w-0 flex-1 rounded-xl bg-secondary px-3 py-2 text-sm outline-none" />
            <input value={mins} onChange={(e) => setMins(e.target.value)} type="number" min={1} inputMode="numeric" placeholder="min" aria-label="Minutes" className="w-16 rounded-xl bg-secondary px-2 py-2 text-sm outline-none" />
            <input value={at} onChange={(e) => setAt(e.target.value)} type="time" aria-label="Start time" className="w-[5.5rem] rounded-xl bg-secondary px-1 text-xs" />
            <button onClick={addManual} aria-label="Log activity" className="rounded-xl bg-primary p-2.5 text-primary-foreground"><Plus className="h-4 w-4" /></button>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Forgot the timer? Log an activity by hand.</p>
        </div>

        <div className="glass p-4">
          <div className="mb-3 flex justify-between"><h2 className="font-semibold">Last 7 days</h2><span className="text-sm font-bold">{fmtDur(weekTotal)}</span></div>
          <div className="relative flex h-32 items-end gap-2">
            <div className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-primary/40" style={{ bottom: `${(s.settings.focusGoal * 60000 / weekMax) * 100}%` }} />
            {week.map((d) => (
              <button key={d.date} onClick={() => setDate(d.date)} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <div className={`w-full rounded-t-lg ${d.date === date ? "bg-primary" : "bg-heat-2"}`} style={{ height: `${Math.max(3, (d.ms / weekMax) * 100)}%` }} />
                <span className={`text-[10px] font-semibold ${d.date === date ? "text-primary" : "text-muted-foreground"}`}>{new Date(`${d.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "narrow" })}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">Dashed line = your daily goal of {fmtDur(s.settings.focusGoal * 60000)}.</p>
        </div>

        <div className="glass p-4">
          <h2 className="mb-3 font-semibold">Activity map</h2>
          <HeatMap value={(d) => { const ms = s.sessions.filter((x) => x.date === d).reduce((a, x) => a + x.ms, 0); return ms ? Math.min(4, Math.ceil((ms / (s.settings.focusGoal * 60000)) * 4)) : 0; }} />
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-secondary px-2 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-display text-lg font-semibold leading-tight">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
