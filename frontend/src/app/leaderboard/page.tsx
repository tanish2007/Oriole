"use client";

import { useState } from "react";
import { CURRENT_USER } from "@/lib/chores";
import { useApp } from "@/components/app-context";
import { Tabs, ViewHeader, panelClass } from "@/components/shared";

const PERIODS = ["This week", "This month"] as const;
type Period = (typeof PERIODS)[number];

export default function LeaderboardPage() {
  const { group, members } = useApp();
  const [period, setPeriod] = useState<Period>("This week");

  const key = period === "This week" ? "points" : "monthPoints";
  const ranked = [...members].sort((a, b) => b[key] - a[key]);
  const top = ranked[0]?.[key] || 1;

  return (
    <>
      <ViewHeader eyebrow={group?.name ?? ""} title="Leaderboard" subtitle={period === "This week" ? "Weekly points · resets Sunday" : "Monthly points"}>
        <Tabs label="Leaderboard period" options={PERIODS} value={period} onChange={setPeriod} />
      </ViewHeader>

      <section className={`mt-6 ${panelClass}`}>
        <ol className="flex flex-col gap-3">
          {ranked.map((m, i) => {
            const you = m.id === CURRENT_USER.id;
            return (
              <li key={m.id} className={`flex items-center gap-4 rounded-2xl px-4 py-3.5 ${you ? "bg-white ring-2 ring-[#9a7fb0]/40" : "bg-[#ebe6f1]"}`}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#1c2750] font-semibold text-white">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{m.name}{you && " · you"}</p>
                  <div className="mt-2 h-2 rounded-full bg-[#ddd3ea]">
                    <div className="h-full rounded-full bg-[#9a7fb0]" style={{ width: `${Math.round((m[key] / top) * 100)}%` }} />
                  </div>
                </div>
                <span className="shrink-0 font-semibold text-[#9a7fb0]">{m[key]} pts</span>
              </li>
            );
          })}
        </ol>
      </section>
    </>
  );
}
