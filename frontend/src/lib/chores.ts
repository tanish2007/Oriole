/**
 * Stand-in for the chore API. The page should only talk to these functions.
 * Replace the bodies with fetch() when the backend routes exist.
 * Dates stay ISO (YYYY-MM-DD). The UI formats them for display.
 */

export type Status = "available" | "in_progress" | "completed";

export type Member = {
  id: number;
  name: string;
  points: number;
};

export type Chore = {
  id: number;
  groupId: number;
  title: string;
  detail: string;
  points: number;
  due: string;
  assigneeId: number | null;
  status: Status;
};

export type CreateChoreInput = {
  groupId: number;
  title: string;
  detail: string;
  points: number;
  due: string;
};

export type Reward = {
  id: number;
  title: string;
  cost: number;
  scope: "Group" | "Personal";
};

export type Group = {
  id: number;
  name: string;
  memberCount: number;
};

export const CURRENT_USER = {
  id: 1,
  name: "Alex Rivera",
  email: "alex@umass.edu",
};

export const CURRENT_GROUP: Group = {
  id: 1,
  name: "Maple House",
  memberCount: 4,
};

const members: Member[] = [
  { id: 1, name: "Alex Rivera", points: 42 },
  { id: 2, name: "Sam Okonkwo", points: 55 },
  { id: 3, name: "Jordan Lee", points: 38 },
  { id: 4, name: "Riley Chen", points: 27 },
];

let nextChoreId = 7;

const chores: Chore[] = [
  { id: 1, groupId: 1, title: "Kitchen deep clean", detail: "Counters, sink, stove, floors", points: 15, due: "2026-10-12", assigneeId: null, status: "available" },
  { id: 2, groupId: 1, title: "Take out trash", detail: "Kitchen + bathrooms", points: 5, due: "2026-10-11", assigneeId: 3, status: "in_progress" },
  { id: 3, groupId: 1, title: "Vacuum living room", detail: "Rugs and under couch", points: 10, due: "2026-10-14", assigneeId: 1, status: "in_progress" },
  { id: 4, groupId: 1, title: "Grocery run", detail: "Shared list on fridge", points: 12, due: "2026-10-13", assigneeId: null, status: "available" },
  { id: 5, groupId: 1, title: "Wipe bathrooms", detail: "Sinks, mirrors, counters", points: 10, due: "2026-10-09", assigneeId: 2, status: "completed" },
  { id: 6, groupId: 1, title: "Laundry fold & put away", detail: "Shared towels only", points: 8, due: "2026-10-16", assigneeId: null, status: "available" },
];

const rewards: Reward[] = [
  { id: 1, title: "Pick dinner", cost: 25, scope: "Group" },
  { id: 2, title: "Skip one chore", cost: 40, scope: "Group" },
  { id: 3, title: "Choose movie night", cost: 20, scope: "Personal" },
];

function copyMember(member: Member): Member {
  return { ...member };
}

function copyChore(chore: Chore): Chore {
  return { ...chore };
}

export async function listMembers(groupId: number): Promise<Member[]> {
  if (groupId !== CURRENT_GROUP.id) return [];
  return members.map(copyMember);
}

export async function listChores(groupId: number): Promise<Chore[]> {
  return chores.filter((chore) => chore.groupId === groupId).map(copyChore);
}

export async function listRewards(): Promise<Reward[]> {
  return rewards.map((reward) => ({ ...reward }));
}

export async function deleteChore(id: number): Promise<void> {
  const index = chores.findIndex((chore) => chore.id === id);
  if (index < 0) throw new Error("Chore not found.");
  chores.splice(index, 1);
}

export async function createChore(input: CreateChoreInput): Promise<Chore> {
  const title = input.title.trim();
  const detail = input.detail.trim();
  if (!title) throw new Error("Enter a chore title.");
  if (!Number.isInteger(input.points) || input.points < 1) {
    throw new Error("Enter whole points, 1 or more.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.due)) throw new Error("Pick a due date.");
  if (input.groupId !== CURRENT_GROUP.id) throw new Error("Unknown group.");

  const chore: Chore = {
    id: nextChoreId,
    groupId: input.groupId,
    title,
    detail,
    points: input.points,
    due: input.due,
    assigneeId: null,
    status: "available",
  };
  nextChoreId += 1;
  chores.push(chore);
  return copyChore(chore);
}

export async function claimChore(id: number): Promise<Chore> {
  const chore = chores.find((item) => item.id === id);
  if (!chore) throw new Error("Chore not found.");
  if (chore.status !== "available" || chore.assigneeId !== null) {
    throw new Error("Chore is not available.");
  }
  chore.assigneeId = CURRENT_USER.id;
  chore.status = "in_progress";
  return copyChore(chore);
}

export async function completeChore(id: number): Promise<{ chore: Chore; points: number }> {
  const chore = chores.find((item) => item.id === id);
  if (!chore) throw new Error("Chore not found.");
  if (chore.status !== "in_progress" || chore.assigneeId !== CURRENT_USER.id) {
    throw new Error("You can't complete this chore.");
  }
  const member = members.find((item) => item.id === CURRENT_USER.id);
  if (!member) throw new Error("Member not found.");
  chore.status = "completed";
  member.points += chore.points;
  return { chore: copyChore(chore), points: member.points };
}

export async function redeemReward(rewardId: number): Promise<Member> {
  const reward = rewards.find((item) => item.id === rewardId);
  if (!reward) throw new Error("Reward not found.");
  const member = members.find((item) => item.id === CURRENT_USER.id);
  if (!member) throw new Error("Member not found.");
  if (member.points < reward.cost) throw new Error("Not enough points.");
  member.points -= reward.cost;
  return copyMember(member);
}
