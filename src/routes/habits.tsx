import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { AppShell, Header } from "@/components/AppShell";
import { HeatMap } from "@/components/HeatMap";
import { useStore, uid } from "@/lib/store";

export const Route = createFileRoute("/habits")({
  head: () => ({
    meta: [
      { title: "Habit Map — Luki" },
      { name: "description", content: "See your daily habits and work tracked on a colorful map." },
      { property: "og:title", content: "Habit Map — Luki" },
      { property: "og:description", content: "See your daily habits and work tracked on a colorful map." },
    ],
  }),
  component: Habits,
});

const SUGGEST = [
  { name: "Meditate 5 min", emoji: "🧘‍♀️" }, { name: "Journal", emoji: "✍️" }, { name: "Sleep by 11", emoji: "🌙" },
  { name: "Study 1 hour", emoji: "📚" }, { name: "Walk 5k steps", emoji: "🚶‍♀️" }, { name: "No sugar", emoji: "🍓" },
];

function Habits() {
  const { s, update } = useStore();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🌸");
  const addHabit = (n: string, e: string) => update((st) => ({ ...st, habits: [...st.habits, { id: uid(), name: n, emoji: e, log: [] }] }));
  const workCount = (d: string) => {
    const h = s.habits.filter((x) => x.log.includes(d)).length;
    const t = s.tasks.filter((x) => x.date === d && x.done).length;
    return Math.ceil(((h + t) / Math.max(1, s.habits.length)) * 4);
  };
  const streak = (log: string[]) => { let n = 0; const d = new Date(); while (log.includes(d.toISOString().slice(0, 10))) { n++; d.setDate(d.getDate() - 1); } return n; };

  return (
    <AppShell>
      <Header title="Habit map" sub="Every square is a day. Pinker means more done." />
      <div className="space-y-4 px-5">
        <div className="glass p-4">
          <h2 className="mb-3 font-semibold">All work & habits</h2>
          <HeatMap value={workCount} />
        </div>
        {s.habits.map((h) => (
          <div key={h.id} className="glass p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xl">{h.emoji}</span>
              <h3 className="flex-1 font-semibold">{h.name}</h3>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-bold">🔥 {streak(h.log)}</span>
              <button aria-label="Delete habit" onClick={() => update((st) => ({ ...st, habits: st.habits.filter((x) => x.id !== h.id) }))} className="text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
            </div>
            <HeatMap value={(d) => (h.log.includes(d) ? 3 : 0)} />
          </div>
        ))}
        <div className="glass flex gap-2 p-2">
          <input value={emoji} onChange={(e) => setEmoji(e.target.value)} className="w-12 rounded-xl bg-secondary text-center" aria-label="Emoji" />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New habit…" className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none" />
          <button aria-label="Add habit" onClick={() => { if (name.trim()) { addHabit(name.trim(), emoji || "🌸"); setName(""); } }} className="rounded-xl bg-primary p-2.5 text-primary-foreground"><Plus className="h-4 w-4" /></button>
        </div>
        <div>
          <h2 className="mb-2 font-semibold">Luki suggests</h2>
          <div className="flex flex-wrap gap-2">
            {SUGGEST.filter((x) => !s.habits.some((h) => h.name === x.name)).map((x) => (
              <button key={x.name} onClick={() => addHabit(x.name, x.emoji)} className="glass px-3 py-2 text-xs font-semibold">{x.emoji} {x.name} +</button>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
