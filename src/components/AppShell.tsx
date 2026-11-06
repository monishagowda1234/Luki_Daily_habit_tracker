import { Link } from "@tanstack/react-router";
import { Home, Grid3x3, CalendarHeart, Sparkle, Bot } from "lucide-react";
import type { ReactNode } from "react";
import luki from "@/assets/luki.jpg";

const tabs = [
  { to: "/", label: "Today", icon: Home },
  { to: "/habits", label: "Habits", icon: Grid3x3 },
  { to: "/luki", label: "Luki", icon: Bot },
  { to: "/day", label: "My day", icon: CalendarHeart },
  { to: "/dreams", label: "Dreams", icon: Sparkle },
] as const;

export function LukiFace({ size = 96, talking = false }: { size?: number; talking?: boolean }) {
  return (
    <img src={luki} alt="Luki" width={size} height={size}
      className={`rounded-full object-cover animate-float ${talking ? "animate-ring" : ""}`}
      style={{ width: size, height: size }} />
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-md pb-28">
      {children}
      <nav className="fixed inset-x-0 bottom-3 z-50 mx-auto max-w-md px-3">
        <div className="glass flex justify-between px-2 py-2">
          {tabs.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} activeOptions={{ exact: true }}
              className="flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-semibold text-muted-foreground transition-all data-[status=active]:bg-primary data-[status=active]:text-primary-foreground">
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
    <header className="px-5 pt-8 pb-4">
      <h1 className="text-3xl font-semibold">{title}</h1>
      {sub && <p className="text-sm text-muted-foreground">{sub}</p>}
    </header>
  );
}
