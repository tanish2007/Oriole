"use client";

import { useState } from "react";
import { CURRENT_USER } from "@/lib/chores";
import { useApp } from "@/components/app-context";
import { STATUS_STYLE, Tabs, ViewHeader, assigneeName, formatDue, listItemClass, panelClass, primaryButtonClass } from "@/components/shared";

const FILTERS = ["All", "Available", "Mine", "Done"] as const;
type Filter = (typeof FILTERS)[number];

const disabledButtonClass = "rounded-lg border border-[#d5cde3] px-4 py-2 text-sm font-medium text-[#a59fbd]";

export default function ChoresPage() {
  const { group, chores, members, rewards, myPoints, ready, claim, complete, redeem } = useApp();
  const [filter, setFilter] = useState<Filter>("All");

  const visible = chores.filter((chore) => {
    if (filter === "Available") return chore.status === "available";
    if (filter === "Mine") return chore.assigneeId === CURRENT_USER.id;
    if (filter === "Done") return chore.status === "completed";
    return true;
  });
  const ranked = [...members].sort((a, b) => b.points - a.points);

  return (
    <>
      <ViewHeader
        eyebrow="Current group"
        title={group?.name ?? "Loading…"}
        subtitle={group ? `${group.memberCount} members · You are ${group.role === "owner" ? "the owner" : "a member"}` : ""}
      >
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-full border border-[#d9d0e6] bg-white/50 px-4 py-2">Weekly reset: Sunday</span>
          <span className="rounded-full border border-[#d9d0e6] bg-white/50 px-4 py-2">
            Your points: <strong>{myPoints}</strong>
          </span>
        </div>
      </ViewHeader>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
        <section className={`self-start ${panelClass}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Chore tracking</h2>
            <Tabs label="Filter chores" options={FILTERS} value={filter} onChange={setFilter} />
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-b border-[#d5cde3] text-sm text-[#6b6590]">
                  {["Chore", "Points", "Due", "Assignee", "Status"].map((h) => (
                    <th key={h} className="pb-3 pr-4 font-semibold">{h}</th>
                  ))}
                  <th className="pb-3"><span className="sr-only">Action</span></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((c) => {
                  const s = STATUS_STYLE[c.status];
                  const mine = c.assigneeId === CURRENT_USER.id;
                  return (
                    <tr key={c.id} className="border-b border-[#d5cde3] last:border-0">
                      <td className="py-4 pr-4">
                        <p className="font-semibold">{c.title}</p>
                        {c.detail && <p className="text-sm text-[#6b6590]">{c.detail}</p>}
                      </td>
                      <td className="pr-4">
                        <span className="inline-grid h-8 min-w-10 place-items-center rounded-full bg-[#e5deee] px-2 text-sm font-semibold">{c.points}</span>
                      </td>
                      <td className="pr-4 text-[15px]">{formatDue(c.due)}</td>
                      <td className="pr-4 text-[15px]">{assigneeName(c.assigneeId, members) ?? "—"}</td>
                      <td className="pr-4">
                        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${s.pill}`}>
                          <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                          {s.label}
                        </span>
                      </td>
                      <td className="text-right">
                        {c.status === "available" && (
                          <button type="button" onClick={() => claim(c.id)} className={primaryButtonClass}>Claim</button>
                        )}
                        {c.status === "in_progress" && mine && (
                          <button type="button" onClick={() => complete(c.id)} className={primaryButtonClass}>Complete</button>
                        )}
                        {c.status === "in_progress" && !mine && <button type="button" disabled className={disabledButtonClass}>Claimed</button>}
                        {c.status === "completed" && <button type="button" disabled className={disabledButtonClass}>Done</button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!ready && <p className="py-10 text-center text-[#6b6590]">Loading chores…</p>}
            {ready && visible.length === 0 && <p className="py-10 text-center text-[#6b6590]">No chores match this filter. Try another tab.</p>}
          </div>
        </section>

        <div className="flex flex-col gap-5">
          <section className={panelClass}>
            <h2 className="text-xl font-semibold">Possible rewards</h2>
            {ready && rewards.length === 0 && <p className="mt-4 text-sm text-[#6b6590]">No rewards yet. Add one from Chores → Update rewards.</p>}
            <ul className="mt-4 flex flex-col gap-3">
              {rewards.map((r) => (
                <li key={r.id} className={`flex items-center justify-between gap-3 p-3.5 ${listItemClass}`}>
                  <div>
                    <p className="font-semibold leading-snug">{r.title}</p>
                    <p className="text-sm text-[#6b6590]">{r.cost} pts · {r.scope}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => redeem(r)}
                    disabled={myPoints < r.cost}
                    title={myPoints < r.cost ? `Need ${r.cost - myPoints} more points` : undefined}
                    className="rounded-lg bg-[#9a7fb0] px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#8869a0] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Redeem
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className={panelClass}>
            <h2 className="text-xl font-semibold">Points tracker</h2>
            <ol className="mt-4 flex flex-col gap-3">
              {ranked.map((m, i) => (
                <li key={m.id} className={`flex items-center gap-3 px-3.5 py-3 ${listItemClass}`}>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#1c2750] text-sm font-semibold text-white">{i + 1}</span>
                  <span className="flex-1 font-semibold">{m.name}{m.id === CURRENT_USER.id && " (you)"}</span>
                  <span className="font-semibold text-[#9a7fb0]">{m.points}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </>
  );
}
