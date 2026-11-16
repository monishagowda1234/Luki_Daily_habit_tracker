import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, Phone, Check } from "lucide-react";
import { z } from "zod";
import { LukiFace } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useLiveVoice, type LiveEvent } from "@/hooks/use-live-voice";
import { useStore, refreshTasks, todayKey } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/call")({
  validateSearch: z.object({ mode: z.enum(["morning", "night", "plan"]).optional(), incoming: z.boolean().optional() }),
  head: () => ({
    meta: [
      { title: "Call with Luki" },
      { name: "description", content: "Talk with Luki out loud and watch your plan update as you speak." },
      { property: "og:title", content: "Call with Luki" },
      { property: "og:description", content: "Talk with Luki out loud and watch your plan update as you speak." },
    ],
  }),
  component: CallPage,
});

type Line = { role: "user" | "assistant"; text: string };

function CallPage() {
  const { mode = "plan", incoming } = Route.useSearch();
  const nav = useNavigate();
  const { s } = useStore();
  const token = useRef("");
  const [lines, setLines] = useState<Line[]>([]);
  const capEnd = useRef<HTMLDivElement>(null);
  const [talking, setTalking] = useState(false);
  const talkTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const onEvent = (e: LiveEvent) => {
    if (e.type === "session.input_transcript.delta" || e.type === "session.output_transcript.delta") {
      const role = e.type === "session.input_transcript.delta" ? "user" : "assistant";
      const d = String(e["delta"] ?? "");
      if (!d) return;
      setLines((ls) => { const last = ls[ls.length - 1]; return last?.role === role ? [...ls.slice(0, -1), { role, text: last.text + d }] : [...ls, { role, text: d }]; });
      if (role === "assistant") { setTalking(true); clearTimeout(talkTimer.current); talkTimer.current = setTimeout(() => setTalking(false), 900); }
    }
    if (e.type === "app.plan.changed") void refreshTasks();
  };

  const v = useLiveVoice({ url: "/api/live", onEvent, startData: () => ({ token: token.current, today: todayKey(), localTime: new Date().toString().slice(0, 80), mode }) });

  const begin = async () => {
    const { data } = await supabase.auth.getSession();
    token.current = data.session?.access_token ?? "";
    v.start();
  };
  useEffect(() => { capEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [lines]);
  useEffect(() => { if (v.status === "closed") void refreshTasks(); }, [v.status]);

  const live = v.status === "connecting" || v.status === "connected";
  const today = s.tasks.filter((t) => t.date === todayKey()).sort((a, b) => (a.time ?? "99").localeCompare(b.time ?? "99"));
  const ringing = incoming && v.status === "idle";
  useEffect(() => {
    if (!ringing) return;
    let ctx: AudioContext | undefined;
    const ring = () => { try { ctx ??= new AudioContext(); const o = ctx.createOscillator(); const g = ctx.createGain(); o.frequency.value = 880; g.gain.value = 0.08; o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.4); } catch { /* blocked */ } };
    ring(); const id = setInterval(ring, 1500);
    navigator.vibrate?.([400, 200, 400]);
    return () => { clearInterval(id); void ctx?.close(); };
  }, [ringing]);
  const label = { idle: ringing ? `Luki is calling you${mode === "morning" ? " — good morning!" : mode === "night" ? " — night check-in" : ""} 📞` : "Ready when you are", connecting: "Calling Luki…", connected: v.muted ? "You're muted" : "Luki is listening", stopping: "Hanging up…", closed: "Call ended" }[v.status];

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-8 pt-8">
      <audio ref={v.audioRef} autoPlay className="hidden" />
      <div className="flex flex-col items-center">
        <LukiFace size={170} talking={talking} />
        <h1 className="mt-3 text-2xl font-semibold">Luki</h1>
        <p className="text-sm text-muted-foreground">{label}</p>
        {v.error && <p className="mt-2 rounded-2xl bg-secondary px-3 py-2 text-center text-xs font-semibold text-destructive">{v.error}</p>}
        {v.playbackBlocked && <button onClick={v.resumePlayback} className="mt-2 rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground">Tap to hear Luki</button>}
      </div>

      <div className="glass mt-5 h-40 overflow-y-auto p-3 text-sm" aria-live="polite">
        {lines.length === 0 ? <p className="text-center text-xs text-muted-foreground">Live captions will appear here.</p> : lines.map((l, i) => (
          <p key={i} className={l.role === "user" ? "my-1 text-right font-semibold text-primary" : "my-1"}>{l.text}</p>
        ))}
        <div ref={capEnd} />
      </div>

      <div className="glass mt-4 flex-1 p-4">
        <h2 className="mb-2 text-sm font-semibold">Today's plan</h2>
        {today.length === 0 ? <p className="text-xs text-muted-foreground">Nothing yet — tell Luki what you'd like to do.</p> : (
          <ul className="space-y-1.5">{today.map((t) => (
            <li key={t.id} className="flex items-center gap-2 text-sm">
              <span className={`flex h-5 w-5 items-center justify-center rounded-full border border-primary ${t.done ? "bg-primary text-primary-foreground" : ""}`}>{t.done && <Check className="h-3 w-3" />}</span>
              <span className={t.done ? "text-muted-foreground line-through" : ""}>{t.title}</span>
              {t.time && <span className="ml-auto text-xs text-muted-foreground">{t.time}</span>}
            </li>
          ))}</ul>
        )}
      </div>

      <div className="mt-6 flex items-center justify-center gap-6">
        {live ? (<>
          <button onClick={() => v.setMuted(!v.muted)} aria-label={v.muted ? "Unmute" : "Mute"} className="glass flex h-16 w-16 items-center justify-center rounded-full">
            {v.muted ? <MicOff className="h-6 w-6 text-destructive" /> : <Mic className="h-6 w-6 text-primary" />}
          </button>
          <button onClick={v.stop} aria-label="End call" className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive text-destructive-foreground"><PhoneOff className="h-6 w-6" /></button>
        </>) : (<>
          <button onClick={() => void nav({ to: "/luki" })} className="glass rounded-full px-5 py-3 text-sm font-bold">Back</button>
          <button onClick={() => void begin()} disabled={v.status === "stopping"} className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground disabled:opacity-50"><Phone className="h-5 w-5" />{v.status === "closed" ? "Call again" : ringing ? "Answer" : "Start call"}</button>
        </>)}
      </div>
    </div>
  );
}
