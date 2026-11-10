import { describe, expect, it } from "vitest";
import { DEFAULT, type State, type Session } from "./store";
import { byActivity, dayReport, fmtDur, lastDays } from "./report";

const ses = (activity: string, date: string, min: number): Session => ({
  id: activity + date + min, activity, date, startedAt: new Date(`${date}T09:00:00`).getTime(), ms: min * 60000, kind: "timer",
});

describe("daily activity report", () => {
  it("only counts sessions from the chosen day", () => {
    const s: State = { ...DEFAULT, sessions: [ses("Study", "2026-11-10", 30), ses("Study", "2026-11-09", 50)] };
    expect(dayReport(s, "2026-11-10").totalMs).toBe(30 * 60000);
  });

  it("groups the same activity regardless of capital letters", () => {
    const g = byActivity([ses("Study", "d", 20), ses("study ", "d", 10), ses("Gym", "d", 30)]);
    expect(g.map((x) => [x.activity, x.ms / 60000])).toEqual([["Study", 30], ["Gym", 30]]);
  });

  it("caps the daily goal at 100%", () => {
    const s: State = { ...DEFAULT, settings: { ...DEFAULT.settings, focusGoal: 60 }, sessions: [ses("Work", "2026-11-10", 90)] };
    expect(dayReport(s, "2026-11-10").goalPct).toBe(100);
  });

  it("returns 7 days ending on the chosen day", () => {
    const days = lastDays({ ...DEFAULT, sessions: [ses("Read", "2026-11-04", 15)] }, "2026-11-10");
    expect(days.map((d) => d.date)).toEqual(["2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08", "2026-11-09", "2026-11-10"]);
    expect(days[0]?.ms).toBe(15 * 60000);
  });

  it("formats durations as hours and minutes", () => {
    expect(fmtDur(85 * 60000)).toBe("1h 25m");
    expect(fmtDur(25 * 60000)).toBe("25m");
  });
});
