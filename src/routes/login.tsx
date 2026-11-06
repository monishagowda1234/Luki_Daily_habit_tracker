import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { LukiAnimated } from "@/components/LukiAnimated";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Luki" },
      { name: "description", content: "Meet Luki and share your mobile number for morning and night calls." },
      { property: "og:title", content: "Sign in — Luki" },
      { property: "og:description", content: "Meet Luki and share your mobile number for morning and night calls." },
    ],
  }),
  component: Login,
});

function Login() {
  const { s, update } = useStore();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [code, setCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [wake, setWake] = useState(s.settings.wake);
  const [sleep, setSleep] = useState(s.settings.sleep);
  const [err, setErr] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const full = `${code}${phone.replace(/\D/g, "")}`;
    if (!name.trim()) return setErr("Tell Luki your name 💗");
    if (!/^\+[1-9]\d{7,14}$/.test(full)) return setErr("Please enter a valid mobile number.");
    update((st) => ({ ...st, settings: { name: name.trim(), phone: full, wake, sleep } }));
    void nav({ to: "/" });
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center px-6 pt-10 pb-8">
      <LukiAnimated size={170} />
      <h1 className="mt-3 text-3xl font-semibold">Hi, I'm Luki!</h1>
      <p className="mt-1 text-center text-sm text-muted-foreground">Your cute personal assistant. Share your number so I can call you every morning and night.</p>
      <form onSubmit={submit} className="glass mt-6 w-full space-y-3 p-5">
        <label className="block text-sm font-semibold">Your name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Meera" className="mt-1 w-full rounded-xl bg-secondary p-3 outline-none" />
        </label>
        <label className="block text-sm font-semibold">Mobile number
          <div className="mt-1 flex gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value)} className="w-16 rounded-xl bg-secondary p-3 text-center outline-none" aria-label="Country code" />
            <input type="tel" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" className="min-w-0 flex-1 rounded-xl bg-secondary p-3 outline-none" />
          </div>
        </label>
        <div className="flex gap-3">
          <label className="flex-1 text-sm font-semibold">Wake-up call
            <input type="time" value={wake} onChange={(e) => setWake(e.target.value)} className="mt-1 w-full rounded-xl bg-secondary p-3" />
          </label>
          <label className="flex-1 text-sm font-semibold">Night call
            <input type="time" value={sleep} onChange={(e) => setSleep(e.target.value)} className="mt-1 w-full rounded-xl bg-secondary p-3" />
          </label>
        </div>
        {err && <p className="text-sm font-semibold text-destructive">{err}</p>}
        <button type="submit" className="w-full rounded-2xl bg-primary py-3 font-bold text-primary-foreground">Let's start 💗</button>
      </form>
    </div>
  );
}
