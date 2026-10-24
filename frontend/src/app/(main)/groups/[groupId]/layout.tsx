"use client";

import { useEffect, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { ActiveGroupProvider, useGroups } from "@/components/app-shell";
import { saveDefaultGroup } from "@/lib/session";

/** Pages under /groups/[groupId] get the household from the URL with useGroup(). */
export default function HouseholdLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { groupId } = useParams<{ groupId: string }>();
  const { groups, ready } = useGroups();
  const group = groups.find((item) => item.id === Number(groupId));

  useEffect(() => {
    if (!ready) return;
    // Not one of the user's households: fall back to the default one.
    if (!group) router.replace("/");
    else saveDefaultGroup(group.id);
  }, [ready, group, router]);

  if (!group) return <p className="text-[#6b6590]">Loading…</p>;
  return <ActiveGroupProvider group={group}>{children}</ActiveGroupProvider>;
}
