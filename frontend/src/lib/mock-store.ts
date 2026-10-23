import type { Chore, Member, Reward } from "./types";

/**
 * In-memory stand-in shared by the chore, reward, and leaderboard clients.
 * Delete this once those clients only call request().
 * weekPoints and monthPoints are earned totals. Member.points is the balance.
 */

export type StoredMember = Member & {
  weekPoints: number;
  monthPoints: number;
};

export type StoredReward = Reward & {
  groupId: number;
};

export const members: StoredMember[] = [
  { id: 1, name: "Alex Rivera", points: 42, weekPoints: 42, monthPoints: 118 },
  { id: 2, name: "Sam Okonkwo", points: 55, weekPoints: 55, monthPoints: 140 },
  { id: 3, name: "Jordan Lee", points: 38, weekPoints: 38, monthPoints: 96 },
  { id: 4, name: "Riley Chen", points: 27, weekPoints: 27, monthPoints: 81 },
];

export const chores: Chore[] = [
  { id: 1, groupId: 1, title: "Kitchen deep clean", detail: "Counters, sink, stove, floors", points: 15, due: "2026-10-12", assigneeId: null, status: "available" },
  { id: 2, groupId: 1, title: "Take out trash", detail: "Kitchen + bathrooms", points: 5, due: "2026-10-11", assigneeId: 3, status: "in_progress" },
  { id: 3, groupId: 1, title: "Vacuum living room", detail: "Rugs and under couch", points: 10, due: "2026-10-14", assigneeId: 1, status: "in_progress" },
  { id: 4, groupId: 1, title: "Grocery run", detail: "Shared list on fridge", points: 12, due: "2026-10-13", assigneeId: null, status: "available" },
  { id: 5, groupId: 1, title: "Wipe bathrooms", detail: "Sinks, mirrors, counters", points: 10, due: "2026-10-09", assigneeId: 2, status: "completed" },
  { id: 6, groupId: 1, title: "Laundry fold & put away", detail: "Shared towels only", points: 8, due: "2026-10-16", assigneeId: null, status: "available" },
];

export const rewards: StoredReward[] = [
  { id: 1, groupId: 1, title: "Pick dinner", cost: 25, scope: "Group" },
  { id: 2, groupId: 1, title: "Skip one chore", cost: 40, scope: "Group" },
  { id: 3, groupId: 1, title: "Choose movie night", cost: 20, scope: "Personal" },
];

let nextChoreId = 7;
let nextRewardId = 4;

export function takeChoreId() {
  const id = nextChoreId;
  nextChoreId += 1;
  return id;
}

export function takeRewardId() {
  const id = nextRewardId;
  nextRewardId += 1;
  return id;
}

export function publicMember(member: StoredMember): Member {
  return { id: member.id, name: member.name, points: member.points };
}

export function publicReward(reward: StoredReward): Reward {
  return { id: reward.id, title: reward.title, cost: reward.cost, scope: reward.scope };
}
