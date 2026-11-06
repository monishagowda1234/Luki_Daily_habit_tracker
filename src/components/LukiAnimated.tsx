import { useEffect, useState } from "react";

const MOODS = ["smile", "grin", "love", "wink"] as const;
type Mood = (typeof MOODS)[number];

/** Animated Luki: blinks, changes expressions and twinkles. */
export function LukiAnimated({ size = 120, talking = false }: { size?: number; talking?: boolean }) {
  const [blink, setBlink] = useState(false);
  const [mood, setMood] = useState<Mood>("smile");
  useEffect(() => {
    const b = setInterval(() => { setBlink(true); setTimeout(() => setBlink(false), 160); }, 2800);
    const m = setInterval(() => setMood(MOODS[Math.floor(Math.random() * MOODS.length)]!), 4200);
    return () => { clearInterval(b); clearInterval(m); };
  }, []);

  const eye = (cx: number, wink: boolean) =>
    mood === "love" ? (
      <path key={cx} d={`M${cx} 112 l-12 -12 a7 7 0 0 1 12 -8 a7 7 0 0 1 12 8 z`} className="fill-primary luki-glow" />
    ) : blink || wink ? (
      <path key={cx} d={`M${cx - 13} 102 q13 9 26 0`} strokeWidth="5" strokeLinecap="round" fill="none" className="stroke-visor-foreground luki-glow" />
    ) : (
      <g key={cx} className="luki-glow">
        <circle cx={cx} cy="100" r="17" className="fill-glow" />
        <circle cx={cx} cy="100" r="11" className="fill-visor" />
        <circle cx={cx + 4} cy="95" r="4" className="fill-visor-foreground" />
        <circle cx={cx - 4} cy="105" r="2" className="fill-visor-foreground" />
      </g>
    );

  const mouth =
    talking ? <ellipse cx="100" cy="134" rx="9" ry="7" className="fill-primary luki-talk" />
    : mood === "grin" ? <path d="M84 128 q16 18 32 0 z" className="fill-primary" />
    : <path d="M86 130 q14 12 28 0" strokeWidth="5" strokeLinecap="round" fill="none" className="stroke-primary" />;

  return (
    <div className="relative animate-float" style={{ width: size, height: size }}>
      <svg viewBox="0 0 200 200" width={size} height={size} aria-label="Luki">
        <rect x="14" y="80" width="22" height="50" rx="11" className="fill-secondary stroke-border" strokeWidth="2" />
        <rect x="164" y="80" width="22" height="50" rx="11" className="fill-secondary stroke-border" strokeWidth="2" />
        <ellipse cx="100" cy="102" rx="74" ry="70" className="fill-popover stroke-border" strokeWidth="2" />
        <path d="M100 38 l-5 -5 a3.5 3.5 0 0 1 5 -4 a3.5 3.5 0 0 1 5 4 z" className="fill-primary" />
        <rect x="42" y="62" width="116" height="92" rx="40" className="fill-visor" />
        {eye(72, false)}
        {eye(128, mood === "wink")}
        <ellipse cx="58" cy="126" rx="8" ry="4" className="fill-primary opacity-60" />
        <ellipse cx="142" cy="126" rx="8" ry="4" className="fill-primary opacity-60" />
        {mouth}
      </svg>
      {[["8%", "10%", "0s"], ["85%", "5%", "0.8s"], ["90%", "70%", "1.6s"], ["2%", "75%", "2.2s"]].map(([l, t, d], i) => (
        <span key={i} className="luki-twinkle absolute text-primary" style={{ left: l, top: t, animationDelay: d, fontSize: size / 9 }}>✦</span>
      ))}
    </div>
  );
}
