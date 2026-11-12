import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { AppShell, Header } from "@/components/AppShell";
import { useStore, uid, todayKey } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/dreams")({
  head: () => ({
    meta: [
      { title: "Manifest — Luki" },
      { name: "description", content: "Write your dreams, get daily affirmations and manifest the life you want." },
      { property: "og:title", content: "Manifest — Luki" },
      { property: "og:description", content: "Write your dreams, get daily affirmations and manifest the life you want." },
    ],
  }),
  component: Dreams,
});

const AFFIRM = [
  "I am becoming the person who already lives my dream.",
  "Everything I need is flowing to me with ease.",
  "I deserve good things, and I welcome them today.",
  "My small daily steps are building something beautiful.",
  "I trust the timing of my life.",
  "I am calm, focused and fully capable.",
  "Abundance, love and success find me naturally.",
];
const PROMPTS = [
  "Describe a perfect day once your dream comes true.",
  "What's one tiny step you can take toward your dream today?",
  "Write 3 things you're grateful for, as if your dream already happened.",
  "How will you feel when it's real? Feel it now for 30 seconds.",
];

function Dreams() {
  const { s, update } = useStore();
  const [title, setTitle] = useState("");
  const [why, setWhy] = useState("");
  const n = new Date().getDate();
  const aff = AFFIRM[n % AFFIRM.length];
  const prompt = PROMPTS[n % PROMPTS.length];

  return (
    <AppShell>
      <Header title="Manifest ✨" sub="Write it, feel it, live it." />
      <div className="space-y-4 px-5">
        <div className="glass bg-primary p-6 text-center text-primary-foreground">
          <p className="text-xs font-bold uppercase tracking-widest opacity-80">Today's affirmation</p>
          <p className="mt-2 font-display text-xl">“{aff}”</p>
        </div>
        <div className="glass p-4">
          <p className="text-xs font-bold uppercase text-muted-foreground">Prompt for {todayKey()}</p>
          <p className="mt-1 text-sm font-semibold">{prompt}</p>
        </div>
        <div className="glass space-y-2 p-4">
          <h2 className="font-semibold">New dream</h2>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="I am / I have…" className="w-full rounded-xl bg-secondary p-3 text-sm outline-none" />
          <textarea value={why} onChange={(e) => setWhy(e.target.value)} rows={2} placeholder="Why does it matter to you?" className="w-full rounded-xl bg-secondary p-3 text-sm outline-none" />
          <button onClick={() => { if (!title.trim()) return; update((st) => ({ ...st, dreams: [{ id: uid(), title: title.trim(), why, created: todayKey() }, ...st.dreams] })); setTitle(""); setWhy(""); }}
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground">Manifest it 🌙</button>
        </div>
        {s.dreams.map((d) => (
          <div key={d.id} className="glass flex gap-3 p-4">
            <span className="text-2xl">🌸</span>
            <div className="flex-1"><p className="font-semibold">{d.title}</p>{d.why && <p className="text-sm text-muted-foreground">{d.why}</p>}<p className="text-xs text-muted-foreground">since {d.created}</p></div>
            <button aria-label="Remove dream" onClick={() => update((st) => ({ ...st, dreams: st.dreams.filter((x) => x.id !== d.id) }))} className="text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
