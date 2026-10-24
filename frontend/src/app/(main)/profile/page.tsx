"use client";

import Link from "next/link";
import { useGroups } from "@/components/app-shell";
import { CURRENT_USER, householdPath } from "@/lib/session";

export default function ProfilePage() {
  const { groups, ready } = useGroups();

  return (
    <>
      <header>
        <p className="text-base font-medium text-[#9a7fb0]">Account</p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold leading-tight">Profile</h1>
      </header>

      <section className="mt-6 max-w-2xl rounded-3xl border border-white/70 bg-[#f4f0f8]/90 p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[#cdbfe0] text-2xl font-semibold text-[#1e2d54]">
            {CURRENT_USER.name.charAt(0)}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold">{CURRENT_USER.name}</h2>
            <p className="break-all text-base text-[#6b6590]">{CURRENT_USER.email}</p>
          </div>
        </div>

        <dl className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-[#ebe6f1] px-4 py-3">
            <dt className="text-base text-[#6b6590]">Display name</dt>
            <dd className="font-semibold">{CURRENT_USER.name}</dd>
          </div>
          <div className="rounded-2xl bg-[#ebe6f1] px-4 py-3">
            <dt className="text-base text-[#6b6590]">Email</dt>
            <dd className="break-all font-semibold">{CURRENT_USER.email}</dd>
          </div>
        </dl>

        <h3 className="mt-6 text-lg font-semibold">Your groups</h3>
        {!ready && <p className="mt-2 text-base text-[#6b6590]">Loading groups…</p>}
        {ready && groups.length === 0 && (
          <p className="mt-2 text-base text-[#6b6590]">
            Not in a group yet. <Link href="/groups" className="font-semibold text-[#9a7fb0] hover:text-[#1c2750]">Create or join one</Link>.
          </p>
        )}
        {ready && groups.length > 0 && (
          <ul className="mt-3 flex flex-col gap-2">
            {groups.map((group) => (
              <li key={group.id}>
                <Link
                  href={householdPath(group.id)}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-[#ebe6f1] px-4 py-3 transition-colors hover:bg-white"
                >
                  <span className="font-semibold">{group.name}</span>
                  <span className="text-base text-[#6b6590]">{group.role === "owner" ? "Owner" : "Member"}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

      </section>
    </>
  );
}
