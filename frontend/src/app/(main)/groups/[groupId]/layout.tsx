"use client";

import { useEffect, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { ActiveGroupProvider, useGroups } from "@/components/app-shell";
import { householdPath, pickDefaultGroup, saveDefaultGroup } from "@/lib/session";

/** Pages under /groups/[groupId] get the household from the URL with useGroup(). */
export default function HouseholdLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { groupId } = useParams<{ groupId: string }>();
  const { groups, ready } = useGroups();
  const group = groups.find((item) => item.id === Number(groupId));

  useEffect(() => {
    if (!ready) return;
    // Not one of the user's households (or they just left / were removed): open another one, or the groups page.
    if (!group) {
      const fallback = pickDefaultGroup(groups);
      router.replace(fallback == null ? "/groups" : householdPath(fallback));
    } else saveDefaultGroup(group.id);
  }, [ready, group, groups, router]);

  if (!group) return <p className="text-[#6b6590]">Loading…</p>;
  return <ActiveGroupProvider group={group}>{children}</ActiveGroupProvider>;
}
