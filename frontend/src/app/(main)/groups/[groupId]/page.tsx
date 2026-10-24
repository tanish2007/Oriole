"use client";

import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useGroup, useNotify } from "@/components/app-shell";
import {
  CURRENT_USER,
  type Chore,
  type ChoreInput,
  type Member,
  type Status,
  claimChore,
  completeChore,
  createChore,
  deleteChore,
  listChores,
  listMembers,
  updateChore,
} from "@/lib/chores";
import { getLeaderboard, type LeaderboardEntry } from "@/lib/leaderboard";
import { type Reward, listRewards, redeemReward } from "@/lib/rewards";
import { householdPath } from "@/lib/session";

const FILTERS = ["All", "Available", "Mine", "Done"] as const;
type Filter = (typeof FILTERS)[number];

const STATUS_STYLE: Record<Status, { label: string; pill: string; dot: string }> = {
  available: { label: "Available", pill: "bg-[#fde8e6] text-[#9f1239]", dot: "bg-[#e11d48]" },
  in_progress: { label: "In progress", pill: "bg-[#fff4cc] text-[#854d0e]", dot: "bg-[#eab308]" },
  completed: { label: "Completed", pill: "bg-[#dcfce7] text-[#166534]", dot: "bg-[#16a34a]" },
};

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
  "w-full rounded-xl border border-[#d5cde3] bg-white px-4 py-3 text-base outline-none transition-colors placeholder:text-[#a59fbd] focus:border-[#9a7fb0] focus:ring-2 focus:ring-[#9a7fb0]/30";

function Field({ id, label, optional, error, children }: { id: string; label: string; optional?: boolean; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-base font-semibold">
        {label}
        {optional && <span className="font-normal text-[#6b6590]"> (optional)</span>}
      </label>
      {children}
      {error && <p className="mt-1.5 text-base text-[#b3402f]">{error}</p>}
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
          <p className="text-base text-[#6b6590]">No chores to remove.</p>
        ) : (
          <ul className="flex flex-col gap-2 overflow-y-auto">
            {chores.map((chore) => {
              const confirming = confirmId === chore.id;
              const name = assigneeName(chore.assigneeId, members);
              return (
                <li key={chore.id} className="flex items-center justify-between gap-3 rounded-2xl bg-[#ebe6f1] px-3.5 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{chore.title}</p>
                    <p className="text-base text-[#6b6590]">
                      {formatDue(chore.due)}
                      {name ? ` · ${name}` : ""}
                    </p>
                  </div>
                  {confirming ? (
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        className="rounded-lg border border-[#d5cde3] bg-white px-4 py-2.5 text-base font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => onRemove(chore.id)}
                        className="rounded-lg bg-[#b3402f] px-4 py-2.5 text-base font-semibold text-white disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmId(chore.id)}
                      className="shrink-0 rounded-lg border border-[#d5cde3] bg-white px-4 py-2.5 text-base font-semibold"
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
          <button type="button" onClick={onClose} className="rounded-lg border border-[#d5cde3] px-4 py-2.5 text-base font-semibold transition-colors hover:bg-white/60">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function ChoreModal({
  heading,
  submitLabel,
  initial,
  pending,
  onClose,
  onSubmit,
}: {
  heading: string;
  submitLabel: string;
  initial?: ChoreInput;
  pending: boolean;
  onClose: () => void;
  onSubmit: (chore: ChoreInput) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [detail, setDetail] = useState(initial?.detail ?? "");
  const [points, setPoints] = useState(initial ? String(initial.points) : "");
  const [due, setDue] = useState(initial?.due ?? "");
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
    onSubmit({ title: title.trim(), detail: detail.trim(), points: pts, due });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#1c2750]/40 p-4" onClick={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="chore-modal-title"
        onSubmit={submit}
        onClick={(event) => event.stopPropagation()}
        noValidate
        className="flex w-full max-w-md flex-col gap-4 rounded-3xl border border-white/70 bg-[#f4f0f8] p-6 shadow-2xl"
      >
        <h2 id="chore-modal-title" className="font-[family-name:var(--font-display)] text-2xl font-bold">
          {heading}
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
          <button type="button" onClick={onClose} className="rounded-lg border border-[#d5cde3] px-4 py-2.5 text-base font-semibold transition-colors hover:bg-white/60">
            Cancel
          </button>
          <button type="submit" disabled={pending} className="rounded-lg bg-[#1c2750] px-4 py-2.5 text-base font-semibold text-white transition-colors hover:bg-[#2b3a6e] disabled:opacity-50">
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ChoresPage() {
  const notify = useNotify();
  const group = useGroup();
  const home = householdPath(group.id);
  const router = useRouter();
  const searchParams = useSearchParams();
  const panel = searchParams.get("panel");
  const [chores, setChores] = useState<Chore[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [weekBoard, setWeekBoard] = useState<LeaderboardEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [filter, setFilter] = useState<Filter>("All");
  const [editing, setEditing] = useState<Chore | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  // A first click on Remove arms it. Without a second click it goes back after 3 seconds.
  useEffect(() => {
    if (confirmId == null) return;
    const timer = window.setTimeout(() => setConfirmId(null), 3000);
    return () => window.clearTimeout(timer);
  }, [confirmId]);
  const modalOpen = panel === "add";
  const removeOpen = panel === "remove";

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      listChores(group.id),
      listMembers(group.id),
      listRewards(group.id),
      getLeaderboard(group.id, "week"),
    ])
      .then(([nextChores, nextMembers, nextRewards, nextBoard]) => {
        if (cancelled) return;
        setChores(nextChores);
        setMembers(nextMembers);
        setRewards(nextRewards);
        setWeekBoard(nextBoard);
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

  const closeModal = useCallback(() => {
    router.replace(home, { scroll: false });
  }, [router, home]);

  const closeRemove = closeModal;

  const myPoints = members.find((member) => member.id === CURRENT_USER.id)?.points ?? 0;

  const claim = async (id: number) => {
    if (pending) return;
    setPending(true);
    try {
      const chore = await claimChore(id);
      setChores((current) => current.map((item) => (item.id === chore.id ? chore : item)));
      notify("Chore claimed");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not claim chore");
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
      setWeekBoard(await getLeaderboard(group.id, "week"));
      notify(`Completed. +${chore.points} points`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not complete chore");
    } finally {
      setPending(false);
    }
  };

  const redeem = async (reward: Reward) => {
    if (pending || myPoints < reward.cost) return;
    setPending(true);
    try {
      const member = await redeemReward(group.id, reward.id);
      setMembers((current) => current.map((item) => (item.id === member.id ? member : item)));
      notify(`Redeemed: ${reward.title}`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not redeem reward");
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
      setConfirmId(null);
      notify("Chore removed");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not remove chore");
    } finally {
      setPending(false);
    }
  };

  const closeEdit = useCallback(() => setEditing(null), []);

  const saveEdit = async (input: ChoreInput) => {
    if (pending || !editing) return;
    setPending(true);
    try {
      const chore = await updateChore(editing.id, input);
      setChores((current) => current.map((item) => (item.id === chore.id ? chore : item)));
      setEditing(null);
      notify("Chore updated");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not update chore");
    } finally {
      setPending(false);
    }
  };

  const addChore = async (input: ChoreInput) => {
    if (pending) return;
    setPending(true);
    try {
      const chore = await createChore({ ...input, groupId: group.id });
      setChores((current) => [...current, chore]);
      setFilter("All");
      router.replace(home, { scroll: false });
      notify("Chore added");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not add chore");
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

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-base font-medium text-[#9a7fb0]">Current group</p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold leading-tight">{group.name}</h1>
          <p className="mt-1 text-[#7c6f9c]">
            {ready && !loadError ? `${members.length} members` : ready ? "Members unavailable" : "Loading members"} · You are {group.role === "owner" ? "the owner" : "a member"}
          </p>
        </div>
        <div className="flex gap-2 text-base">
          <span className="rounded-full border border-[#d9d0e6] bg-white/50 px-4 py-2">Weekly reset: Sunday</span>
          <span className="rounded-full border border-[#d9d0e6] bg-white/50 px-4 py-2">
            Your points: <strong>{myPoints}</strong>
          </span>
        </div>
      </header>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_17rem]">
        <section className="self-start rounded-3xl border border-white/70 bg-[#f4f0f8]/90 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">Chore tracking</h2>
              <Link
                href={`${home}?panel=add`}
                scroll={false}
                className="rounded-lg bg-[#1c2750] px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#2b3a6e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1c2750]"
              >
                Add chore
              </Link>
            </div>
            <div role="tablist" aria-label="Filter chores" className="flex rounded-xl bg-[#e9e3f1] p-1">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  role="tab"
                  aria-selected={filter === f}
                  onClick={() => setFilter(f)}
                  className={`rounded-lg px-4 py-2.5 text-base font-medium transition-colors ${
                    filter === f ? "bg-white shadow-sm" : "text-[#6b6590] hover:text-[#1c2750]"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#d5cde3] text-base text-[#6b6590]">
                  {["Chore", "Points", "Due", "Assignee", "Status"].map((h) => (
                    <th key={h} className="whitespace-nowrap pb-3 pr-2 font-semibold">{h}</th>
                  ))}
                  <th className="pb-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((c) => {
                  const s = STATUS_STYLE[c.status];
                  const mine = c.assigneeId === CURRENT_USER.id;
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setEditing(c)}
                      className="cursor-pointer border-b border-[#d5cde3] transition-colors last:border-0 hover:bg-white/50"
                    >
                      <td className="whitespace-nowrap py-3 pr-2">
                        <button
                          type="button"
                          onClick={() => setEditing(c)}
                          className="text-left font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1c2750]"
                        >
                          {c.title}
                        </button>
                      </td>
                      <td className="whitespace-nowrap pr-2">
                        <span className="inline-grid h-8 min-w-10 place-items-center rounded-full bg-[#e5deee] px-2 text-sm font-semibold">{c.points}</span>
                      </td>
                      <td className="whitespace-nowrap pr-2 text-base">{formatDue(c.due)}</td>
                      <td className="whitespace-nowrap pr-2 text-base">{assigneeName(c.assigneeId, members) ?? "—"}</td>
                      <td className="whitespace-nowrap pr-2">
                        <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium leading-none ${s.pill}`}>
                          <span className={`h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
                          {s.label}
                        </span>
                      </td>
                      {/* w-px keeps this column as narrow as its buttons, so both sit together on the right. */}
                      <td className="w-px whitespace-nowrap pl-2" onClick={(event) => event.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                        {c.status === "available" && (
                          <button onClick={() => claim(c.id)} className="rounded-lg bg-[#1c2750] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2b3a6e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1c2750]">
                            Claim
                          </button>
                        )}
                        {c.status === "in_progress" && mine && (
                          <button onClick={() => complete(c.id)} className="rounded-lg bg-[#1c2750] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2b3a6e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1c2750]">
                            Complete
                          </button>
                        )}
                        {c.status === "in_progress" && !mine && (
                          <button disabled className="rounded-lg border border-[#d5cde3] px-3 py-2 text-sm font-medium text-[#a59fbd]">Claimed</button>
                        )}
                        {c.status === "completed" && (
                          <button disabled className="rounded-lg border border-[#d5cde3] px-3 py-2 text-sm font-medium text-[#a59fbd]">Done</button>
                        )}
                        {confirmId === c.id ? (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => removeChore(c.id)}
                            aria-label={`Confirm removing ${c.title}`}
                            className="rounded-lg border border-[#b3402f] bg-[#b3402f] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#9a3627] disabled:opacity-50"
                          >
                            Confirm?
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmId(c.id)}
                            aria-label={`Remove ${c.title}`}
                            className="rounded-lg border border-[#d5cde3] bg-white px-3 py-2 text-sm font-semibold text-[#b3402f] transition-colors hover:bg-[#fde8e6]"
                          >
                            Remove
                          </button>
                        )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!ready && (
              <p className="py-10 text-center text-[#6b6590]">Loading chores…</p>
            )}
            {ready && loadError && (
              <p className="py-10 text-center text-[#b3402f]">{loadError}</p>
            )}
            {ready && !loadError && visible.length === 0 && (
              <p className="py-10 text-center text-[#6b6590]">No chores match this filter. Try another tab.</p>
            )}
          </div>
        </section>

        <div className="flex flex-col gap-4">
          <section className="rounded-3xl border border-white/70 bg-[#f4f0f8]/90 p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Possible rewards</h2>
              <Link href={householdPath(group.id, "/rewards")}className="text-sm font-semibold text-[#9a7fb0] hover:text-[#1c2750]">
                Manage
              </Link>
            </div>
            <ul className="mt-3 flex flex-col gap-2">
              {rewards.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 rounded-xl bg-[#ebe6f1] px-3 py-2">
                  <div className="min-w-0">
                    <p className="whitespace-nowrap text-sm font-semibold">{r.title}</p>
                    <p className="text-sm text-[#6b6590]">{r.cost} pts · {r.scope}</p>
                  </div>
                  <button
                    onClick={() => redeem(r)}
                    disabled={myPoints < r.cost}
                    title={myPoints < r.cost ? `Need ${r.cost - myPoints} more points` : undefined}
                    className="shrink-0 rounded-lg bg-[#9a7fb0] px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#8869a0] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Redeem
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-3xl border border-white/70 bg-[#f4f0f8]/90 p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Points tracker</h2>
              <Link href={householdPath(group.id, "/leaderboard")}className="text-sm font-semibold text-[#9a7fb0] hover:text-[#1c2750]">
                Full board
              </Link>
            </div>
            <ol className="mt-3 flex flex-col gap-2">
              {weekBoard.map((member, index) => (
                <li key={member.id} className="flex items-center gap-2.5 rounded-xl bg-[#ebe6f1] px-3 py-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#1c2750] text-sm font-semibold text-white">{index + 1}</span>
                  <span className="min-w-0 flex-1 whitespace-nowrap text-sm font-semibold">{member.name}{member.id === CURRENT_USER.id && " (you)"}</span>
                  <span className="shrink-0 text-sm font-semibold text-[#9a7fb0]">{member.points}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      {modalOpen && <ChoreModal heading="Add chore" submitLabel="Add chore" pending={pending} onClose={closeModal} onSubmit={addChore} />}
      {editing && (
        <ChoreModal
          heading="Edit chore"
          submitLabel="Save"
          initial={{ title: editing.title, detail: editing.detail, points: editing.points, due: editing.due }}
          pending={pending}
          onClose={closeEdit}
          onSubmit={saveEdit}
        />
      )}
      {removeOpen && (
        <RemoveChoreModal
          chores={chores}
          members={members}
          pending={pending}
          onClose={closeRemove}
          onRemove={removeChore}
        />
      )}
    </>
  );
}
