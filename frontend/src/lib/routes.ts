import type { LeaderboardPeriod } from "./types";

/**
 * Paths on the FastAPI app. Pages never build these.
 *
 * The browser calls http://localhost:8000 unless NEXT_PUBLIC_API_URL is set.
 * Every call sends the signed-in user id. The API checks group membership.
 * JSON from the API is snake_case; map.ts turns it into the UI types.
 */
export const routes = {
  chores: (groupId: number, userId: number) => `/chores?group_id=${groupId}&user_id=${userId}`,
  chore: (choreId: number, userId: number) => `/chores/${choreId}?user_id=${userId}`,
  claimChore: (choreId: number, userId: number) => `/chores/${choreId}/claim?user_id=${userId}`,
  completeChore: (choreId: number, userId: number) => `/chores/${choreId}/complete?user_id=${userId}`,
  members: (groupId: number, userId: number) => `/groups/${groupId}/members?user_id=${userId}`,
  rewards: (groupId: number, userId: number) => `/rewards?group_id=${groupId}&user_id=${userId}`,
  reward: (rewardId: number, userId: number) => `/rewards/${rewardId}?user_id=${userId}`,
  redeem: (rewardId: number, userId: number) => `/rewards/${rewardId}/redeem?user_id=${userId}`,
  leaderboard: (groupId: number, userId: number, period: LeaderboardPeriod) =>
    `/groups/${groupId}/leaderboard?user_id=${userId}&period=${period}`,
};
