"use client";

import { useRouter } from "next/navigation";
import { useApp } from "@/components/app-context";
import { ViewHeader, primaryButtonClass } from "@/components/shared";

export default function GroupsPage() {
  const { groups, group, switchGroup, setModal } = useApp();
  const router = useRouter();

  return (
    <>
      <ViewHeader eyebrow="Your households" title="Groups" subtitle="You can belong to multiple groups">
        <button type="button" onClick={() => setModal("create-group")} className={primaryButtonClass}>
          Create group
        </button>
      </ViewHeader>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {groups.map((item) => {
          const current = item.id === group?.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                switchGroup(item.id);
                router.push("/");
              }}
              aria-current={current ? "true" : undefined}
              className={`rounded-3xl border-2 bg-[#f4f0f8]/90 p-5 text-left transition-colors hover:bg-white ${current ? "border-[#9a7fb0]" : "border-white/70"}`}
            >
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold">{item.name}</h2>
              <p className="mt-1 text-[#6b6590]">{item.memberCount} members · invite-only</p>
              <span className="mt-4 inline-block rounded-full bg-[#ebe6f1] px-3 py-1 text-sm font-medium text-[#9a7fb0]">
                {item.role === "owner" ? "Owner" : "Member"}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
