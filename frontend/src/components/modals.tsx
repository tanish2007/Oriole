"use client";

import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from "react";
import type { Chore, Member, Reward } from "@/lib/chores";
import { type NewChore, type NewReward, useApp } from "@/components/app-context";
import { Field, assigneeName, formatDue, inputClass, listItemClass, primaryButtonClass, secondaryButtonClass } from "@/components/shared";

export function Modals() {
  const { modal, setModal, group, chores, members, pending, addChore, removeChore, addReward, addGroup } = useApp();
  const close = useCallback(() => setModal(null), [setModal]);

  if (modal === "add-chore") return <AddChoreModal maxPoints={group?.maxChorePoints} pending={pending} onClose={close} onAdd={addChore} />;
  if (modal === "remove-chore") return <RemoveChoreModal chores={chores} members={members} pending={pending} onClose={close} onRemove={removeChore} />;
  if (modal === "update-rewards") return <UpdateRewardsModal pending={pending} onClose={close} onAdd={addReward} />;
  if (modal === "create-group") return <CreateGroupModal pending={pending} onClose={close} onCreate={addGroup} />;
  return null;
}

function Dialog({ id, title, onClose, onSubmit, children }: { id: string; title: string; onClose: () => void; onSubmit?: (event: FormEvent) => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#1c2750]/40 p-4" onClick={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        noValidate
        onSubmit={onSubmit ?? ((event) => event.preventDefault())}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[calc(100vh-2rem)] w-full max-w-md flex-col gap-4 rounded-3xl border border-white/70 bg-[#f4f0f8] p-6 shadow-2xl"
      >
        <h2 id={id} className="font-[family-name:var(--font-display)] text-2xl font-bold">
          {title}
        </h2>
        {children}
      </form>
    </div>
  );
}

function Actions({ submitLabel, pending, onClose }: { submitLabel: string; pending: boolean; onClose: () => void }) {
  return (
    <div className="mt-2 flex justify-end gap-2">
      <button type="button" onClick={onClose} className={secondaryButtonClass}>
        Cancel
      </button>
      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {submitLabel}
      </button>
    </div>
  );
}

function wholeNumber(value: string, min: number, max?: number) {
  const n = Number(value);
  return Number.isInteger(n) && n >= min && (max == null || n <= max);
}

function AddChoreModal({ maxPoints, pending, onClose, onAdd }: { maxPoints?: number; pending: boolean; onClose: () => void; onAdd: (chore: NewChore) => void }) {
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [points, setPoints] = useState("");
  const [due, setDue] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = "Enter a chore title.";
    if (!wholeNumber(points, 1, maxPoints)) next.points = maxPoints ? `Whole points from 1 to ${maxPoints}.` : "Enter whole points, 1 or more.";
    if (!due) next.due = "Pick a due date.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    onAdd({ title: title.trim(), detail: detail.trim(), points: Number(points), due });
  };

  return (
    <Dialog id="add-chore-title" title="Add chore" onClose={onClose} onSubmit={submit}>
      <Field id="chore-title" label="Title" error={errors.title}>
        <input id="chore-title" autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Clean the fridge" className={inputClass} />
      </Field>

      <Field id="chore-detail" label="Description" optional>
        <textarea id="chore-detail" rows={2} value={detail} onChange={(event) => setDetail(event.target.value)} placeholder="Toss expired food, wipe shelves" className={`${inputClass} resize-none`} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field id="chore-points" label={maxPoints ? `Points (max ${maxPoints})` : "Points"} error={errors.points}>
          <input id="chore-points" type="number" min={1} max={maxPoints} step={1} inputMode="numeric" value={points} onChange={(event) => setPoints(event.target.value)} placeholder="10" className={inputClass} />
        </Field>
        <Field id="chore-due" label="Due date" error={errors.due}>
          <input id="chore-due" type="date" value={due} onChange={(event) => setDue(event.target.value)} className={inputClass} />
        </Field>
      </div>
      <p className="text-sm text-[#6b6590]">Point caps help prevent abuse of high-value chores.</p>

      <Actions submitLabel="Add chore" pending={pending} onClose={onClose} />
    </Dialog>
  );
}

function RemoveChoreModal({ chores, members, pending, onClose, onRemove }: { chores: Chore[]; members: Member[]; pending: boolean; onClose: () => void; onRemove: (id: number) => void }) {
  const [confirmId, setConfirmId] = useState<number | null>(null);

  return (
    <Dialog id="remove-chore-title" title="Remove chore" onClose={onClose}>
      {chores.length === 0 ? (
        <p className="text-sm text-[#6b6590]">No chores to remove.</p>
      ) : (
        <ul className="flex flex-col gap-2 overflow-y-auto">
          {chores.map((chore) => {
            const name = assigneeName(chore.assigneeId, members);
            return (
              <li key={chore.id} className={`flex items-center justify-between gap-3 px-3.5 py-3 ${listItemClass}`}>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{chore.title}</p>
                  <p className="text-sm text-[#6b6590]">
                    {formatDue(chore.due)}
                    {name ? ` · ${name}` : ""}
                  </p>
                </div>
                {confirmId === chore.id ? (
                  <div className="flex shrink-0 gap-2">
                    <button type="button" onClick={() => setConfirmId(null)} className="rounded-lg border border-[#d5cde3] bg-white px-3 py-1.5 text-sm font-semibold">
                      Cancel
                    </button>
                    <button type="button" disabled={pending} onClick={() => onRemove(chore.id)} className="rounded-lg bg-[#b3402f] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
                      Remove
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirmId(chore.id)} className="shrink-0 rounded-lg border border-[#d5cde3] bg-white px-3 py-1.5 text-sm font-semibold">
                    Remove
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex justify-end">
        <button type="button" onClick={onClose} className={secondaryButtonClass}>
          Close
        </button>
      </div>
    </Dialog>
  );
}

function UpdateRewardsModal({ pending, onClose, onAdd }: { pending: boolean; onClose: () => void; onAdd: (reward: NewReward) => void }) {
  const [title, setTitle] = useState("");
  const [cost, setCost] = useState("");
  const [scope, setScope] = useState<Reward["scope"]>("Group");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = "Enter a reward name.";
    if (!wholeNumber(cost, 1)) next.cost = "Enter whole points, 1 or more.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    onAdd({ title: title.trim(), cost: Number(cost), scope });
  };

  return (
    <Dialog id="update-rewards-title" title="Update rewards" onClose={onClose} onSubmit={submit}>
      <Field id="reward-title" label="Reward name" error={errors.title}>
        <input id="reward-title" autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Free coffee run" className={inputClass} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field id="reward-cost" label="Point cost" error={errors.cost}>
          <input id="reward-cost" type="number" min={1} step={1} inputMode="numeric" value={cost} onChange={(event) => setCost(event.target.value)} placeholder="30" className={inputClass} />
        </Field>
        <Field id="reward-scope" label="Type">
          <select id="reward-scope" value={scope} onChange={(event) => setScope(event.target.value as Reward["scope"])} className={inputClass}>
            <option value="Group">Group reward</option>
            <option value="Personal">Personal reward</option>
          </select>
        </Field>
      </div>

      <Actions submitLabel="Add reward" pending={pending} onClose={onClose} />
    </Dialog>
  );
}

function CreateGroupModal({ pending, onClose, onCreate }: { pending: boolean; onClose: () => void; onCreate: (name: string) => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return setError("Enter a household name.");
    onCreate(name.trim());
  };

  return (
    <Dialog id="create-group-title" title="Create group" onClose={onClose} onSubmit={submit}>
      <Field id="group-name" label="Household name" error={error} hint="You'll be the owner. Share the invite code so others can join.">
        <input id="group-name" autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Elm Street" className={inputClass} />
      </Field>
      <Actions submitLabel="Create group" pending={pending} onClose={onClose} />
    </Dialog>
  );
}
