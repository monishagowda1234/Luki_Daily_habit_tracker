import { todayKey } from "@/lib/store";

const levels = ["bg-heat-0", "bg-heat-1", "bg-heat-2", "bg-heat-3", "bg-heat-4"];

/** A 12-week calendar "map". value(date) returns 0..4 */
export function HeatMap({ value, weeks = 12, emojiFor }: { value: (d: string) => number; weeks?: number; emojiFor?: (d: string) => string | undefined }) {
  const days: string[] = [];
  const end = new Date();
  for (let i = weeks * 7 - 1; i >= 0; i--) { const d = new Date(end); d.setDate(end.getDate() - i); days.push(todayKey(d)); }
  return (
    <div className="grid grid-flow-col grid-rows-7 gap-1">
      {days.map((d) => {
        const v = Math.max(0, Math.min(4, value(d)));
        const e = emojiFor?.(d);
        return (
          <div key={d} title={d}
            className={`flex aspect-square items-center justify-center rounded-[5px] text-[9px] ${levels[v]} ${d === todayKey() ? "ring-2 ring-primary" : ""}`}>
            {e}
          </div>
        );
      })}
    </div>
  );
}
