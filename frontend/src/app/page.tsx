"use client";

import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Fraunces, Outfit } from "next/font/google";
import {
  CURRENT_GROUP,
  CURRENT_USER,
  type Chore,
  type CreateChoreInput,
  type Member,
  type Reward,
  type Status,
  claimChore,
  completeChore,
  createChore,
  deleteChore,
  listChores,
  listMembers,
  listRewards,
  redeemReward,
} from "@/lib/chores";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const sans = Outfit({ subsets: ["latin"], variable: "--font-sans" });

type NewChore = Omit<CreateChoreInput, "groupId">;

const FILTERS = ["All", "Available", "Mine", "Done"] as const;
type Filter = (typeof FILTERS)[number];

const STATUS_STYLE: Record<Status, { label: string; pill: string; dot: string }> = {
  available: { label: "Available", pill: "bg-[#ebe6f1] text-[#1c2750]", dot: "bg-[#1c2750]" },
  in_progress: { label: "In progress", pill: "bg-[#ebe6f1] text-[#9a7fb0]", dot: "bg-[#b79fca]" },
  completed: { label: "Completed", pill: "bg-[#dcefe3] text-[#2f6b4a]", dot: "bg-[#3f8a62]" },
};

const NAV = [
  { label: "Groups", icon: "M16 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm-8 0a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm0 2c-2.7 0-8 1.3-8 4v2h10v-2c0-1.2.5-2.2 1.3-3-.9-.6-2.2-1-3.3-1Zm8 0c-2.7 0-8 1.3-8 4v2h16v-2c0-2.7-5.3-4-8-4Z", sub: ["Maple House", "Study Squad", "Invite member"] },
  // Highlight stays on Chores because this screen is the chores page.
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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDue(iso: string) {
  const [, month, day] = iso.split("-").map(Number);
  if (!month || !day || month < 1 || month > 12) return iso;
  return `${MONTHS[month - 1]} ${day}`;
}

function assigneeName(assigneeId: number | null, members: Member[]) {
  if (assigneeId == null) return null;
  return members.find((member) => member.id === assigneeId)?.name ?? "Unknown";
}

const inputClass =
  "w-full rounded-xl border border-[#d5cde3] bg-white px-3.5 py-2.5 text-[15px] outline-none transition-colors placeholder:text-[#a59fbd] focus:border-[#9a7fb0] focus:ring-2 focus:ring-[#9a7fb0]/30";

function Field({ id, label, optional, error, children }: { id: string; label: string; optional?: boolean; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
        {optional && <span className="font-normal text-[#6b6590]"> (optional)</span>}
      </label>
      {children}
      {error && <p className="mt-1.5 text-sm text-[#b3402f]">{error}</p>}
    </div>
  );
}

function RemoveChoreModal({
  chores,
  members,
  pending,
  onClose,
  onRemove,
}: {
  chores: Chore[];
  members: Member[];
  pending: boolean;
  onClose: () => void;
  onRemove: (id: number) => void;
}) {
  const [confirmId, setConfirmId] = useState<number | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#1c2750]/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="remove-chore-title"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[min(32rem,calc(100vh-2rem))] w-full max-w-md flex-col gap-4 rounded-3xl border border-white/70 bg-[#f4f0f8] p-6 shadow-2xl"
      >
        <h2 id="remove-chore-title" className="font-[family-name:var(--font-display)] text-2xl font-bold">
          Remove chore
        </h2>
        {chores.length === 0 ? (
          <p className="text-sm text-[#6b6590]">No chores to remove.</p>
        ) : (
          <ul className="flex flex-col gap-2 overflow-y-auto">
            {chores.map((chore) => {
              const confirming = confirmId === chore.id;
              const name = assigneeName(chore.assigneeId, members);
              return (
                <li key={chore.id} className="flex items-center justify-between gap-3 rounded-2xl bg-[#ebe6f1] px-3.5 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{chore.title}</p>
                    <p className="text-sm text-[#6b6590]">
                      {formatDue(chore.due)}
                      {name ? ` · ${name}` : ""}
                    </p>
                  </div>
                  {confirming ? (
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        className="rounded-lg border border-[#d5cde3] bg-white px-3 py-1.5 text-sm font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => onRemove(chore.id)}
                        className="rounded-lg bg-[#b3402f] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmId(chore.id)}
                      className="shrink-0 rounded-lg border border-[#d5cde3] bg-white px-3 py-1.5 text-sm font-semibold"
                    >
                      Remove
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex justify-end">
          <button type="button" onClick={onClose} className="rounded-lg border border-[#d5cde3] px-4 py-2 text-sm font-semibold transition-colors hover:bg-white/60">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function AddChoreModal({ onClose, onAdd }: { onClose: () => void; onAdd: (chore: NewChore) => void }) {
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [points, setPoints] = useState("");
  const [due, setDue] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    const pts = Number(points);
    if (!title.trim()) next.title = "Enter a chore title.";
    if (!Number.isInteger(pts) || pts < 1) next.points = "Enter whole points, 1 or more.";
    if (!due) next.due = "Pick a due date.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    onAdd({ title: title.trim(), detail: detail.trim(), points: pts, due });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#1c2750]/40 p-4" onClick={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-chore-title"
        onSubmit={submit}
        onClick={(event) => event.stopPropagation()}
        noValidate
        className="flex w-full max-w-md flex-col gap-4 rounded-3xl border border-white/70 bg-[#f4f0f8] p-6 shadow-2xl"
      >
        <h2 id="add-chore-title" className="font-[family-name:var(--font-display)] text-2xl font-bold">
          Add chore
        </h2>

        <Field id="chore-title" label="Title" error={errors.title}>
          <input id="chore-title" autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Clean the fridge" className={inputClass} />
        </Field>

        <Field id="chore-detail" label="Description" optional>
          <textarea id="chore-detail" rows={2} value={detail} onChange={(event) => setDetail(event.target.value)} placeholder="Toss expired food, wipe shelves" className={`${inputClass} resize-none`} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field id="chore-points" label="Points" error={errors.points}>
            <input id="chore-points" type="number" min={1} step={1} inputMode="numeric" value={points} onChange={(event) => setPoints(event.target.value)} placeholder="10" className={inputClass} />
          </Field>
          <Field id="chore-due" label="Due date" error={errors.due}>
            <input id="chore-due" type="date" value={due} onChange={(event) => setDue(event.target.value)} className={inputClass} />
          </Field>
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-[#d5cde3] px-4 py-2 text-sm font-semibold transition-colors hover:bg-white/60">
            Cancel
          </button>
          <button type="submit" className="rounded-lg bg-[#1c2750] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2b3a6e]">
            Add chore
          </button>
        </div>
      </form>
    </div>
  );
}

export default function Home() {
  const [chores, setChores] = useState<Chore[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [filter, setFilter] = useState<Filter>("All");
  const [toast, setToast] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>("Chores");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const toastTimer = useRef<number | null>(null);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2400);
  }, []);

  const closeModal = useCallback(() => setModalOpen(false), []);
  const closeRemove = useCallback(() => setRemoveOpen(false), []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listChores(CURRENT_GROUP.id), listMembers(CURRENT_GROUP.id), listRewards()])
      .then(([nextChores, nextMembers, nextRewards]) => {
        if (cancelled) return;
        setChores(nextChores);
        setMembers(nextMembers);
        setRewards(nextRewards);
      })
      .catch(() => {
        if (!cancelled) notify("Could not load chores");
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [notify]);

  const myPoints = members.find((member) => member.id === CURRENT_USER.id)?.points ?? 0;

  const claim = async (id: number) => {
    if (pending) return;
    setPending(true);
    try {
      const chore = await claimChore(id);
      setChores((current) => current.map((item) => (item.id === chore.id ? chore : item)));
      notify("Chore claimed");
    } catch {
      notify("Could not claim chore");
    } finally {
      setPending(false);
    }
  };

  const complete = async (id: number) => {
    if (pending) return;
    setPending(true);
    try {
      const { chore, points } = await completeChore(id);
      setChores((current) => current.map((item) => (item.id === chore.id ? chore : item)));
      setMembers((current) => current.map((member) => (member.id === CURRENT_USER.id ? { ...member, points } : member)));
      notify(`Completed. +${chore.points} points`);
    } catch {
      notify("Could not complete chore");
    } finally {
      setPending(false);
    }
  };

  const redeem = async (reward: Reward) => {
    if (pending || myPoints < reward.cost) return;
    setPending(true);
    try {
      const member = await redeemReward(reward.id);
      setMembers((current) => current.map((item) => (item.id === member.id ? member : item)));
      notify(`Redeemed: ${reward.title}`);
    } catch {
      notify("Could not redeem reward");
    } finally {
      setPending(false);
    }
  };

  const removeChore = async (id: number) => {
    if (pending) return;
    setPending(true);
    try {
      await deleteChore(id);
      setChores((current) => current.filter((chore) => chore.id !== id));
      notify("Chore removed");
    } catch {
      notify("Could not remove chore");
    } finally {
      setPending(false);
    }
  };

  const addChore = async (input: NewChore) => {
    if (pending) return;
    setPending(true);
    try {
      const chore = await createChore({ ...input, groupId: CURRENT_GROUP.id });
      setChores((current) => [...current, chore]);
      setFilter("All");
      setModalOpen(false);
      notify("Chore added");
    } catch {
      notify("Could not add chore");
    } finally {
      setPending(false);
    }
  };

  const visible = useMemo(
    () =>
      chores.filter((chore) => {
        if (filter === "Available") return chore.status === "available";
        if (filter === "Mine") return chore.assigneeId === CURRENT_USER.id;
        if (filter === "Done") return chore.status === "completed";
        return true;
      }),
    [chores, filter],
  );

  const leaderboard = useMemo(
    () => [...members].sort((a, b) => b.points - a.points),
    [members],
  );

  return (
    <div className={`${display.variable} ${sans.variable} flex min-h-screen font-[family-name:var(--font-sans)] text-[#1c2750]`}>
      {/* Sidebar */}
      {!mobileOpen && (
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          aria-expanded={false}
          aria-controls="sidebar"
          className="fixed left-3 top-3 z-40 grid h-10 w-10 place-items-center rounded-xl border border-[#d9d0e6] bg-white/80 text-lg md:hidden"
        >
          ☰
        </button>
      )}
      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)} className="fixed inset-0 z-20 bg-[#1e2d54]/40 md:hidden" />
      )}

      <aside
        id="sidebar"
        className={`fixed inset-y-0 left-0 z-30 flex w-64 shrink-0 flex-col bg-[#1e2d54] p-3 text-[#dfe3f0] transition-transform duration-200 md:sticky md:top-0 md:h-screen md:w-52 md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-[#cdbfe0] text-sm font-semibold text-[#1e2d54]">A</div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold text-white">{CURRENT_USER.name}</p>
            <p className="truncate text-xs text-[#b8c0da]">{CURRENT_USER.email}</p>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            aria-expanded={true}
            aria-controls="sidebar"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-lg text-white hover:bg-white/10 md:hidden"
          >
            ×
          </button>
        </div>

        <nav className="mt-8 flex flex-col gap-1">
          {NAV.map((item) => (
            <div key={item.label}>
              <button
                type="button"
                onClick={() => {
                  if (item.sub) {
                    setOpenMenu(openMenu === item.label ? null : item.label);
                    return;
                  }
                  notify(`${item.label} (coming soon)`);
                  setMobileOpen(false);
                }}
                aria-current={item.active ? "page" : undefined}
                aria-expanded={item.sub ? openMenu === item.label : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#cdbfe0] ${
                  item.active ? "bg-white/10 text-white" : "hover:bg-white/5"
                }`}
              >
                <Icon d={item.icon} />
                {item.label}
                {item.sub && (
                  <svg
                    viewBox="0 0 24 24"
                    className={`ml-auto h-4 w-4 shrink-0 transition-transform ${openMenu === item.label ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                )}
              </button>

              {item.sub && openMenu === item.label && (
                <ul className="ml-5 mt-1 flex flex-col gap-0.5 border-l border-white/20 pl-3">
                  {item.sub.map((s) => (
                    <li key={s}>
                      <button
                        type="button"
                        onClick={() => {
                          if (s === "Add chore") {
                            setRemoveOpen(false);
                            setModalOpen(true);
                            setMobileOpen(false);
                            return;
                          }
                          if (s === "Remove chore") {
                            setModalOpen(false);
                            setRemoveOpen(true);
                            setMobileOpen(false);
                            return;
                          }
                          notify(`${s} (coming soon)`);
                          setMobileOpen(false);
                        }}
                        className="w-full rounded-lg px-2 py-1.5 text-left text-sm text-white/85 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-[#cdbfe0]"
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
            <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold leading-tight">{CURRENT_GROUP.name}</h1>
            <p className="mt-1 text-[#7c6f9c]">{CURRENT_GROUP.memberCount} members · You are a member</p>
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
              {!ready && (
                <p className="py-10 text-center text-[#6b6590]">Loading chores…</p>
              )}
              {ready && visible.length === 0 && (
                <p className="py-10 text-center text-[#6b6590]">No chores match this filter. Try another tab.</p>
              )}
            </div>
          </section>

          {/* Right column */}
          <div className="flex flex-col gap-5">
            <section className="rounded-3xl border border-white/70 bg-[#f4f0f8]/90 p-5">
              <h2 className="text-xl font-semibold">Possible rewards</h2>
              <ul className="mt-4 flex flex-col gap-3">
                {rewards.map((r) => (
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
                  <li key={m.id} className="flex items-center gap-3 rounded-2xl bg-[#ebe6f1] px-3.5 py-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#1c2750] text-sm font-semibold text-white">{i + 1}</span>
                    <span className="flex-1 font-semibold">{m.name}{m.id === CURRENT_USER.id && " (you)"}</span>
                    <span className="font-semibold text-[#9a7fb0]">{m.points}</span>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </div>

        {modalOpen && <AddChoreModal onClose={closeModal} onAdd={addChore} />}
        {removeOpen && (
          <RemoveChoreModal
            chores={chores}
            members={members}
            pending={pending}
            onClose={closeRemove}
            onRemove={removeChore}
          />
        )}

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
