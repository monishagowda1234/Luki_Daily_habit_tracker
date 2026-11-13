import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Phone, MessageSquare, Sun, Moon, Timer, Settings2 } from "lucide-react";
import { AppShell, LukiFace } from "@/components/AppShell";
import { useStore, getState, update, todayKey, uid } from "@/lib/store";
import { askLuki } from "@/lib/luki.functions";
import { ringMyPhone, textMe } from "@/lib/phone.functions";
import { askNotify, clock, elapsedOf, isActive, remainingOf, startTimer, useNow } from "@/lib/timer";

export const Route = createFileRoute("/_authenticated/luki")({
  head: () => ({
    meta: [
      { title: "Luki — Your AI Assistant" },
      { name: "description", content: "Chat with Luki, your personal AI assistant for planning, focus and good days." },
      { property: "og:title", content: "Luki — Your AI Assistant" },
      { property: "og:description", content: "Chat with Luki, your personal AI assistant for planning, focus and good days." },
    ],
  }),
  component: LukiPage,
});

function buildContext() {
  const s = getState(); const t = todayKey();
  const tasks = s.tasks.filter((x) => x.date === t).map((x) => `- [${x.done ? "x" : " "}] ${x.title}${x.time ? " @ " + x.time : ""}`).join("\n") || "none";
  const habits = s.habits.map((h) => `${h.name}: ${h.log.includes(t) ? "done" : "not yet"}`).join(", ");
  return `User name: ${s.settings.name || "friend"}. Now: ${new Date().toString()}.\nToday's tasks:\n${tasks}\nHabits: ${habits}\nDreams: ${s.dreams.map((d) => d.title).join("; ") || "none"}`;
}

function applyActions(text: string) {
  const t = todayKey();
  for (const m of text.matchAll(/\[\[(ADD|REMOVE|DONE):\s*([^\]@]+?)(?:\s*@\s*([0-9:]+))?\s*\]\]/g)) {
    const op = m[1]; const title = m[2] ?? ""; const time = m[3]; const low = title.trim().toLowerCase();
    update((st) => {
      if (op === "ADD") return { ...st, tasks: [...st.tasks, { id: uid(), title: title.trim(), time, done: false, date: t }] };
      if (op === "REMOVE") return { ...st, tasks: st.tasks.filter((x) => !(x.date === t && x.title.toLowerCase().includes(low))) };
      return { ...st, tasks: st.tasks.map((x) => x.date === t && x.title.toLowerCase().includes(low) ? { ...x, done: true } : x) };
    });
  }
  return text.replace(/\[\[(ADD|REMOVE|DONE):\s*([^\]]+)\]\]/g, (_, op, v) => `✅ *${op === "ADD" ? "Added" : op === "REMOVE" ? "Removed" : "Done"}: ${v.trim()}*`);
}

function LukiPage() {
  const { s } = useStore();
  const nav = useNavigate();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const ta = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [s.chat.length, busy]);
  useEffect(() => { ta.current?.focus(); }, [busy]);
  const timerOn = isActive(s.timer);
  const now = useNow(s.timer.runningSince !== null, 500);

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    const msgs = [...getState().chat, { role: "user" as const, content: text.trim() }];
    update((st) => ({ ...st, chat: msgs })); setInput(""); setBusy(true);
    try {
      const r = await askLuki({ data: { messages: msgs.slice(-30), context: buildContext() } });
      const reply = applyActions(r.text);
      update((st) => ({ ...st, chat: [...st.chat, { role: "assistant", content: reply }] }));
      return reply;
    } catch {
      update((st) => ({ ...st, chat: [...st.chat, { role: "assistant", content: "Oops, I couldn't reach my brain. Try again? 🥺" }] }));
      return undefined;
    } finally { setBusy(false); }
  };

  const contact = async (kind: "sms" | "call", prompt: string) => {
    if (!s.settings.phone) { setShowSettings(true); setNote("Add your phone number first."); return; }
    setNote(kind === "call" ? "Luki is preparing your call…" : "Luki is writing your message…");
    const reply = await send(prompt);
    if (!reply) return;
    const plain = reply.replace(/[*_#`>✅]/g, "").slice(0, 1100);
    const r: { ok: boolean; error?: string } = await (kind === "call"
      ? ringMyPhone({ data: { mode: prompt === night ? "night" : prompt === morning ? "morning" : "plan", today: todayKey(), localTime: new Date().toString().slice(0, 80) } })
      : textMe({ data: { message: plain } })
    ).catch((e: unknown) => ({ ok: false, error: e instanceof Error ? e.message : String(e) }));
    setNote(r.ok ? (kind === "call" ? "Calling you now 📞" : "Message sent 💌") : `Couldn't reach your phone: ${r.error ?? ""}`);
  };

  const morning = "Give me my morning briefing: greet me, list today's tasks with times, one habit tip and a motivating line. Keep it under 80 words so it can be spoken.";
  const night = "Give me my night summary: what I finished today, what's left, and ask what I want to do tomorrow. Under 80 words so it can be spoken.";

  // In-app reminder: when the app is open at wake/sleep time, Luki checks in.
  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date().toTimeString().slice(0, 5); const st = getState();
      const k = `luki-fired-${todayKey()}-${now}`;
      if ((now === st.settings.wake || now === st.settings.sleep) && st.settings.phone && !localStorage.getItem(k)) {
        localStorage.setItem(k, "1"); void contact("call", now === st.settings.wake ? morning : night);
      }
    }, 30000);
    return () => clearInterval(id);
  }); 

  return (
    <AppShell>
      <div className="flex flex-col items-center px-5 pt-6">
        <LukiFace size={130} talking={busy} />
        <h1 className="mt-2 text-2xl font-semibold">Luki</h1>
        <p className="text-xs text-muted-foreground">{busy ? "thinking…" : timerOn ? `${s.timer.activity || "Focus"}: ${clock(s.timer.mode === "timer" ? remainingOf(s.timer, now) : elapsedOf(s.timer, now))}` : "your personal assistant"}</p>
      </div>

      <div className="mt-4 grid grid-cols-5 gap-2 px-5">
        {[
          { icon: Sun, label: "Morning", fn: () => contact("call", morning) },
          { icon: Moon, label: "Night", fn: () => contact("call", night) },
          { icon: MessageSquare, label: "Text me", fn: () => contact("sms", "Write a short SMS with my tasks for today. Under 50 words.") },
          { icon: Timer, label: timerOn ? "Timer" : "Focus", fn: () => { if (timerOn) void nav({ to: "/timer" }); else { askNotify(); startTimer({ mode: "timer", activity: "Focus", duration: 25 * 60_000 }); void send("I'm starting a 25 minute focus/study session. Give me one quick tip to stay focused."); } } },
          { icon: Settings2, label: "Setup", fn: () => setShowSettings((v) => !v) },
        ].map(({ icon: I, label, fn }) => (
          <button key={label} onClick={fn} className="glass flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold"><I className="h-5 w-5 text-primary" />{label}</button>
        ))}
      </div>
      {note && <p className="mx-5 mt-3 rounded-2xl bg-secondary p-2 text-center text-xs font-semibold">{note}</p>}

      {showSettings && (
        <div className="glass mx-5 mt-3 space-y-2 p-4 text-sm">
          {([["name", "Your name", "text"], ["wake", "Wake-up call", "time"], ["sleep", "Night call", "time"]] as const).map(([k, l, type]) => (
            <label key={k} className="flex items-center justify-between gap-2"><span className="font-semibold">{l}</span>
              <input type={type} value={s.settings[k]} onChange={(e) => update((st) => ({ ...st, settings: { ...st.settings, [k]: e.target.value } }))} className="w-40 rounded-xl bg-secondary px-2 py-1.5" />
            </label>
          ))}
          <p className="text-xs text-muted-foreground">Luki calls you at these times while the app is open.</p>
        </div>
      )}

      <div className="mt-4 space-y-3 px-5">
        {s.chat.length === 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {["Plan my day", "Add 'Gym at 18:00'", "Help me study for exams", "I feel unmotivated"].map((q) => (
              <button key={q} onClick={() => send(q)} className="glass px-3 py-2 text-xs font-semibold">{q}</button>
            ))}
          </div>
        )}
        {s.chat.map((m, i) => m.role === "user" ? (
          <div key={i} className="ml-auto max-w-[80%] rounded-3xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground">{m.content}</div>
        ) : (
          <div key={i} className="prose prose-sm max-w-[90%] text-sm text-foreground [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:my-1"><ReactMarkdown>{m.content}</ReactMarkdown></div>
        ))}
        {busy && <div className="flex gap-1 px-1">{[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: `${i * 0.15}s` }} />)}</div>}
        {s.chat.length > 0 && <button onClick={() => update((st) => ({ ...st, chat: [] }))} className="mx-auto block text-xs text-muted-foreground underline">New conversation</button>}
        <div ref={end} />
      </div>

      <div className="fixed inset-x-0 bottom-24 z-40 mx-auto max-w-md px-3">
        <div className="glass flex items-end gap-2 p-2">
          <textarea ref={ta} rows={1} value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); } }}
            placeholder="Ask Luki anything…" className="max-h-28 min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none" />
          <button onClick={() => send(input)} disabled={busy} aria-label="Send" className="rounded-2xl bg-primary p-2.5 text-primary-foreground disabled:opacity-50"><Send className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="h-20" />
      <span className="hidden"><Phone /></span>
    </AppShell>
  );
}
