"use client";

import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useGroups, useNotify } from "@/components/app-shell";
import { createGroup, joinGroup } from "@/lib/groups";
import { householdPath } from "@/lib/session";

const inputClass =
  "w-full rounded-xl border border-[#d5cde3] bg-white px-4 py-3 text-base outline-none transition-colors placeholder:text-[#a59fbd] focus:border-[#9a7fb0] focus:ring-2 focus:ring-[#9a7fb0]/30";
const primaryClass =
  "rounded-lg bg-[#1c2750] px-4 py-2.5 text-base font-semibold text-white transition-colors hover:bg-[#2b3a6e] disabled:opacity-50";
const secondaryClass =
  "rounded-lg border border-[#d5cde3] bg-white px-4 py-2.5 text-base font-semibold transition-colors hover:bg-white/60";

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-base font-semibold">{label}</label>
      {children}
      {error && <p className="mt-1.5 text-base text-[#b3402f]">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-base text-[#6b6590]">{hint}</p>}
    </div>
  );
}

function Modal({ titleId, title, onClose, onSubmit, children }: { titleId: string; title: string; onClose: () => void; onSubmit: (event: FormEvent) => void; children: ReactNode }) {
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
        aria-labelledby={titleId}
        onSubmit={onSubmit}
        onClick={(event) => event.stopPropagation()}
        noValidate
        className="flex w-full max-w-md flex-col gap-4 rounded-3xl border border-white/70 bg-[#f4f0f8] p-6 shadow-2xl"
      >
        <h2 id={titleId} className="font-[family-name:var(--font-display)] text-2xl font-bold">
          {title}
        </h2>
        {children}
      </form>
    </div>
  );
}

type Created = { id: number; code: string };

function CreateGroupModal({
  pending,
  onClose,
  onCreate,
  onCopy,
  onOpen,
}: {
  pending: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<Created | null>;
  onCopy: (code: string) => void;
  onOpen: (groupId: number) => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  const [created, setCreated] = useState<Created | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (created) return onOpen(created.id);
    if (!name.trim()) return setError("Enter a group name.");
    setError(undefined);
    setCreated(await onCreate(name));
  };

  return (
    <Modal titleId="create-group-title" title={created ? `${name.trim()} created` : "Create group"} onClose={onClose} onSubmit={submit}>
      {created ? (
        <>
          <p className="text-base text-[#6b6590]">Share this code so others can join. It&apos;s also on the group&apos;s Members page.</p>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-2xl bg-white px-5 py-3 font-mono text-3xl font-semibold tracking-[0.3em]">{created.code}</span>
            <button type="button" onClick={() => onCopy(created.code)} className={secondaryClass}>
              Copy
            </button>
          </div>
        </>
      ) : (
        <Field id="group-name" label="Group name" error={error} hint="You'll be the owner.">
          <input id="group-name" autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Maple House" className={inputClass} />
        </Field>
      )}
      <div className="mt-2 flex justify-end gap-2">
        {!created && (
          <button type="button" onClick={onClose} className={secondaryClass}>
            Cancel
          </button>
        )}
        <button type="submit" disabled={pending} className={primaryClass}>
          {created ? "Open group" : "Create group"}
        </button>
      </div>
    </Modal>
  );
}

function JoinGroupModal({ pending, onClose, onJoin }: { pending: boolean; onClose: () => void; onJoin: (code: string) => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!/^[A-Za-z0-9]{6}$/.test(code.trim())) return setError("Invite codes are 6 letters or numbers.");
    setError(undefined);
    onJoin(code);
  };

  return (
    <Modal titleId="join-group-title" title="Join group" onClose={onClose} onSubmit={submit}>
      <Field id="invite-code" label="Invite code" error={error} hint="Ask a member of the group for its code.">
        <input
          id="invite-code"
          autoFocus
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="AB12CD"
          maxLength={6}
          autoComplete="off"
          className={`${inputClass} font-mono uppercase tracking-[0.2em]`}
        />
      </Field>
      <div className="mt-2 flex justify-end gap-2">
        <button type="button" onClick={onClose} className={secondaryClass}>
          Cancel
        </button>
        <button type="submit" disabled={pending} className={primaryClass}>
          Join group
        </button>
      </div>
    </Modal>
  );
}

export default function GroupsPage() {
  const notify = useNotify();
  const router = useRouter();
  const searchParams = useSearchParams();
  const panel = searchParams.get("panel");
  const { groups, ready, refreshGroups } = useGroups();
  const [pending, setPending] = useState(false);

  const closeModal = useCallback(() => {
    router.replace("/groups", { scroll: false });
  }, [router]);

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      notify("Invite code copied");
    } catch {
      notify(`Invite code: ${code}`);
    }
  };

  const create = async (name: string) => {
    if (pending) return null;
    setPending(true);
    try {
      const group = await createGroup(name);
      await refreshGroups();
      notify(`Created ${name.trim()}`);
      return { id: group.group_id, code: group.invite_code };
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not create group");
      return null;
    } finally {
      setPending(false);
    }
  };

  const join = async (code: string) => {
    if (pending) return;
    setPending(true);
    try {
      const joined = await joinGroup(code);
      await refreshGroups();
      router.push(householdPath(joined.group_id));
      notify("Joined group");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not join group");
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-base font-medium text-[#9a7fb0]">Your households</p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold leading-tight">Groups</h1>
          <p className="mt-1 text-[#7c6f9c]">You can belong to more than one group</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/groups?panel=join" scroll={false} className={secondaryClass}>
            Join group
          </Link>
          <Link href="/groups?panel=create" scroll={false} className={primaryClass}>
            Create group
          </Link>
        </div>
      </header>

      {!ready && <p className="py-10 text-center text-[#6b6590]">Loading groups…</p>}
      {ready && groups.length === 0 && (
        <p className="py-10 text-center text-[#6b6590]">You&apos;re not in a group yet. Create one, or join with an invite code.</p>
      )}

      {ready && groups.length > 0 && (
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => (
            <li key={group.id}>
              <Link
                href={householdPath(group.id)}
                className="block rounded-3xl border border-white/70 bg-[#f4f0f8]/90 p-5 transition-colors hover:bg-white sm:p-6"
              >
                <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold">{group.name}</h2>
                <p className="mt-1 text-base text-[#6b6590]">
                  {group.memberCount} {group.memberCount === 1 ? "member" : "members"} · invite-only
                </p>
                <span className="mt-4 inline-block rounded-full bg-[#ebe6f1] px-3 py-1 text-base font-medium text-[#9a7fb0]">
                  {group.role === "owner" ? "Owner" : "Member"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {panel === "create" && (
        <CreateGroupModal pending={pending} onClose={closeModal} onCreate={create} onCopy={copy} onOpen={(id) => router.push(householdPath(id))} />
      )}
      {panel === "join" && <JoinGroupModal pending={pending} onClose={closeModal} onJoin={join} />}
    </>
  );
}
