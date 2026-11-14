"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useGroup, useGroups, useNotify, useRefreshTick } from "@/components/app-shell";
import { getInviteCode, leaveGroup, listHouseholdMembers, removeMember, type HouseholdMember } from "@/lib/groups";
import { CURRENT_USER } from "@/lib/session";

const cardClass = "rounded-3xl border border-white/70 bg-[#f4f0f8]/90 p-5 sm:p-6";
const secondaryButton =
  "rounded-lg border border-[#d5cde3] bg-white px-4 py-2.5 text-base font-semibold transition-colors hover:bg-white/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1c2750]";
const dangerButton =
  "rounded-lg bg-[#b3402f] px-4 py-2.5 text-base font-semibold text-white transition-colors hover:bg-[#9a3627] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b3402f] disabled:opacity-50";
const dangerOutlineButton =
  "rounded-lg border border-[#e3c2bc] bg-white px-4 py-2.5 text-base font-semibold text-[#b3402f] transition-colors hover:bg-[#fbeeec] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b3402f]";

export default function MembersPage() {
  const notify = useNotify();
  const group = useGroup();
  const { refreshGroups } = useGroups();
  const router = useRouter();
  const refreshTick = useRefreshTick();
  const loaded = useRef(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const isOwner = group.role === "owner";

  useEffect(() => {
    if (pending) return;
    let cancelled = false;
    Promise.all([getInviteCode(group.id), listHouseholdMembers(group.id)])
      .then(([invite, nextMembers]) => {
        if (cancelled) return;
        loaded.current = true;
        setLoadError(null);
        setInviteCode(invite.invite_code);
        setMembers(nextMembers);
      })
      .catch((error: unknown) => {
        if (cancelled || loaded.current) return;
        const message = error instanceof Error ? error.message : "Could not load members";
        setLoadError(message);
        notify(message);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [notify, group.id, refreshTick, pending]);

  const copy = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      notify("Invite code copied");
    } catch {
      notify(`Invite code: ${inviteCode}`);
    }
  };

  const remove = async (member: HouseholdMember) => {
    if (pending) return;
    setPending(true);
    try {
      await removeMember(group.id, member.id);
      setMembers((current) => current.filter((item) => item.id !== member.id));
      setConfirmId(null);
      notify(`Removed ${member.name}`);
      await refreshGroups().catch(() => {});
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not remove member");
    } finally {
      setPending(false);
    }
  };

  const leave = async () => {
    if (pending) return;
    setPending(true);
    try {
      await leaveGroup(group.id);
      notify(`You left ${group.name}`);
      // The household layout sees the group is gone and opens another one, or the groups page.
      await refreshGroups().catch(() => router.replace("/groups"));
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not leave household");
      setPending(false);
    }
  };

  return (
    <>
      <header>
        <p className="text-base font-medium text-[#9a7fb0]">{group.name}</p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold leading-tight">Members</h1>
        <p className="mt-1 text-[#7c6f9c]">
          {group.memberCount} {group.memberCount === 1 ? "member" : "members"} · You are {isOwner ? "the owner" : "a member"}
        </p>
      </header>

      {!ready && <p className="py-10 text-center text-[#6b6590]">Loading members…</p>}
      {ready && loadError && <p className="py-10 text-center text-[#b3402f]">{loadError}</p>}

      {ready && !loadError && (
        <div className="mt-6 grid gap-5 xl:grid-cols-2">
          <div className="flex flex-col gap-5 self-start">
            <section className={cardClass}>
              <h2 className="text-xl font-semibold">Invite members</h2>
              <p className="mt-1 text-base text-[#6b6590]">Share this code. Anyone with it can join {group.name}.</p>
              {inviteCode && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <span className="rounded-2xl bg-white px-5 py-3 font-mono text-3xl font-semibold tracking-[0.3em]">{inviteCode}</span>
                  <button type="button" onClick={copy} className={secondaryButton}>
                    Copy
                  </button>
                </div>
              )}
            </section>

            <section className={cardClass}>
              <h2 className="text-xl font-semibold">Leave household</h2>
              {isOwner ? (
                <p className="mt-1 text-base text-[#6b6590]">You own {group.name}, so you can&apos;t leave it.</p>
              ) : (
                <>
                  <p className="mt-1 text-base text-[#6b6590]">
                    You&apos;ll lose your {group.name} points, and chores you&apos;ve claimed go back up for grabs.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {confirmLeave ? (
                      <>
                        <button type="button" onClick={() => setConfirmLeave(false)} className={secondaryButton}>
                          Cancel
                        </button>
                        <button type="button" disabled={pending} onClick={leave} className={dangerButton}>
                          Leave {group.name}
                        </button>
                      </>
                    ) : (
                      <button type="button" onClick={() => setConfirmLeave(true)} className={dangerOutlineButton}>
                        Leave household
                      </button>
                    )}
                  </div>
                </>
              )}
            </section>
          </div>

          <section className={`self-start ${cardClass}`}>
            <h2 className="text-xl font-semibold">Members</h2>
            <ul className="mt-4 flex flex-col gap-3">
              {members.map((member) => {
                const you = member.id === CURRENT_USER.id;
                const canRemove = isOwner && !you;
                const confirming = confirmId === member.id;
                return (
                  <li key={member.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-[#ebe6f1] px-4 py-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#cdbfe0] font-semibold text-[#1e2d54]">{member.name.charAt(0)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-semibold">
                        <span className="min-w-0 break-words">
                          {member.name}
                          {you && " (you)"}
                        </span>
                        {member.role === "owner" && (
                          <span className="rounded-full bg-[#1c2750] px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">Owner</span>
                        )}
                      </p>
                      <p className="text-base text-[#6b6590]">{member.points} pts</p>
                    </div>
                    {canRemove &&
                      (confirming ? (
                        <div className="flex shrink-0 gap-2">
                          <button type="button" onClick={() => setConfirmId(null)} className={secondaryButton}>
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => remove(member)}
                            aria-label={`Confirm removing ${member.name}`}
                            className={dangerButton}
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmId(member.id)}
                          aria-label={`Remove ${member.name}`}
                          className={`shrink-0 ${dangerOutlineButton}`}
                        >
                          Remove
                        </button>
                      ))}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      )}
    </>
  );
}
