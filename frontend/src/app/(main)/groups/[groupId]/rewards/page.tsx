"use client";

import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from "react";
import { useGroup, useNotify } from "@/components/app-shell";
import { listMembers } from "@/lib/chores";
import {
  createReward,
  deleteReward,
  listRewards,
  redeemReward,
  updateReward,
  type Reward,
  type RewardInput,
  type RewardScope,
} from "@/lib/rewards";
import { CURRENT_USER } from "@/lib/session";

const inputClass =
  "w-full rounded-xl border border-[#d5cde3] bg-white px-4 py-3 text-base outline-none transition-colors placeholder:text-[#a59fbd] focus:border-[#9a7fb0] focus:ring-2 focus:ring-[#9a7fb0]/30";

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-base font-semibold">{label}</label>
      {children}
      {error && <p className="mt-1.5 text-base text-[#b3402f]">{error}</p>}
    </div>
  );
}

function RewardModal({
  heading,
  submitLabel,
  initial,
  pending,
  onClose,
  onSubmit,
}: {
  heading: string;
  submitLabel: string;
  initial?: RewardInput;
  pending: boolean;
  onClose: () => void;
  onSubmit: (input: RewardInput) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [cost, setCost] = useState(initial ? String(initial.cost) : "");
  const [scope, setScope] = useState<RewardScope>(initial?.scope ?? "Group");
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
    const pts = Number(cost);
    if (!title.trim()) next.title = "Enter a reward name.";
    if (!Number.isInteger(pts) || pts < 1) next.cost = "Enter whole points, 1 or more.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    onSubmit({ title: title.trim(), cost: pts, scope });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#1c2750]/40 p-4" onClick={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="reward-modal-title"
        onSubmit={submit}
        onClick={(event) => event.stopPropagation()}
        noValidate
        className="flex w-full max-w-md flex-col gap-4 rounded-3xl border border-white/70 bg-[#f4f0f8] p-6 shadow-2xl"
      >
        <h2 id="reward-modal-title" className="font-[family-name:var(--font-display)] text-2xl font-bold">
          {heading}
        </h2>

        <Field id="reward-title" label="Reward name" error={errors.title}>
          <input id="reward-title" autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Free coffee run" className={inputClass} />
        </Field>

        <Field id="reward-cost" label="Point cost" error={errors.cost}>
          <input id="reward-cost" type="number" min={1} step={1} inputMode="numeric" value={cost} onChange={(event) => setCost(event.target.value)} placeholder="30" className={inputClass} />
        </Field>

        <Field id="reward-scope" label="Type">
          <select id="reward-scope" value={scope} onChange={(event) => setScope(event.target.value as RewardScope)} className={inputClass}>
            <option value="Group">Group reward</option>
            <option value="Personal">Personal reward</option>
          </select>
        </Field>

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

export default function RewardsPage() {
  const notify = useNotify();
  const group = useGroup();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [points, setPoints] = useState(0);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Reward | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listRewards(group.id), listMembers(group.id)])
      .then(([nextRewards, members]) => {
        if (cancelled) return;
        setRewards(nextRewards);
        setPoints(members.find((member) => member.id === CURRENT_USER.id)?.points ?? 0);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "Could not load rewards";
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
    setCreating(false);
    setEditing(null);
  }, []);

  const save = async (input: RewardInput) => {
    if (pending) return;
    setPending(true);
    try {
      if (editing) {
        const reward = await updateReward(group.id, editing.id, input);
        setRewards((current) => current.map((item) => (item.id === reward.id ? reward : item)));
        setEditing(null);
        notify("Reward updated");
      } else {
        const reward = await createReward(group.id, input);
        setRewards((current) => [...current, reward]);
        setCreating(false);
        notify("Reward added");
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not save reward");
    } finally {
      setPending(false);
    }
  };

  const remove = async (id: number) => {
    if (pending) return;
    setPending(true);
    try {
      await deleteReward(group.id, id);
      setRewards((current) => current.filter((reward) => reward.id !== id));
      setConfirmId(null);
      notify("Reward removed");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not remove reward");
    } finally {
      setPending(false);
    }
  };

  const redeem = async (reward: Reward) => {
    if (pending || points < reward.cost) return;
    setPending(true);
    try {
      const member = await redeemReward(group.id, reward.id);
      setPoints(member.points);
      notify(`Redeemed: ${reward.title}`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not redeem reward");
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-base font-medium text-[#9a7fb0]">Current group</p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold leading-tight">Rewards</h1>
          <p className="mt-1 text-[#7c6f9c]">{group.name} · spend points, or change what the group can redeem</p>
        </div>
        <span className="rounded-full border border-[#d9d0e6] bg-white/50 px-4 py-2.5 text-base">
          Your points: <strong>{points}</strong>
        </span>
      </header>

      <section className="mt-6 rounded-3xl border border-white/70 bg-[#f4f0f8]/90 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Possible rewards</h2>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setCreating(true);
            }}
            className="rounded-lg bg-[#1c2750] px-4 py-2.5 text-base font-semibold text-white transition-colors hover:bg-[#2b3a6e]"
          >
            Add reward
          </button>
        </div>

        {!ready && <p className="py-10 text-center text-[#6b6590]">Loading rewards…</p>}
        {ready && loadError && <p className="py-10 text-center text-[#b3402f]">{loadError}</p>}
        {ready && !loadError && rewards.length === 0 && (
          <p className="py-10 text-center text-[#6b6590]">No rewards yet. Add one for the group.</p>
        )}

        {ready && rewards.length > 0 && (
          <ul className="mt-5 flex flex-col gap-3">
            {rewards.map((reward) => {
              const confirming = confirmId === reward.id;
              const short = points < reward.cost;
              return (
                <li key={reward.id} className="flex flex-col gap-3 rounded-2xl bg-[#ebe6f1] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold">{reward.title}</p>
                    <p className="text-base text-[#6b6590]">{reward.cost} pts · {reward.scope}</p>
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
                        onClick={() => remove(reward.id)}
                        className="rounded-lg bg-[#b3402f] px-4 py-2.5 text-base font-semibold text-white disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => redeem(reward)}
                        disabled={short || pending}
                        title={short ? `Need ${reward.cost - points} more points` : undefined}
                        className="rounded-lg bg-[#9a7fb0] px-4 py-2.5 text-base font-semibold text-white transition-colors hover:bg-[#8869a0] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Redeem
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCreating(false);
                          setEditing(reward);
                        }}
                        className="rounded-lg border border-[#d5cde3] bg-white px-4 py-2.5 text-base font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(reward.id)}
                        className="rounded-lg border border-[#d5cde3] bg-white px-4 py-2.5 text-base font-semibold"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {creating && (
        <RewardModal heading="Add reward" submitLabel="Add reward" pending={pending} onClose={closeModal} onSubmit={save} />
      )}
      {editing && (
        <RewardModal
          heading="Edit reward"
          submitLabel="Save"
          initial={{ title: editing.title, cost: editing.cost, scope: editing.scope }}
          pending={pending}
          onClose={closeModal}
          onSubmit={save}
        />
      )}
    </>
  );
}
