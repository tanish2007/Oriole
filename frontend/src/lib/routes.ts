import type { LeaderboardPeriod } from "./types";

/**
 * Routes the rewards and leaderboard UI calls. Pages never build these paths.
 *
 * Set NEXT_PUBLIC_API_URL to the API origin, with no trailing slash
 * (http://localhost:8000). Until it is set, the stand-in in mock-store.ts is used.
 * JSON is camelCase. The browser calls the API directly, so the API must allow
 * this origin. Add the session cookie or header in http.ts when auth exists.
 *
 * GET    /groups/{groupId}/members
 *          -> { id, name, points }[]
 *          `points` is the spendable balance.
 * GET    /groups/{groupId}/rewards
 * POST   /groups/{groupId}/rewards
 *          body: { title, cost, scope }  scope is "Group" | "Personal"
 *          -> { id, title, cost, scope }
 * PATCH  /groups/{groupId}/rewards/{rewardId}
 *          body: { title, cost, scope }
 * DELETE /groups/{groupId}/rewards/{rewardId}
 * POST   /groups/{groupId}/rewards/{rewardId}/redeem
 *          -> { id, name, points } for the signed-in member
 * GET    /groups/{groupId}/leaderboard?period=week|month
 *          -> { id, name, points }[] sorted highest first
 *          These are earned points. Completing a chore should add that chore's
 *          points to the member balance and to both the week and month totals.
 *          Redeeming does not change the leaderboard.
 */
export const routes = {
  members: (groupId: number) => `/groups/${groupId}/members`,
  rewards: (groupId: number) => `/groups/${groupId}/rewards`,
  reward: (groupId: number, rewardId: number) => `/groups/${groupId}/rewards/${rewardId}`,
  redeem: (groupId: number, rewardId: number) => `/groups/${groupId}/rewards/${rewardId}/redeem`,
  leaderboard: (groupId: number, period: LeaderboardPeriod) =>
    `/groups/${groupId}/leaderboard?period=${period}`,
};
