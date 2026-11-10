import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { useStore, getState } from "@/lib/store";
import { Home, Grid3x3, CalendarHeart, Sparkle, Bot, Timer, BarChart3, Pause } from "lucide-react";
import type { ReactNode } from "react";
import { LukiAnimated } from "@/components/LukiAnimated";
import { chime, clock, elapsedOf, finishTimer, isActive, notify, remainingOf, useNow } from "@/lib/timer";
import { fmtDur } from "@/lib/report";

const tabs = [
  { to: "/", label: "Today", icon: Home },
  { to: "/habits", label: "Habits", icon: Grid3x3 },
  { to: "/luki", label: "Luki", icon: Bot },
  { to: "/timer", label: "Timer", icon: Timer },
  { to: "/day", label: "My day", icon: CalendarHeart },
  { to: "/dreams", label: "Dreams", icon: Sparkle },
] as const;

export function LukiFace({ size = 96, talking = false }: { size?: number; talking?: boolean }) {
  return <LukiAnimated size={size} talking={talking} />;
}

/** Finishes a countdown on whichever page is open when it hits zero. */
function useTimerWatcher(running: boolean) {
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const t = getState().timer;
      if (t.mode === "timer" && t.runningSince && remainingOf(t) <= 0) {
        const saved = finishTimer();
        chime();
        const msg = saved ? `${saved.activity} · ${fmtDur(saved.ms)} saved to your report` : "Time's up!";
        toast.success("Time's up! 💗", { description: msg });
        notify("Luki: time's up! 💗", msg);
      }
    }, 500);
    return () => clearInterval(id);
  }, [running]);
}

export function AppShell({ children }: { children: ReactNode }) {
  const { s, ready } = useStore();
  const nav = useNavigate();
  useEffect(() => { if (ready && !s.settings.phone) void nav({ to: "/login" }); }, [ready, s.settings.phone, nav]);
  const t = s.timer;
  const active = isActive(t);
  const now = useNow(t.runningSince !== null, 500);
  useTimerWatcher(t.runningSince !== null);
  const initial = (s.settings.name || "L").trim().charAt(0).toUpperCase();

  return (
    <div className="mx-auto min-h-screen max-w-md pb-28">
      <div className="flex items-center gap-2 px-5 pt-4">
        {active ? (
          <Link to="/timer" className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
            {t.runningSince ? <span className="h-2 w-2 animate-pulse rounded-full bg-primary-foreground" /> : <Pause className="h-3 w-3" />}
            {t.activity || "Focus"} · {clock(t.mode === "timer" ? remainingOf(t, now) : elapsedOf(t, now))}
          </Link>
        ) : (
          <p className="text-xs font-semibold text-muted-foreground">{new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })}</p>
        )}
        <div className="flex-1" />
        <Link to="/report" aria-label="Daily report" className="glass flex h-9 w-9 items-center justify-center !rounded-full text-primary">
          <BarChart3 className="h-4 w-4" />
        </Link>
        <Link to="/account" aria-label="My account" className="flex h-9 w-9 items-center justify-center rounded-full bg-primary font-display text-sm font-semibold text-primary-foreground shadow">
          {initial}
        </Link>
      </div>
      {children}
      <nav className="fixed inset-x-0 bottom-3 z-50 mx-auto max-w-md px-3">
        <div className="glass flex justify-between px-1.5 py-2">
          {tabs.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} activeOptions={{ exact: true }}
              className="flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[10px] font-semibold text-muted-foreground transition-all data-[status=active]:bg-primary data-[status=active]:text-primary-foreground">
              <Icon className="h-5 w-5" />{label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function Header({ title, sub }: { title: string; sub?: string }) {
  return (
    <header className="px-5 pt-4 pb-4">
      <h1 className="text-3xl font-semibold">{title}</h1>
      {sub && <p className="text-sm text-muted-foreground">{sub}</p>}
    </header>
  );
}
