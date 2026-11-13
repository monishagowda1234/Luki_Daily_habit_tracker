import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { LukiAnimated } from "@/components/LukiAnimated";
import { supabase } from "@/integrations/supabase/client";
import { fullPhone, phoneToEmail, PENDING_SETUP_KEY, PHONE_RE } from "@/lib/phone-auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Luki" },
      { name: "description", content: "Sign in to Luki with your mobile number and password, or create your account." },
      { property: "og:title", content: "Sign in — Luki" },
      { property: "og:description", content: "Sign in to Luki with your mobile number and password, or create your account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [code, setCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [wake, setWake] = useState("07:00");
  const [sleep, setSleep] = useState("22:00");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => { if (data.user) void nav({ to: "/", replace: true }); });
  }, [nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    const full = fullPhone(code, phone);
    if (!PHONE_RE.test(full)) return setErr("Please enter a valid mobile number.");
    if (password.length < 8) return setErr("Your password needs at least 8 characters.");
    const email = phoneToEmail(full);
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return setErr(error.message.includes("Invalid") ? "That number and password don't match." : error.message);
      } else {
        if (!name.trim()) return setErr("Tell Luki your name 💗");
        if (password !== confirm) return setErr("The two passwords don't match.");
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { data: { name: name.trim().slice(0, 60), phone: full } },
        });
        if (error) {
          if (/already|registered|exists/i.test(error.message)) return setErr("This number already has an account. Sign in instead.");
          if (/pwned|leak|weak|known/i.test(error.message)) return setErr("That password has appeared in a data leak. Please choose a different one.");
          return setErr(error.message);
        }
        if (!data.session) return setErr("Account created, but sign-in didn't finish. Please sign in.");
        sessionStorage.setItem(PENDING_SETUP_KEY, JSON.stringify({ wake, sleep }));
      }
      void nav({ to: "/", replace: true });
    } finally {
      setBusy(false);
    }
  };

  const signup = mode === "signup";
  const field = "mt-1 w-full rounded-xl bg-secondary p-3 outline-none focus:ring-2 focus:ring-primary/40";

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center px-6 pt-8 pb-8">
      <LukiAnimated size={150} />
      <h1 className="mt-3 text-3xl font-semibold">{signup ? "Hi, I'm Luki!" : "Welcome back!"}</h1>
      <p className="mt-1 text-center text-sm text-muted-foreground">
        {signup ? "Create your account so I can call you every morning and night." : "Sign in with your mobile number and password."}
      </p>

      <div className="glass mt-5 grid w-full grid-cols-2 gap-1 p-1">
        {(["signin", "signup"] as const).map((m) => (
          <button key={m} type="button" onClick={() => { setMode(m); setErr(""); }}
            className={`rounded-2xl py-2 text-sm font-bold transition-colors ${mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {m === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="glass mt-3 w-full space-y-3 p-5">
        {signup && (
          <label className="block text-sm font-semibold">Your name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Meera" autoComplete="name" className={field} />
          </label>
        )}
        <label className="block text-sm font-semibold">Mobile number
          <div className="mt-1 flex gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value)} className="w-16 rounded-xl bg-secondary p-3 text-center outline-none" aria-label="Country code" />
            <input type="tel" inputMode="numeric" autoComplete="tel-national" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" className="min-w-0 flex-1 rounded-xl bg-secondary p-3 outline-none" />
          </div>
        </label>
        <label className="block text-sm font-semibold">Password
          <div className="relative">
            <input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
              autoComplete={signup ? "new-password" : "current-password"} placeholder="At least 8 characters" className={`${field} pr-11`} />
            <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 mt-0.5 -translate-y-1/2 text-muted-foreground">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>
        {signup && (
          <>
            <label className="block text-sm font-semibold">Confirm password
              <input type={show ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" className={field} />
            </label>
            <div className="flex gap-3">
              <label className="flex-1 text-sm font-semibold">Wake-up call
                <input type="time" value={wake} onChange={(e) => setWake(e.target.value)} className={field} />
              </label>
              <label className="flex-1 text-sm font-semibold">Night call
                <input type="time" value={sleep} onChange={(e) => setSleep(e.target.value)} className={field} />
              </label>
            </div>
          </>
        )}
        {err && <p role="alert" className="text-sm font-semibold text-destructive">{err}</p>}
        <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 font-bold text-primary-foreground disabled:opacity-60">
          <Lock className="h-4 w-4" /> {busy ? "Just a moment…" : signup ? "Create my account 💗" : "Sign in"}
        </button>
        {!signup && <p className="text-center text-xs text-muted-foreground">Keep your password safe — it can't be reset by email, since your account uses your phone number.</p>}
      </form>
    </div>
  );
}
