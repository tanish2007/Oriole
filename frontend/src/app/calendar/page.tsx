"use client";

import { useState } from "react";
import { useApp } from "@/components/app-context";
import { STATUS_STYLE, ViewHeader, panelClass, toIso } from "@/components/shared";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const navButtonClass = "grid h-9 w-9 place-items-center rounded-lg border border-[#d5cde3] bg-white text-lg";

export default function CalendarPage() {
  const { group, chores } = useApp();
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const startDay = month.getDay();
  const cellCount = Math.ceil((startDay + new Date(year, monthIndex + 1, 0).getDate()) / 7) * 7;
  const cells = Array.from({ length: cellCount }, (_, i) => new Date(year, monthIndex, i - startDay + 1));
  const today = toIso(new Date());

  return (
    <>
      <ViewHeader eyebrow="Current group" title={group?.name ?? "Loading…"} subtitle="Chore due dates this month" />

      <section className={`mt-6 ${panelClass}`}>
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={() => setMonth(new Date(year, monthIndex - 1, 1))} aria-label="Previous month" className={navButtonClass}>‹</button>
          <h2 className="text-xl font-semibold">{month.toLocaleString("en-US", { month: "long", year: "numeric" })}</h2>
          <button type="button" onClick={() => setMonth(new Date(year, monthIndex + 1, 1))} aria-label="Next month" className={navButtonClass}>›</button>
        </div>

        <div className="mt-5 overflow-x-auto">
          <div className="grid min-w-[560px] grid-cols-7 gap-1.5">
            {WEEKDAYS.map((day) => (
              <div key={day} className="pb-1 text-center text-sm font-semibold text-[#6b6590]">{day}</div>
            ))}
            {cells.map((date) => {
              const iso = toIso(date);
              const inMonth = date.getMonth() === monthIndex;
              const due = inMonth ? chores.filter((chore) => chore.due === iso) : [];
              return (
                <div key={iso} className={`min-h-24 rounded-xl p-1.5 ${inMonth ? "bg-white/60" : "opacity-40"} ${iso === today ? "ring-2 ring-[#9a7fb0]" : ""}`}>
                  <span className="text-sm font-semibold">{date.getDate()}</span>
                  {due.slice(0, 2).map((chore) => (
                    <span key={chore.id} title={chore.title} className={`mt-1 block truncate rounded-md px-1.5 py-0.5 text-xs font-medium ${STATUS_STYLE[chore.status].pill}`}>
                      {chore.title}
                    </span>
                  ))}
                  {due.length > 2 && <span className="mt-1 block text-xs text-[#6b6590]">+{due.length - 2} more</span>}
                </div>
              );
            })}
          </div>
        </div>

        <ul className="mt-5 flex flex-wrap gap-4 text-sm">
          {Object.values(STATUS_STYLE).map((style) => (
            <li key={style.label} className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
              {style.label}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
