"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useNotify } from "@/components/app-shell";
import { CURRENT_GROUP, CURRENT_USER } from "@/lib/session";
import { getLeaderboard, type LeaderboardEntry, type LeaderboardPeriod } from "@/lib/leaderboard";

const PERIODS: { id: LeaderboardPeriod; label: string }[] = [
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
];

function periodFrom(value: string | null): LeaderboardPeriod {
  return value === "month" ? "month" : "week";
}

export default function LeaderboardPage() {
  const notify = useNotify();
  const router = useRouter();
  const searchParams = useSearchParams();
  const period = periodFrom(searchParams.get("period"));
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getLeaderboard(CURRENT_GROUP.id, period)
      .then((next) => {
        if (!cancelled) setEntries(next);
      })
      .catch(() => {
        if (!cancelled) notify("Could not load leaderboard");
      })
      .finally(() => {
        if (cancelled) return;
        setReady(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [notify, period]);

  const max = entries[0]?.points ?? 0;

  const selectPeriod = (next: LeaderboardPeriod) => {
    if (next === period) return;
    setLoading(true);
    router.replace(next === "month" ? "/leaderboard?period=month" : "/leaderboard", { scroll: false });
  };

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#9a7fb0]">{CURRENT_GROUP.name}</p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold leading-tight">Leaderboard</h1>
          <p className="mt-1 text-[#7c6f9c]">
            {period === "week" ? "Weekly points · resets Sunday" : "Monthly points"}
          </p>
        </div>
        <div role="tablist" aria-label="Points period" className="flex rounded-xl bg-[#e9e3f1] p-1">
          {PERIODS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={period === item.id}
              onClick={() => selectPeriod(item.id)}
              className={`rounded-lg px-4 py-1.5 text-[15px] font-medium transition-colors ${
                period === item.id ? "bg-white shadow-sm" : "text-[#6b6590] hover:text-[#1c2750]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <section className="mt-6 rounded-3xl border border-white/70 bg-[#f4f0f8]/90 p-5 sm:p-6">
        {!ready && <p className="py-10 text-center text-[#6b6590]">Loading leaderboard…</p>}
        {ready && entries.length === 0 && (
          <p className="py-10 text-center text-[#6b6590]">No points for this period yet.</p>
        )}
        {ready && entries.length > 0 && (
          <ol className={`flex flex-col gap-3 transition-opacity ${loading ? "opacity-60" : ""}`}>
            {entries.map((entry, index) => {
              const you = entry.id === CURRENT_USER.id;
              const width = max > 0 ? Math.round((entry.points / max) * 100) : 0;
              return (
                <li
                  key={entry.id}
                  className={`flex items-center gap-4 rounded-2xl px-4 py-4 ${
                    you ? "border border-[#d7c6e4] bg-[#f7f1f8]" : "bg-[#ebe6f1]"
                  }`}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#1c2750] text-sm font-semibold text-white">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {entry.name}
                      {you && <span className="font-medium text-[#6b6590]"> · you</span>}
                    </p>
                    <div className="mt-2 h-2 w-full max-w-[220px] overflow-hidden rounded-full bg-white/80">
                      <div className="h-full rounded-full bg-[#9a7fb0]" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                  <span className="shrink-0 font-semibold text-[#9a7fb0]">{entry.points} pts</span>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </>
  );
}
