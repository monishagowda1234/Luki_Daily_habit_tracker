import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Play, Pause, RotateCcw, Check, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, Header } from "@/components/AppShell";
import { useStore, todayKey } from "@/lib/store";
import { askNotify, clock, elapsedOf, finishTimer, isActive, pauseTimer, remainingOf, resetTimer, setTimer, startTimer, useNow } from "@/lib/timer";
import { fmtDur, sessionsOn } from "@/lib/report";

export const Route = createFileRoute("/timer")({
  head: () => ({
    meta: [
      { title: "Timer — Luki" },
      { name: "description", content: "Countdown timer and stopwatch that tracks the time you spend on each activity." },
      { property: "og:title", content: "Timer — Luki" },
      { property: "og:description", content: "Countdown timer and stopwatch that tracks the time you spend on each activity." },
    ],
  }),
  component: TimerPage,
});

const ACTIVITIES = ["Focus", "Study", "Work", "Reading", "Exercise", "Meditate", "Chores", "Break"];
const PRESETS = [5, 10, 15, 25, 45, 60];

function TimerPage() {
  const { s } = useStore();
  const t = s.timer;
  const active = isActive(t);
  const running = t.runningSince !== null;
  const now = useNow(running);
  const [custom, setCustom] = useState("");
  const elapsed = elapsedOf(t, now);
  const shown = t.mode === "timer" ? remainingOf(t, now) : elapsed;
  const frac = t.mode === "timer" ? (t.duration ? elapsed / t.duration : 0) : (elapsed % 60000) / 60000;
  const today = sessionsOn(s.sessions, todayKey());
  const todayTotal = today.reduce((a, x) => a + x.ms, 0);
  const recent = [...new Set([...s.sessions].reverse().map((x) => x.activity))].filter((a) => !ACTIVITIES.includes(a)).slice(0, 4);

  const save = () => {
    const r = finishTimer();
    if (r) toast.success("Saved 💗", { description: `${r.activity} · ${fmtDur(r.ms)}` });
    else toast("Too short to save — under 5 seconds.");
  };

  return (
    <AppShell>
      <Header title="Timer" sub="Keeps running even when you switch pages." />
      <div className="space-y-4 px-5">
        <div className="glass flex p-1">
          {(["timer", "stopwatch"] as const).map((m) => (
            <button key={m} disabled={active} onClick={() => setTimer({ mode: m })}
              className={`flex-1 rounded-2xl py-2 text-sm font-bold capitalize transition-all disabled:opacity-60 ${t.mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              {m === "timer" ? "Countdown" : "Stopwatch"}
            </button>
          ))}
        </div>

        <div className="glass p-4">
          <label className="text-sm font-semibold">What are you doing?
            <input value={t.activity} onChange={(e) => setTimer({ activity: e.target.value })} placeholder="e.g. Study maths"
              className="mt-1 w-full rounded-xl bg-secondary p-3 text-sm outline-none" />
          </label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[...ACTIVITIES, ...recent].map((a) => (
              <button key={a} onClick={() => setTimer({ activity: a })}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${t.activity === a ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{a}</button>
            ))}
          </div>
        </div>

        <div className="glass flex flex-col items-center p-6">
          <div className="relative h-56 w-56">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle cx="50" cy="50" r="44" fill="none" className="stroke-muted" strokeWidth="6" />
              <circle cx="50" cy="50" r="44" fill="none" className="stroke-primary transition-[stroke-dasharray] duration-300" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={`${Math.min(1, frac) * 276.5} 276.5`} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-5xl font-semibold tabular-nums" aria-live="polite">{clock(shown)}</span>
              <span className="mt-1 text-xs font-semibold text-muted-foreground">
                {running ? `${t.activity || "Focus"} · running` : active ? "paused" : t.mode === "timer" ? `${Math.round(t.duration / 60000)} min` : "ready"}
              </span>
            </div>
          </div>

          {t.mode === "timer" && !active && (
            <div className="mt-4 w-full">
              <div className="grid grid-cols-6 gap-1.5">
                {PRESETS.map((m) => (
                  <button key={m} onClick={() => setTimer({ duration: m * 60000 })}
                    className={`rounded-xl py-2 text-xs font-bold ${t.duration === m * 60000 ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{m}m</button>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input type="number" min={1} max={600} inputMode="numeric" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Custom minutes"
                  className="min-w-0 flex-1 rounded-xl bg-secondary px-3 py-2 text-sm outline-none" />
                <button onClick={() => { const m = Number(custom); if (m >= 1 && m <= 600) { setTimer({ duration: Math.round(m * 60000) }); setCustom(""); } }}
                  className="rounded-xl bg-secondary px-3 text-xs font-bold">Set</button>
              </div>
            </div>
          )}

          <div className="mt-5 flex w-full gap-2">
            <button onClick={resetTimer} disabled={!active} aria-label="Reset"
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary disabled:opacity-40"><RotateCcw className="h-5 w-5" /></button>
            <button onClick={() => { if (running) pauseTimer(); else { askNotify(); startTimer(); } }}
              className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary text-base font-bold text-primary-foreground">
              {running ? <><Pause className="h-5 w-5" /> Pause</> : <><Play className="h-5 w-5" /> {active ? "Resume" : "Start"}</>}
            </button>
            <button onClick={save} disabled={!active} aria-label="Stop and save"
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary disabled:opacity-40"><Check className="h-5 w-5" /></button>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">✓ stops and saves the time to your daily report</p>
        </div>

        <div className="glass p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Today · {fmtDur(todayTotal)}</h2>
            <Link to="/report" className="flex items-center gap-1 text-xs font-bold text-primary"><BarChart3 className="h-3.5 w-3.5" /> Report</Link>
          </div>
          {today.length === 0 && <p className="py-2 text-center text-sm text-muted-foreground">No time tracked yet today.</p>}
          <ul className="space-y-1.5">
            {[...today].reverse().map((x) => (
              <li key={x.id} className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-sm">
                <span className="flex-1 font-semibold">{x.activity}</span>
                <span className="text-xs text-muted-foreground">{new Date(x.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                <span className="w-14 text-right font-bold">{fmtDur(x.ms)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
