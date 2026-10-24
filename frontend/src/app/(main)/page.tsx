"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGroups } from "@/components/app-shell";
import { householdPath, pickDefaultGroup } from "@/lib/session";

/** Opens the default household, or the groups page when the user has none. */
export default function HomePage() {
  const router = useRouter();
  const { groups, ready } = useGroups();

  useEffect(() => {
    if (!ready) return;
    const groupId = pickDefaultGroup(groups);
    router.replace(groupId == null ? "/groups" : householdPath(groupId));
  }, [ready, groups, router]);

  return <p className="text-[#6b6590]">Loading…</p>;
}
