"use client";

import { CURRENT_USER } from "@/lib/chores";
import { useApp } from "@/components/app-context";
import { ViewHeader, listItemClass, panelClass } from "@/components/shared";

export default function ProfilePage() {
  const { groups } = useApp();
  const fields = [
    ["Display name", CURRENT_USER.name],
    ["Email", CURRENT_USER.email],
    ["Groups", groups.map((group) => group.name).join(", ")],
  ];

  return (
    <>
      <ViewHeader eyebrow="Account" title="Profile" subtitle="Name and email only (per requirements)" />

      <section className={`mt-6 max-w-2xl ${panelClass}`}>
        <div className="flex items-center gap-4">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[#cdbfe0] text-2xl font-semibold text-[#1e2d54]">{CURRENT_USER.name[0]}</span>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold">{CURRENT_USER.name}</h2>
            <p className="truncate text-[#6b6590]">{CURRENT_USER.email}</p>
          </div>
        </div>
        <dl className="mt-6 grid gap-3 sm:grid-cols-2">
          {fields.map(([term, value]) => (
            <div key={term} className={`px-4 py-3 ${listItemClass}`}>
              <dt className="text-sm text-[#6b6590]">{term}</dt>
              <dd className="font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-5 text-sm text-[#6b6590]">Nice-to-have later: personal photo upload.</p>
      </section>
    </>
  );
}
