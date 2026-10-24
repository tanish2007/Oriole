/**
 * Leaderboard client. Pages should only talk to these functions.
 * Week and month totals are earned points. Redeeming a reward does not change them.
 */

import * as groups from "@/lib/api/gen/groups";

import { toEntry } from "./map";
import { CURRENT_USER } from "./session";
import type { LeaderboardEntry, LeaderboardPeriod } from "./types";

export type { LeaderboardEntry, LeaderboardPeriod } from "./types";

export async function getLeaderboard(groupId: number, period: LeaderboardPeriod): Promise<LeaderboardEntry[]>
{
  if (period !== "week" && period !== "month") throw new Error("Unknown period.");
  const response = await groups.leaderboard(groupId, {user_id: CURRENT_USER.id, period: period});
  return response.map(toEntry);
}
