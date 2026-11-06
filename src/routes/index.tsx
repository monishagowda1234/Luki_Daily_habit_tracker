import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, Check, MessageCircle } from "lucide-react";
import { AppShell, LukiFace } from "@/components/AppShell";
import { useStore, todayKey, uid } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Luki — Today" },
      { name: "description", content: "Your day with Luki: tasks, habits and progress at a glance." },
      { property: "og:title", content: "Luki — Today" },
      { property: "og:description", content: "Your day with Luki: tasks, habits and progress at a glance." },
    ],
  }),
  component: Today,
});

function Today() {
  const { s, update } = useStore();
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const t = todayKey();
  const tasks = s.tasks.filter((x) => x.date === t).sort((a, b) => (a.time || "99").localeCompare(b.time || "99"));
  const habitsDone = s.habits.filter((h) => h.log.includes(t)).length;
  const total = tasks.length + s.habits.length;
  const done = tasks.filter((x) => x.done).length + habitsDone;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const add = () => {
    if (!title.trim()) return;
    update((st) => ({ ...st, tasks: [...st.tasks, { id: uid(), title: title.trim(), time: time || undefined, done: false, date: t }] }));
    setTitle(""); setTime("");
  };

  return (
    <AppShell>
      <section className="px-5 pt-8">
        <div className="glass flex items-center gap-4 p-5">
          <LukiFace size={92} />
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">{greet}{s.settings.name ? `, ${s.settings.name}` : ""} 💗</p>
            <h1 className="text-2xl font-semibold leading-tight">Let's make today lovely</h1>
            <Link to="/luki" className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
              <MessageCircle className="h-3.5 w-3.5" /> Talk to Luki
            </Link>
          </div>
        </div>

        <div className="glass mt-4 flex items-center gap-5 p-5">
          <div className="relative h-20 w-20">
            <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-muted" strokeWidth="4" />
              <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-primary transition-all duration-700" strokeWidth="4"
                strokeLinecap="round" strokeDasharray={`${pct * 0.974} 100`} />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-display text-lg font-semibold">{pct}%</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Today's progress</h2>
            <p className="text-sm text-muted-foreground">{done} of {total} done · {habitsDone}/{s.habits.length} habits</p>
          </div>
        </div>

        <h2 className="mt-6 mb-2 text-xl font-semibold">Today's plan</h2>
        <div className="glass flex gap-2 p-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Add something to do…" className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground" />
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-24 rounded-xl bg-secondary px-2 text-xs" />
          <button onClick={add} aria-label="Add task" className="rounded-xl bg-primary p-2.5 text-primary-foreground"><Plus className="h-4 w-4" /></button>
        </div>
        <ul className="mt-3 space-y-2">
          {tasks.length === 0 && <li className="text-center text-sm text-muted-foreground py-4">No tasks yet — add one or ask Luki to plan your day.</li>}
          {tasks.map((x) => (
            <li key={x.id} className="glass flex items-center gap-3 p-3">
              <button aria-label="Toggle done" onClick={() => update((st) => ({ ...st, tasks: st.tasks.map((y) => y.id === x.id ? { ...y, done: !y.done } : y) }))}
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-primary ${x.done ? "bg-primary text-primary-foreground" : ""}`}>
                {x.done && <Check className="h-4 w-4" />}
              </button>
              <div className="flex-1">
                <p className={`text-sm font-semibold ${x.done ? "line-through text-muted-foreground" : ""}`}>{x.title}</p>
                {x.time && <p className="text-xs text-muted-foreground">{x.time}</p>}
              </div>
              <button aria-label="Remove task" onClick={() => update((st) => ({ ...st, tasks: st.tasks.filter((y) => y.id !== x.id) }))} className="text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>

        <h2 className="mt-6 mb-2 text-xl font-semibold">Habits</h2>
        <div className="grid grid-cols-3 gap-2">
          {s.habits.map((h) => {
            const on = h.log.includes(t);
            return (
              <button key={h.id} onClick={() => update((st) => ({ ...st, habits: st.habits.map((y) => y.id === h.id ? { ...y, log: on ? y.log.filter((d) => d !== t) : [...y.log, t] } : y) }))}
                className={`glass flex flex-col items-center gap-1 p-3 text-xs font-semibold transition-all ${on ? "bg-primary text-primary-foreground" : ""}`}>
                <span className="text-2xl">{h.emoji}</span>{h.name}
              </button>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}
