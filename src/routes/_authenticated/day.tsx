import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, Header } from "@/components/AppShell";
import { HeatMap } from "@/components/HeatMap";
import { useStore, todayKey } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/day")({
  head: () => ({
    meta: [
      { title: "Mood Map — Luki" },
      { name: "description", content: "Reflect on how your day went and see your mood map over time." },
      { property: "og:title", content: "Mood Map — Luki" },
      { property: "og:description", content: "Reflect on how your day went and see your mood map over time." },
    ],
  }),
  component: Day,
});

const MOODS = ["😢", "😕", "😐", "🙂", "🥰"];

function Day() {
  const { s, update, ready } = useStore();
  const t = todayKey();
  const today = s.days.find((d) => d.date === t);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (ready) setNote(today?.note ?? ""); }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = (mood: number, n = note) => {
    update((st) => ({ ...st, days: [...st.days.filter((d) => d.date !== t), { date: t, mood, note: n }] }));
    setSaved(true); setTimeout(() => setSaved(false), 1500);
  };
  const byDate = (d: string) => s.days.find((x) => x.date === d);

  return (
    <AppShell>
      <Header title="How was your day?" sub="Your mood map, one square per day." />
      <div className="space-y-4 px-5">
        <div className="glass p-5">
          <div className="flex justify-between">
            {MOODS.map((m, i) => (
              <button key={m} onClick={() => save(i)} aria-label={`Mood ${i + 1}`}
                className={`rounded-full p-2 text-3xl transition-transform ${today?.mood === i ? "scale-125 bg-primary/20" : "opacity-70"}`}>{m}</button>
            ))}
          </div>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="What made today special? What was hard?"
            className="mt-4 w-full rounded-2xl bg-secondary p-3 text-sm outline-none" />
          <button onClick={() => save(today?.mood ?? 2)} className="mt-2 w-full rounded-2xl bg-primary py-2.5 text-sm font-bold text-primary-foreground">
            {saved ? "Saved 💗" : "Save reflection"}
          </button>
        </div>
        <div className="glass p-4">
          <h2 className="mb-3 font-semibold">Mood map</h2>
          <HeatMap value={(d) => { const x = byDate(d); return x ? x.mood : 0; }} emojiFor={(d) => byDate(d) ? MOODS[byDate(d)!.mood] : undefined} />
        </div>
        <div className="space-y-2">
          {[...s.days].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7).filter((d) => d.note).map((d) => (
            <div key={d.date} className="glass p-3 text-sm"><span className="mr-2">{MOODS[d.mood]}</span><b>{d.date}</b><p className="text-muted-foreground">{d.note}</p></div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
