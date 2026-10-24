"use client";

import { useEffect, useState } from "react";
import { useGroup, useNotify } from "@/components/app-shell";
import { listChores, type Chore, type Status } from "@/lib/chores";

// Same colors as the chores page.
const STATUS_STYLE: Record<Status, { label: string; pill: string; dot: string }> = {
  available: { label: "Available", pill: "bg-[#fde8e6] text-[#9f1239]", dot: "bg-[#e11d48]" },
  in_progress: { label: "In progress", pill: "bg-[#fff4cc] text-[#854d0e]", dot: "bg-[#eab308]" },
  completed: { label: "Completed", pill: "bg-[#dcfce7] text-[#166534]", dot: "bg-[#16a34a]" },
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const navButtonClass =
  "grid h-9 w-9 place-items-center rounded-[10px] border border-[#d5cde3] bg-white/70 text-xl transition-colors hover:bg-white";

function toIso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function CalendarPage() {
  const notify = useNotify();
  const group = useGroup();
  const [chores, setChores] = useState<Chore[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    let cancelled = false;
    listChores(group.id)
      .then((next) => {
        if (!cancelled) setChores(next);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "Could not load chores";
        setLoadError(message);
        notify(message);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [notify, group.id]);

  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const startDay = month.getDay();
  const cellCount = Math.ceil((startDay + new Date(year, monthIndex + 1, 0).getDate()) / 7) * 7;
  const cells = Array.from({ length: cellCount }, (_, i) => new Date(year, monthIndex, i - startDay + 1));
  const today = toIso(new Date());
  const undated = chores.filter((chore) => !chore.due).length;

  return (
    <>
      {/* Sizes follow the prototype's calendar so a month fits on one screen. */}
      <header>
        <p className="text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-[#9a7fb0]">{group.name}</p>
        <h1 className="font-[family-name:var(--font-display)] text-[1.85rem] font-bold leading-tight tracking-[-0.02em]">Calendar</h1>
        <p className="mt-0.5 text-[#7c6f9c]">Chore due dates</p>
      </header>

      <section className="mt-5 rounded-3xl border border-white/70 bg-[#f4f0f8]/90 px-[1.15rem] pb-5 pt-[1.1rem]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <button type="button" onClick={() => setMonth(new Date(year, monthIndex - 1, 1))} aria-label="Previous month" className={navButtonClass}>
            ‹
          </button>
          <h2 className="font-[family-name:var(--font-display)] text-[1.35rem] font-bold">{month.toLocaleString("en-US", { month: "long", year: "numeric" })}</h2>
          <button type="button" onClick={() => setMonth(new Date(year, monthIndex + 1, 1))} aria-label="Next month" className={navButtonClass}>
            ›
          </button>
        </div>

        {!ready && <p className="py-10 text-center text-[#6b6590]">Loading chores…</p>}
        {ready && loadError && <p className="py-10 text-center text-[#b3402f]">{loadError}</p>}

        {ready && !loadError && (
          <>
            <div className="overflow-x-auto">
              <div className="grid min-w-[560px] grid-cols-7 gap-[0.45rem]">
                {WEEKDAYS.map((day) => (
                  <div key={day} className="py-1.5 text-center text-xs font-semibold uppercase tracking-[0.04em] text-[#6b6590]">{day}</div>
                ))}
                {cells.map((date) => {
                  const iso = toIso(date);
                  const inMonth = date.getMonth() === monthIndex;
                  const due = inMonth ? chores.filter((chore) => chore.due === iso) : [];
                  return (
                    <div
                      key={iso}
                      className={`flex min-h-[88px] flex-col gap-1 rounded-xl p-[0.45rem] ${inMonth ? "bg-white/70" : "opacity-40"} ${iso === today ? "ring-2 ring-inset ring-[#9a7fb0]" : ""}`}
                    >
                      <span className="text-[0.8rem] font-semibold">{date.getDate()}</span>
                      {due.slice(0, 2).map((chore) => (
                        <span key={chore.id} title={chore.title} className={`truncate rounded-md px-1.5 py-0.5 text-[0.68rem] font-medium ${STATUS_STYLE[chore.status].pill}`}>
                          {chore.title}
                        </span>
                      ))}
                      {due.length > 2 && <span className="text-[0.68rem] text-[#6b6590]">+{due.length - 2} more</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[#6b6590]">
              <ul className="flex flex-wrap gap-4">
                {Object.values(STATUS_STYLE).map((style) => (
                  <li key={style.label} className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                    {style.label}
                  </li>
                ))}
              </ul>
              {undated > 0 && (
                <p>
                  {undated} {undated === 1 ? "chore has" : "chores have"} no due date
                </p>
              )}
            </div>
          </>
        )}
      </section>
    </>
  );
}
