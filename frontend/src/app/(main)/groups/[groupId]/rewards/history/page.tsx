"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useGroup, useNotify, useRefreshTick } from "@/components/app-shell";
import { CURRENT_USER, listMembers, type Member } from "@/lib/chores";
import { apiFetch } from "@/lib/api/fetch";
import { householdPath } from "@/lib/session";

const FILTERS = ["All", "Mine"] as const;
type Filter = (typeof FILTERS)[number];

export interface HistoryResponse {
  id: number;
  name: string;
  cost: number;
  redeemed_by: number;
  redeemed_at: string;
}

export type ClaimedRewardItem = HistoryResponse;

function formatDate(iso: string) {
  const date = new Date(iso);
  return isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function RewardHistoryPage() {
  const notify = useNotify();
  const group = useGroup();
  const refreshTick = useRefreshTick();
  const loaded = useRef(false);

  const [members, setMembers] = useState<Member[]>([]);
  const [history, setHistory] = useState<HistoryResponse[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("All");

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      listMembers(group.id),
      apiFetch<HistoryResponse[]>(`/rewards/history?group_id=${group.id}`, { method: "GET" }),
    ])
      .then(([nextMembers, nextHistory]) => {
        if (cancelled) return;
        loaded.current = true;
        setLoadError(null);
        setMembers(nextMembers);
        setHistory(Array.isArray(nextHistory) ? nextHistory : []);
      })
      .catch((error: unknown) => {
        if (cancelled || loaded.current) return;
        const message = error instanceof Error ? error.message : "Could not load reward history";
        setLoadError(message);
        notify(message);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [group.id, notify, refreshTick]);

  const myPoints = members.find((m) => m.id === CURRENT_USER.id)?.points ?? 0;

  const visible = useMemo(() => {
    return history.filter((item) => {
      if (filter === "Mine") {
        return item.redeemed_by === CURRENT_USER.id;
      }
      return true;
    });
  }, [history, filter]);

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-base font-medium text-[#9a7fb0]">
            <Link href={householdPath(group.id, "/rewards")} className="transition-colors hover:text-[#1c2750]">
              Rewards
            </Link>
            <span>/</span>
            <span>History</span>
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold leading-tight">Reward History</h1>
          <p className="mt-1 text-[#7c6f9c]">
            {group.name} · history of rewards claimed by household members
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-base">
          <span className="rounded-full border border-[#d9d0e6] bg-white/50 px-4 py-2">
            Your points: <strong>{myPoints}</strong>
          </span>
        </div>
      </header>

      <section className="@container mt-6 rounded-3xl border border-white/70 bg-[#f4f0f8]/90 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">Claimed rewards</h2>
            <span className="rounded-full bg-[#ebe6f1] px-2.5 py-0.5 text-xs font-semibold text-[#6b6590]">
              {visible.length}
            </span>
          </div>
          <div role="tablist" aria-label="Filter reward history" className="flex w-full rounded-xl bg-[#e9e3f1] p-1 sm:w-auto">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={filter === f}
                onClick={() => setFilter(f)}
                className={`flex-1 rounded-lg px-3 py-2 text-base font-medium transition-colors sm:flex-none sm:px-5 ${
                  filter === f ? "bg-white shadow-sm" : "text-[#6b6590] hover:text-[#1c2750]"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Responsive narrow view: full-width card per claimed reward */}
        <ul className="mt-5 flex flex-col @3xl:hidden">
          {visible.map((item) => {
            const isMine = item.redeemed_by === CURRENT_USER.id;
            const member = members.find((m) => m.id === item.redeemed_by);
            const claimedByName = member?.name ?? (isMine ? CURRENT_USER.name : `Member #${item.redeemed_by}`);
            return (
              <li
                key={item.id}
                className="border-b border-[#d5cde3] py-3.5 transition-colors last:border-0 hover:bg-white/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0 break-words font-semibold text-[#1c2750]">{item.name}</span>
                  <span className="inline-grid h-8 min-w-10 shrink-0 place-items-center rounded-full bg-[#e5deee] px-2 text-sm font-semibold text-[#1c2750]">
                    {item.cost} pts
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-base text-[#6b6590]">
                  <span>
                    Claimed by{" "}
                    <strong className="font-semibold text-[#1c2750]">
                      {claimedByName}
                      {isMine ? " (you)" : ""}
                    </strong>
                  </span>
                  <span>·</span>
                  <span>{formatDate(item.redeemed_at)}</span>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Wide table view */}
        <div className="mt-5 hidden overflow-x-auto @3xl:block">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#d5cde3] text-base text-[#6b6590]">
                {["Reward", "Points", "Claimed by", "Date claimed"].map((heading) => (
                  <th key={heading} className="whitespace-nowrap pb-3 pr-4 font-semibold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => {
                const isMine = item.redeemed_by === CURRENT_USER.id;
                const member = members.find((m) => m.id === item.redeemed_by);
                const claimedByName = member?.name ?? (isMine ? CURRENT_USER.name : `Member #${item.redeemed_by}`);
                return (
                  <tr
                    key={item.id}
                    className="border-b border-[#d5cde3] transition-colors last:border-0 hover:bg-white/50"
                  >
                    <td className="whitespace-nowrap py-3.5 pr-4">
                      <span className="font-semibold text-[#1c2750]">{item.name}</span>
                    </td>
                    <td className="whitespace-nowrap pr-4">
                      <span className="inline-grid h-8 min-w-10 place-items-center rounded-full bg-[#e5deee] px-2 text-sm font-semibold text-[#1c2750]">
                        {item.cost}
                      </span>
                    </td>
                    <td className="whitespace-nowrap pr-4 text-base text-[#1c2750]">
                      {claimedByName}
                      {isMine && <span className="font-normal text-[#6b6590]"> (you)</span>}
                    </td>
                    <td className="whitespace-nowrap pr-4 text-base text-[#6b6590]">
                      {formatDate(item.redeemed_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div>
          {!ready && <p className="py-10 text-center text-[#6b6590]">Loading reward history…</p>}
          {ready && loadError && <p className="py-10 text-center text-[#b3402f]">{loadError}</p>}
          {ready && !loadError && history.length === 0 && (
            <p className="py-10 text-center text-[#6b6590]">No rewards have been claimed yet.</p>
          )}
          {ready && !loadError && history.length > 0 && visible.length === 0 && (
            <p className="py-10 text-center text-[#6b6590]">No claimed rewards match this filter.</p>
          )}
        </div>
      </section>
    </>
  );
}
