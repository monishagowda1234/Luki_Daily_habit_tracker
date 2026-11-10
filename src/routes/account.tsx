import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, LogOut, Trash2, Phone, Clock, Target } from "lucide-react";
import { toast } from "sonner";
import { AppShell, Header, LukiFace } from "@/components/AppShell";
import { useStore, getState, resetAll, todayKey } from "@/lib/store";
import { fmtDur } from "@/lib/report";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "My Account — Luki" },
      { name: "description", content: "Your Luki profile: name, phone number, call times, daily goal and your data." },
      { property: "og:title", content: "My Account — Luki" },
      { property: "og:description", content: "Your Luki profile: name, phone number, call times, daily goal and your data." },
    ],
  }),
  component: Account,
});

function bestStreak(logs: string[][]) {
  const all = new Set(logs.flat()); let best = 0;
  for (const d of all) {
    const prev = new Date(`${d}T12:00:00`); prev.setDate(prev.getDate() - 1);
    if (all.has(todayKey(prev))) continue;
    let n = 0; const c = new Date(`${d}T12:00:00`);
    while (all.has(todayKey(c))) { n++; c.setDate(c.getDate() + 1); }
    best = Math.max(best, n);
  }
  return best;
}

function Account() {
  const { s, ready, update } = useStore();
  const nav = useNavigate();
  const [f, setF] = useState(s.settings);
  useEffect(() => { if (ready) setF(getState().settings); }, [ready]);
  const dirty = JSON.stringify(f) !== JSON.stringify(s.settings);
  const totalMs = s.sessions.reduce((a, x) => a + x.ms, 0);
  const joined = s.settings.joined || todayKey();

  const save = () => {
    if (!f.name.trim()) { toast.error("Please add your name 💗"); return; }
    const phone = f.phone.replace(/[\s-]/g, "");
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) { toast.error("Use a full mobile number like +919876543210"); return; }
    const goal = Math.min(960, Math.max(10, Math.round(f.focusGoal || 0)));
    update((st) => ({ ...st, settings: { ...f, name: f.name.trim(), phone, focusGoal: goal, joined } }));
    toast.success("Profile saved 💗");
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(getState(), null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `luki-data-${todayKey()}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const signOut = () => {
    update((st) => ({ ...st, settings: { ...st.settings, phone: "" } }));
    void nav({ to: "/login", replace: true });
  };

  const wipe = () => {
    if (!window.confirm("Delete all your tasks, habits, dreams, reports and chats from this phone? This can't be undone.")) return;
    resetAll();
    void nav({ to: "/login", replace: true });
  };

  return (
    <AppShell>
      <Header title="My account" />
      <div className="space-y-4 px-5">
        <div className="glass flex items-center gap-4 p-5">
          <LukiFace size={80} />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-2xl font-semibold">{s.settings.name || "Friend"}</h2>
            <p className="flex items-center gap-1 text-sm text-muted-foreground"><Phone className="h-3.5 w-3.5" /> {s.settings.phone || "No number"}</p>
            <p className="text-xs text-muted-foreground">With Luki since {new Date(`${joined}T12:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            ["Tracked", fmtDur(totalMs)],
            ["Sessions", String(s.sessions.length)],
            ["Best streak", `🔥 ${bestStreak(s.habits.map((h) => h.log))}`],
            ["Habits", String(s.habits.length)],
            ["Dreams", String(s.dreams.length)],
            ["Days logged", String(s.days.length)],
          ].map(([l, v]) => (
            <div key={l} className="glass px-2 py-3">
              <p className="font-display text-xl font-semibold">{v}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{l}</p>
            </div>
          ))}
        </div>

        <div className="glass space-y-3 p-5">
          <h2 className="font-semibold">Profile</h2>
          <label className="block text-sm font-semibold">Name
            <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="mt-1 w-full rounded-xl bg-secondary p-3 outline-none" />
          </label>
          <label className="block text-sm font-semibold">Mobile number (for Luki's calls)
            <input type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="+919876543210" className="mt-1 w-full rounded-xl bg-secondary p-3 outline-none" />
          </label>
          <div className="flex gap-3">
            <label className="flex-1 text-sm font-semibold"><span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Wake-up call</span>
              <input type="time" value={f.wake} onChange={(e) => setF({ ...f, wake: e.target.value })} className="mt-1 w-full rounded-xl bg-secondary p-3" />
            </label>
            <label className="flex-1 text-sm font-semibold"><span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Night call</span>
              <input type="time" value={f.sleep} onChange={(e) => setF({ ...f, sleep: e.target.value })} className="mt-1 w-full rounded-xl bg-secondary p-3" />
            </label>
          </div>
          <label className="block text-sm font-semibold"><span className="flex items-center gap-1"><Target className="h-3.5 w-3.5" /> Daily activity goal: {fmtDur((f.focusGoal || 0) * 60000)}</span>
            <input type="range" min={15} max={600} step={15} value={f.focusGoal} onChange={(e) => setF({ ...f, focusGoal: Number(e.target.value) })} className="mt-2 w-full accent-primary" />
          </label>
          <button onClick={save} disabled={!dirty} className="w-full rounded-2xl bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50">
            {dirty ? "Save changes" : "All saved 💗"}
          </button>
        </div>

        <div className="glass divide-y divide-border p-2">
          <button onClick={exportData} className="flex w-full items-center gap-3 p-3 text-sm font-semibold"><Download className="h-4 w-4 text-primary" /> Download my data</button>
          <button onClick={signOut} className="flex w-full items-center gap-3 p-3 text-sm font-semibold"><LogOut className="h-4 w-4 text-primary" /> Sign out</button>
          <button onClick={wipe} className="flex w-full items-center gap-3 p-3 text-sm font-semibold text-destructive"><Trash2 className="h-4 w-4" /> Delete all my data</button>
        </div>
        <p className="pb-2 text-center text-[11px] text-muted-foreground">Your data is saved on this phone only.</p>
      </div>
    </AppShell>
  );
}
