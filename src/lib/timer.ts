import { useEffect, useState } from "react";
import { getState, update, todayKey, uid, type TimerState, type Session } from "./store";

export const elapsedOf = (t: TimerState, now = Date.now()) => t.elapsed + (t.runningSince ? now - t.runningSince : 0);
export const remainingOf = (t: TimerState, now = Date.now()) => Math.max(0, t.duration - elapsedOf(t, now));
export const isActive = (t: TimerState) => t.runningSince !== null || t.elapsed > 0;

export function clock(ms: number) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600); const m = Math.floor((total % 3600) / 60); const s = total % 60;
  const mm = String(m).padStart(2, "0"); const ss = String(s).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function setTimer(patch: Partial<TimerState>) {
  update((st) => ({ ...st, timer: { ...st.timer, ...patch } }));
}

export function startTimer(patch: Partial<TimerState> = {}) {
  update((st) => {
    const t = { ...st.timer, ...patch };
    if (t.runningSince) return st;
    const now = Date.now();
    return { ...st, timer: { ...t, runningSince: now, firstStart: t.firstStart ?? now } };
  });
}

export function pauseTimer() {
  update((st) => ({ ...st, timer: { ...st.timer, elapsed: elapsedOf(st.timer), runningSince: null } }));
}

export function resetTimer() {
  update((st) => ({ ...st, timer: { ...st.timer, elapsed: 0, runningSince: null, firstStart: null } }));
}

/** Stops the timer and saves the tracked time as a session (ignored if under 5 seconds). */
export function finishTimer(): Session | null {
  const t = getState().timer;
  const raw = elapsedOf(t);
  const ms = t.mode === "timer" ? Math.min(raw, t.duration) : raw;
  resetTimer();
  if (ms < 5000 || !t.firstStart) return null;
  const session: Session = {
    id: uid(), activity: t.activity.trim() || "Focus", date: todayKey(new Date(t.firstStart)),
    startedAt: t.firstStart, ms, kind: t.mode,
  };
  update((st) => ({ ...st, sessions: [...st.sessions, session] }));
  return session;
}

/** Re-renders every `every` ms while `on` is true, returning the current time. */
export function useNow(on: boolean, every = 250) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!on) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), every);
    return () => clearInterval(id);
  }, [on, every]);
  return now;
}

export function chime() {
  try {
    navigator.vibrate?.([300, 150, 300, 150, 300]);
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.35, 0.7].forEach((at, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = "sine"; o.frequency.value = [880, 1046, 1318][i] ?? 880;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + at);
      g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.3);
      o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + at); o.stop(ctx.currentTime + at + 0.32);
    });
    setTimeout(() => void ctx.close(), 1500);
  } catch { /* sound not available */ }
}

export function askNotify() {
  if (typeof Notification !== "undefined" && Notification.permission === "default") void Notification.requestPermission();
}

export function notify(title: string, body: string) {
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    try { new Notification(title, { body }); } catch { /* some mobile browsers only allow service-worker notifications */ }
  }
}
