import { useEffect, useState } from "react";

const MOODS = ["happy", "smile", "wink", "love", "curious", "happy", "sleepy"] as const;
type Mood = (typeof MOODS)[number];

/** Animated plush Luki: purple hood with sprout, headphones, glowing star. Blinks & changes expressions. */
export function LukiAnimated({ size = 120, talking = false }: { size?: number; talking?: boolean }) {
  const [blink, setBlink] = useState(false);
  const [mood, setMood] = useState<Mood>("happy");
  useEffect(() => {
    const b = setInterval(() => { setBlink(true); setTimeout(() => setBlink(false), 160); }, 3000);
    const m = setInterval(() => setMood(MOODS[Math.floor(Math.random() * MOODS.length)]!), 3800);
    return () => { clearInterval(b); clearInterval(m); };
  }, []);

  const arc = (cx: number, up = true) => (
    <path d={up ? `M${cx - 12} 108 q12 -14 24 0` : `M${cx - 11} 104 q11 9 22 0`} strokeWidth="5" strokeLinecap="round" fill="none" className="stroke-glow luki-glow" />
  );
  const dot = (cx: number, r = 9) => (
    <g className="luki-glow"><ellipse cx={cx} cy="104" rx={r} ry={r * 1.15} className="fill-glow" /><circle cx={cx + 3} cy="100" r="2.5" className="fill-visor-foreground" /></g>
  );
  const heart = (cx: number) => <path d={`M${cx} 112 l-11 -11 a6.5 6.5 0 0 1 11 -8 a6.5 6.5 0 0 1 11 8 z`} className="fill-primary luki-glow" />;

  let eyes;
  if (blink && mood !== "happy" && mood !== "sleepy") eyes = <>{arc(76, false)}{arc(124, false)}</>;
  else if (mood === "happy") eyes = <>{arc(76)}{arc(124)}</>;
  else if (mood === "wink") eyes = <>{arc(76)}{dot(124)}</>;
  else if (mood === "love") eyes = <>{heart(76)}{heart(124)}</>;
  else if (mood === "sleepy") eyes = <>{arc(76, false)}{arc(124, false)}</>;
  else if (mood === "curious") eyes = <>{dot(76, 7)}{dot(124, 9)}</>;
  else eyes = <>{dot(76)}{dot(124)}</>;

  const mouth = talking ? <ellipse cx="100" cy="126" rx="6" ry="5" className="fill-primary luki-talk" />
    : mood === "curious" || mood === "sleepy" ? <path d="M96 126 h8" strokeWidth="3" strokeLinecap="round" className="stroke-primary" />
    : <path d="M92 121 q8 12 16 0 z" className="fill-primary" />;

  const badge = mood === "sleepy" ? "z z" : mood === "curious" ? "?" : mood === "love" || mood === "wink" ? "♥" : "✦";

  return (
    <div className="relative animate-float" style={{ width: size, height: size }}>
      <svg viewBox="0 0 200 200" width={size} height={size} aria-label="Luki">
        {/* cape */}
        <path d="M40 150 q60 -40 120 0 l14 38 q-74 16 -148 0 z" className="fill-hood" />
        {/* body */}
        <ellipse cx="100" cy="172" rx="38" ry="24" className="fill-plush" />
        {/* glowing star held */}
        <path d="M100 152 l6 12 13 2 -9 9 2 13 -12 -6 -12 6 2 -13 -9 -9 13 -2 z" className="fill-star luki-star" />
        <ellipse cx="74" cy="172" rx="13" ry="11" className="fill-plush" />
        <ellipse cx="126" cy="172" rx="13" ry="11" className="fill-plush" />
        {/* sprout */}
        <g className="luki-sprout">
          <path d="M100 34 q-22 -20 -30 -6 q10 12 30 6 z" className="fill-hood-dark" />
          <path d="M100 34 q22 -20 30 -6 q-10 12 -30 6 z" className="fill-hood-dark" />
        </g>
        {/* headphones */}
        <rect x="18" y="82" width="26" height="46" rx="13" className="fill-visor" />
        <rect x="156" y="82" width="26" height="46" rx="13" className="fill-visor" />
        <ellipse cx="25" cy="105" rx="6" ry="17" fill="none" strokeWidth="3" className="stroke-glow luki-glow" />
        <ellipse cx="175" cy="105" rx="6" ry="17" fill="none" strokeWidth="3" className="stroke-glow luki-glow" />
        {/* hood */}
        <ellipse cx="100" cy="100" rx="66" ry="64" className="fill-hood" />
        <ellipse cx="100" cy="106" rx="54" ry="48" className="fill-plush" />
        <path d="M66 52 l3 6 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1 z" className="fill-star" />
        {/* visor */}
        <ellipse cx="100" cy="108" rx="46" ry="38" className="fill-visor" />
        {eyes}
        <g className="fill-primary opacity-80">
          <rect x="60" y="118" width="3" height="6" rx="1.5" /><rect x="66" y="118" width="3" height="6" rx="1.5" />
          <rect x="131" y="118" width="3" height="6" rx="1.5" /><rect x="137" y="118" width="3" height="6" rx="1.5" />
        </g>
        {mouth}
      </svg>
      <span key={mood} className="luki-twinkle absolute right-0 top-0 font-display font-bold text-hood-dark" style={{ fontSize: size / 7 }}>{badge}</span>
      {[["4%", "40%", "0.6s"], ["88%", "62%", "1.4s"]].map(([l, t, d], i) => (
        <span key={i} className="luki-twinkle absolute text-star" style={{ left: l, top: t, animationDelay: d, fontSize: size / 10 }}>✦</span>
      ))}
    </div>
  );
}
