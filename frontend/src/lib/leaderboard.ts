/**
 * Leaderboard client. Pages should only talk to these functions.
 * The route and the week/month point rules are documented in routes.ts.
 */

import { liveApiEnabled, request } from "./http";
import { members } from "./mock-store";
import { routes } from "./routes";
import { CURRENT_GROUP } from "./session";
import type { LeaderboardEntry, LeaderboardPeriod } from "./types";

export type { LeaderboardEntry, LeaderboardPeriod } from "./types";

export async function getLeaderboard(groupId: number, period: LeaderboardPeriod): Promise<LeaderboardEntry[]> {
  if (period !== "week" && period !== "month") throw new Error("Unknown period.");
  if (liveApiEnabled()) return request<LeaderboardEntry[]>(routes.leaderboard(groupId, period));
  if (groupId !== CURRENT_GROUP.id) return [];

  const key = period === "month" ? "monthPoints" : "weekPoints";
  return members
    .map((member) => ({ id: member.id, name: member.name, points: member[key] }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name) || a.id - b.id);
}
