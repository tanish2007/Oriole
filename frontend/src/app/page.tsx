"use client";

import { useMemo, useState } from "react";
import { Fraunces, Outfit } from "next/font/google";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const sans = Outfit({ subsets: ["latin"], variable: "--font-sans" });

type Status = "available" | "in_progress" | "completed";
type Chore = {
  id: number;
  title: string;
  detail: string;
  points: number;
  due: string;
  assignee: string | null;
  status: Status;
};
type Reward = { id: number; title: string; cost: number; scope: "Group" | "Personal" };

const ME = "Alex Rivera";
const GROUP = { name: "Maple House", members: 4 };

const INITIAL_CHORES: Chore[] = [
  { id: 1, title: "Kitchen deep clean", detail: "Counters, sink, stove, floors", points: 15, due: "Oct 12", assignee: null, status: "available" },
  { id: 2, title: "Take out trash", detail: "Kitchen + bathrooms", points: 5, due: "Oct 11", assignee: "Jordan Lee", status: "in_progress" },
  { id: 3, title: "Vacuum living room", detail: "Rugs and under couch", points: 10, due: "Oct 14", assignee: ME, status: "in_progress" },
  { id: 4, title: "Grocery run", detail: "Shared list on fridge", points: 12, due: "Oct 13", assignee: null, status: "available" },
  { id: 5, title: "Wipe bathrooms", detail: "Sinks, mirrors, counters", points: 10, due: "Oct 9", assignee: "Sam Okonkwo", status: "completed" },
  { id: 6, title: "Laundry fold & put away", detail: "Shared towels only", points: 8, due: "Oct 16", assignee: null, status: "available" },
];

const REWARDS: Reward[] = [
  { id: 1, title: "Pick dinner", cost: 25, scope: "Group" },
  { id: 2, title: "Skip one chore", cost: 40, scope: "Group" },
  { id: 3, title: "Choose movie night", cost: 20, scope: "Personal" },
];

const OTHER_MEMBERS = [
  { name: "Sam Okonkwo", points: 55 },
  { name: "Jordan Lee", points: 38 },
  { name: "Riley Chen", points: 27 },
];

const FILTERS = ["All", "Available", "Mine", "Done"] as const;
type Filter = (typeof FILTERS)[number];

const STATUS_STYLE: Record<Status, { label: string; pill: string; dot: string }> = {
  available: { label: "Available", pill: "bg-[#ebe6f1] text-[#1c2750]", dot: "bg-[#1c2750]" },
  in_progress: { label: "In progress", pill: "bg-[#ebe6f1] text-[#9a7fb0]", dot: "bg-[#b79fca]" },
  completed: { label: "Completed", pill: "bg-[#dcefe3] text-[#2f6b4a]", dot: "bg-[#3f8a62]" },
};

const NAV = [
  { label: "Groups", icon: "M16 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm-8 0a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm0 2c-2.7 0-8 1.3-8 4v2h10v-2c0-1.2.5-2.2 1.3-3-.9-.6-2.2-1-3.3-1Zm8 0c-2.7 0-8 1.3-8 4v2h16v-2c0-2.7-5.3-4-8-4Z", sub: ["Maple House", "Study Squad", "Invite member"] },
  { label: "Chores", icon: "M9 12l2 2 4-4M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z", active: true, sub: ["Add chore", "Remove chore", "Update rewards"] },
  { label: "Calendar", icon: "M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" },
  { label: "Leaderboard", icon: "M8 21h8m-4-4v4m-5-17h10v5a5 5 0 0 1-10 0V4Zm0 2H4v1a3 3 0 0 0 3 3m10-4h3v1a3 3 0 0 1-3 3" },
];

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

export default function Home() {
  const [chores, setChores] = useState(INITIAL_CHORES);
  const [filter, setFilter] = useState<Filter>("All");
  const [myPoints, setMyPoints] = useState(42);
  const [toast, setToast] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>("Chores");
  const [mobileOpen, setMobileOpen] = useState(false);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  const claim = (id: number) => {
    setChores((cs) => cs.map((c) => (c.id === id ? { ...c, assignee: ME, status: "in_progress" } : c)));
    notify("Chore claimed");
  };

  const complete = (id: number) => {
    const chore = chores.find((c) => c.id === id);
    if (!chore) return;
    setChores((cs) => cs.map((c) => (c.id === id ? { ...c, status: "completed" } : c)));
    setMyPoints((p) => p + chore.points);
    notify(`Completed. +${chore.points} points`);
  };

  const redeem = (reward: Reward) => {
    if (myPoints < reward.cost) return;
    setMyPoints((p) => p - reward.cost);
    notify(`Redeemed: ${reward.title}`);
  };

  const visible = useMemo(
    () =>
      chores.filter((c) => {
        if (filter === "Available") return c.status === "available";
        if (filter === "Mine") return c.assignee === ME;
        if (filter === "Done") return c.status === "completed";
        return true;
      }),
    [chores, filter],
  );

  const leaderboard = useMemo(
    () => [...OTHER_MEMBERS, { name: ME, points: myPoints }].sort((a, b) => b.points - a.points),
    [myPoints],
  );

  return (
    <div className={`${display.variable} ${sans.variable} flex min-h-screen font-[family-name:var(--font-sans)] text-[#1c2750]`}>
      {/* Sidebar */}
      <button
  onClick={() => setMobileOpen((o) => !o)}
  aria-label="Toggle menu"
  className="fixed left-3 top-3 z-40 grid h-10 w-10 place-items-center rounded-xl border border-[#d9d0e6] bg-white/80 text-lg md:hidden"
>
  ☰
</button>
{mobileOpen && (
  <div onClick={() => setMobileOpen(false)} className="fixed inset-0 z-20 bg-[#1e2d54]/40 md:hidden" />
)}

<aside
  className={`fixed inset-y-0 left-0 z-30 flex w-64 shrink-0 flex-col bg-[#1e2d54] p-3 text-[#dfe3f0] transition-transform duration-200 md:sticky md:top-0 md:h-screen md:w-52 md:translate-x-0 ${
    mobileOpen ? "translate-x-0" : "-translate-x-full"
  }`}
>
  <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
    <div className="grid h-8 w-8 place-items-center rounded-full bg-[#cdbfe0] text-sm font-semibold text-[#1e2d54]">A</div>
    <div className="min-w-0 leading-tight">
      <p className="truncate text-sm font-semibold text-white">{ME}</p>
      <p className="truncate text-xs text-[#b8c0da]">alex@umass.edu</p>
    </div>
  </div>

  <nav className="mt-8 flex flex-col gap-1">
    {NAV.map((item) => (
      <div key={item.label}>
        <button
          onClick={() => {
            if (item.sub) setOpenMenu(openMenu === item.label ? null : item.label);
            else {
              setOpenMenu(null);
              setMobileOpen(false);
            }
          }}
          aria-current={item.active ? "page" : undefined}
          aria-expanded={item.sub ? openMenu === item.label : undefined}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#cdbfe0] ${
            item.active ? "bg-white/10 text-white" : "hover:bg-white/5"
          }`}
        >
          <Icon d={item.icon} />
          {item.label}
        </button>

        {item.sub && openMenu === item.label && (
          <ul className="ml-5 mt-1 flex flex-col gap-0.5 border-l border-white/20 pl-3">
            {item.sub.map((s) => (
              <li key={s}>
                <button
                  onClick={() => {
                    notify(`${s} (coming soon)`);
                    setMobileOpen(false);
                  }}
                  className="w-full rounded-lg px-2 py-1.5 text-left text-sm text-white/85 hover:bg-white/10"
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    ))}
  </nav>

  <div className="mt-auto flex items-center gap-2.5 p-2">
    <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/10">
      <span className="h-3.5 w-3.5 rounded-[4px] border-2 border-white/80" />
    </div>
    <span className="font-[family-name:var(--font-display)] text-lg font-semibold text-white">ChoreShare</span>
  </div>
</aside>

      {/* Main */}
      <main className="flex-1 bg-gradient-to-br from-[#e6dbe9] via-[#f1e4e8] to-[#e4d8e8] p-5 pt-16 sm:p-8 sm:pt-16 md:pt-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#9a7fb0]">Current group</p>
            <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold leading-tight">{GROUP.name}</h1>
            <p className="mt-1 text-[#7c6f9c]">{GROUP.members} members · You are a member</p>
          </div>
          <div className="flex gap-2 text-sm">
            <span className="rounded-full border border-[#d9d0e6] bg-white/50 px-4 py-2">Weekly reset: Sunday</span>
            <span className="rounded-full border border-[#d9d0e6] bg-white/50 px-4 py-2">
              Your points: <strong>{myPoints}</strong>
            </span>
          </div>
        </header>

        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
          {/* Chore tracking */}
          <section className="self-start rounded-3xl border border-white/70 bg-[#f4f0f8]/90 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Chore tracking</h2>
              <div role="tablist" aria-label="Filter chores" className="flex rounded-xl bg-[#e9e3f1] p-1">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    role="tab"
                    aria-selected={filter === f}
                    onClick={() => setFilter(f)}
                    className={`rounded-lg px-4 py-1.5 text-[15px] font-medium transition-colors ${
                      filter === f ? "bg-white shadow-sm" : "text-[#6b6590] hover:text-[#1c2750]"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
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
                    const mine = c.assignee === ME;
                    return (
                      <tr key={c.id} className="border-b border-[#d5cde3] last:border-0">
                        <td className="py-4 pr-4">
                          <p className="font-semibold">{c.title}</p>
                          <p className="text-sm text-[#6b6590]">{c.detail}</p>
                        </td>
                        <td className="pr-4">
                          <span className="inline-grid h-8 min-w-10 place-items-center rounded-full bg-[#e5deee] px-2 text-sm font-semibold">{c.points}</span>
                        </td>
                        <td className="pr-4 text-[15px]">{c.due}</td>
                        <td className="pr-4 text-[15px]">{c.assignee ?? "—"}</td>
                        <td className="pr-4">
                          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${s.pill}`}>
                            <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                            {s.label}
                          </span>
                        </td>
                        <td className="text-right">
                          {c.status === "available" && (
                            <button onClick={() => claim(c.id)} className="rounded-lg bg-[#1c2750] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2b3a6e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1c2750]">
                              Claim
                            </button>
                          )}
                          {c.status === "in_progress" && mine && (
                            <button onClick={() => complete(c.id)} className="rounded-lg bg-[#1c2750] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2b3a6e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1c2750]">
                              Complete
                            </button>
                          )}
                          {c.status === "in_progress" && !mine && (
                            <button disabled className="rounded-lg border border-[#d5cde3] px-4 py-2 text-sm font-medium text-[#a59fbd]">Claimed</button>
                          )}
                          {c.status === "completed" && (
                            <button disabled className="rounded-lg border border-[#d5cde3] px-4 py-2 text-sm font-medium text-[#a59fbd]">Done</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {visible.length === 0 && (
                <p className="py-10 text-center text-[#6b6590]">No chores match this filter. Try another tab.</p>
              )}
            </div>
          </section>

          {/* Right column */}
          <div className="flex flex-col gap-5">
            <section className="rounded-3xl border border-white/70 bg-[#f4f0f8]/90 p-5">
              <h2 className="text-xl font-semibold">Possible rewards</h2>
              <ul className="mt-4 flex flex-col gap-3">
                {REWARDS.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 rounded-2xl bg-[#ebe6f1] p-3.5">
                    <div>
                      <p className="font-semibold leading-snug">{r.title}</p>
                      <p className="text-sm text-[#6b6590]">{r.cost} pts · {r.scope}</p>
                    </div>
                    <button
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

            <section className="rounded-3xl border border-white/70 bg-[#f4f0f8]/90 p-5">
              <h2 className="text-xl font-semibold">Points tracker</h2>
              <ol className="mt-4 flex flex-col gap-3">
                {leaderboard.map((m, i) => (
                  <li key={m.name} className="flex items-center gap-3 rounded-2xl bg-[#ebe6f1] px-3.5 py-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#1c2750] text-sm font-semibold text-white">{i + 1}</span>
                    <span className="flex-1 font-semibold">{m.name}{m.name === ME && " (you)"}</span>
                    <span className="font-semibold text-[#9a7fb0]">{m.points}</span>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </div>

        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-[#1c2750] px-5 py-2.5 text-sm font-medium text-white shadow-lg transition-all duration-200 ${
            toast ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
          }`}
        >
          {toast}
        </div>
      </main>
    </div>
  );
}
