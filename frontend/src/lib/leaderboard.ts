/**
 * Leaderboard client. Pages should only talk to these functions.
 * Week and month totals are earned points. Redeeming a reward does not change them.
 */

import { request } from "./http";
import { type ApiMember, toEntry } from "./map";
import { routes } from "./routes";
import { CURRENT_USER } from "./session";
import type { LeaderboardEntry, LeaderboardPeriod } from "./types";

export type { LeaderboardEntry, LeaderboardPeriod } from "./types";

export async function getLeaderboard(groupId: number, period: LeaderboardPeriod): Promise<LeaderboardEntry[]> {
  if (period !== "week" && period !== "month") throw new Error("Unknown period.");
  const rows = await request<ApiMember[]>(routes.leaderboard(groupId, CURRENT_USER.id, period));
  return rows.map(toEntry);
}
