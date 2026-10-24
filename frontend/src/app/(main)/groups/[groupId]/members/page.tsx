"use client";

import { useEffect, useState } from "react";
import { useGroup, useNotify } from "@/components/app-shell";
import { listMembers, type Member } from "@/lib/chores";
import { getInviteCode } from "@/lib/groups";
import { CURRENT_USER } from "@/lib/session";

export default function MembersPage() {
  const notify = useNotify();
  const group = useGroup();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getInviteCode(group.id), listMembers(group.id)])
      .then(([invite, nextMembers]) => {
        if (cancelled) return;
        setInviteCode(invite.invite_code);
        setMembers(nextMembers);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
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
  }, [notify, group.id]);

  const copy = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      notify("Invite code copied");
    } catch {
      notify(`Invite code: ${inviteCode}`);
    }
  };

  return (
    <>
      <header>
        <p className="text-base font-medium text-[#9a7fb0]">{group.name}</p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold leading-tight">Members</h1>
        <p className="mt-1 text-[#7c6f9c]">
          {group.memberCount} {group.memberCount === 1 ? "member" : "members"} · You are {group.role === "owner" ? "the owner" : "a member"}
        </p>
      </header>

      {!ready && <p className="py-10 text-center text-[#6b6590]">Loading members…</p>}
      {ready && loadError && <p className="py-10 text-center text-[#b3402f]">{loadError}</p>}

      {ready && !loadError && (
        <div className="mt-6 grid gap-5 xl:grid-cols-2">
          <section className="self-start rounded-3xl border border-white/70 bg-[#f4f0f8]/90 p-5 sm:p-6">
            <h2 className="text-xl font-semibold">Invite members</h2>
            <p className="mt-1 text-base text-[#6b6590]">Share this code. Anyone with it can join {group.name}.</p>
            {inviteCode && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="rounded-2xl bg-white px-5 py-3 font-mono text-3xl font-semibold tracking-[0.3em]">{inviteCode}</span>
                <button
                  type="button"
                  onClick={copy}
                  className="rounded-lg border border-[#d5cde3] bg-white px-4 py-2.5 text-base font-semibold transition-colors hover:bg-white/60"
                >
                  Copy
                </button>
              </div>
            )}
          </section>

          <section className="self-start rounded-3xl border border-white/70 bg-[#f4f0f8]/90 p-5 sm:p-6">
            <h2 className="text-xl font-semibold">Members</h2>
            <ul className="mt-4 flex flex-col gap-3">
              {members.map((member) => (
                <li key={member.id} className="flex items-center gap-3 rounded-2xl bg-[#ebe6f1] px-4 py-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#cdbfe0] font-semibold text-[#1e2d54]">{member.name.charAt(0)}</span>
                  <span className="flex-1 font-semibold">
                    {member.name}
                    {member.id === CURRENT_USER.id && " (you)"}
                  </span>
                  <span className="text-base text-[#6b6590]">{member.points} pts</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </>
  );
}
