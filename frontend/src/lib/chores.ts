/**
 * Stand-in for the chore API. The page should only talk to these functions.
 * Replace the bodies with fetch() when the backend routes exist.
 */

import * as api from "@/lib/api/gen/default";
import { GroupInviteCodeResponse, GroupJoinResponse } from "./api/gen/schemas";

export type Status = "available" | "in_progress" | "completed";

export type Member = {
  id: number;
  name: string;
  points: number;
  monthPoints: number;
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
  groupId: number;
  title: string;
  cost: number;
  scope: "Group" | "Personal";
};

export type CreateRewardInput = Omit<Reward, "id">;

export type Group = {
  id: number;
  name: string;
  memberCount: number;
  role: "owner" | "member";
  maxChorePoints: number;
};

export const CURRENT_USER = {
  id: 1,
  name: "Alex Rivera",
  email: "alex@umass.edu",
};

const TEMP_USER_ID = CURRENT_USER.id;

// Ids match the backend's dummy data so household calls line up.
const groups: Omit<Group, "memberCount">[] = [
  { id: 1, name: "Maple House", role: "member", maxChorePoints: 100 },
  { id: 2, name: "Study Squad", role: "owner", maxChorePoints: 100 },
];

// points = this week, monthPoints = this month.
const membersByGroup: Record<number, Member[]> = {
  1: [
    { id: 1, name: "Alex Rivera", points: 42, monthPoints: 118 },
    { id: 2, name: "Sam Okonkwo", points: 55, monthPoints: 140 },
    { id: 3, name: "Jordan Lee", points: 38, monthPoints: 96 },
    { id: 4, name: "Riley Chen", points: 27, monthPoints: 81 },
  ],
  2: [
    { id: 1, name: "Alex Rivera", points: 18, monthPoints: 44 },
    { id: 5, name: "Priya N.", points: 30, monthPoints: 72 },
    { id: 6, name: "Chris M.", points: 22, monthPoints: 61 },
    { id: 7, name: "Taylor B.", points: 15, monthPoints: 39 },
    { id: 8, name: "Devon K.", points: 12, monthPoints: 28 },
  ],
};

let nextChoreId = 7;
let nextRewardId = 4;

const chores: Chore[] = [
  { id: 1, groupId: 1, title: "Kitchen deep clean", detail: "Counters, sink, stove, floors", points: 15, due: "2026-10-12", assigneeId: null, status: "available" },
  { id: 2, groupId: 1, title: "Take out trash", detail: "Kitchen + bathrooms", points: 5, due: "2026-10-11", assigneeId: 3, status: "in_progress" },
  { id: 3, groupId: 1, title: "Vacuum living room", detail: "Rugs and under couch", points: 10, due: "2026-10-14", assigneeId: 1, status: "in_progress" },
  { id: 4, groupId: 1, title: "Grocery run", detail: "Shared list on fridge", points: 12, due: "2026-10-13", assigneeId: null, status: "available" },
  { id: 5, groupId: 1, title: "Wipe bathrooms", detail: "Sinks, mirrors, counters", points: 10, due: "2026-10-09", assigneeId: 2, status: "completed" },
  { id: 6, groupId: 1, title: "Laundry fold & put away", detail: "Shared towels only", points: 8, due: "2026-10-16", assigneeId: null, status: "available" },
];

const rewards: Reward[] = [
  { id: 1, groupId: 1, title: "Pick dinner", cost: 25, scope: "Group" },
  { id: 2, groupId: 1, title: "Skip one chore", cost: 40, scope: "Group" },
  { id: 3, groupId: 1, title: "Choose movie night", cost: 20, scope: "Personal" },
];

export async function getInviteCode(groupId: number): Promise<GroupInviteCodeResponse>
{
  const response = await api.getInviteCode({group_id: groupId, user_id: TEMP_USER_ID});
  if (response.status !== 200)
  {
    throw new Error("Failed to get invite code");
  }

  return response.data;
}

export async function createGroup(name: string): Promise<Group & { inviteCode: string }>
{
  const response = await api.createGroup({name, owner_id: TEMP_USER_ID});
  if (response.status !== 201)
  {
    throw new Error("Failed to create group");
  }

  // Stand-in until the backend can list groups and members.
  const group = { id: response.data.group_id, name, role: "owner" as const, maxChorePoints: 100 };
  groups.push(group);
  membersByGroup[group.id] = [{ id: CURRENT_USER.id, name: CURRENT_USER.name, points: 0, monthPoints: 0 }];
  return { ...group, memberCount: 1, inviteCode: response.data.invite_code };
}

export async function joinGroup(inviteCode: string): Promise<GroupJoinResponse>
{
  const response = await api.joinGroup({user_id: TEMP_USER_ID, invite_code: inviteCode});
  if (response.status !== 200)
  {
    throw new Error("Failed to join group");
  }

  return response.data;
}

function copyMember(member: Member): Member {
  return { ...member };
}

function copyChore(chore: Chore): Chore {
  return { ...chore };
}

export async function listGroups(): Promise<Group[]> {
  return groups.map((group) => ({ ...group, memberCount: membersByGroup[group.id]?.length ?? 0 }));
}

export async function listMembers(groupId: number): Promise<Member[]> {
  return (membersByGroup[groupId] ?? []).map(copyMember);
}

export async function listChores(groupId: number): Promise<Chore[]> {
  return chores.filter((chore) => chore.groupId === groupId).map(copyChore);
}

export async function listRewards(groupId: number): Promise<Reward[]> {
  return rewards.filter((reward) => reward.groupId === groupId).map((reward) => ({ ...reward }));
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
  if (!membersByGroup[input.groupId]) throw new Error("Unknown group.");

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

export async function completeChore(id: number): Promise<{ chore: Chore; member: Member }> {
  const chore = chores.find((item) => item.id === id);
  if (!chore) throw new Error("Chore not found.");
  if (chore.status !== "in_progress" || chore.assigneeId !== CURRENT_USER.id) {
    throw new Error("You can't complete this chore.");
  }
  const member = membersByGroup[chore.groupId]?.find((item) => item.id === CURRENT_USER.id);
  if (!member) throw new Error("Member not found.");
  chore.status = "completed";
  member.points += chore.points;
  member.monthPoints += chore.points;
  return { chore: copyChore(chore), member: copyMember(member) };
}

export async function createReward(input: CreateRewardInput): Promise<Reward> {
  const title = input.title.trim();
  if (!title) throw new Error("Enter a reward name.");
  if (!Number.isInteger(input.cost) || input.cost < 1) {
    throw new Error("Enter a whole point cost, 1 or more.");
  }
  const reward: Reward = { id: nextRewardId, groupId: input.groupId, title, cost: input.cost, scope: input.scope };
  nextRewardId += 1;
  rewards.push(reward);
  return { ...reward };
}

export async function redeemReward(groupId: number, rewardId: number): Promise<Member> {
  const reward = rewards.find((item) => item.id === rewardId);
  if (!reward) throw new Error("Reward not found.");
  const member = membersByGroup[groupId]?.find((item) => item.id === CURRENT_USER.id);
  if (!member) throw new Error("Member not found.");
  if (member.points < reward.cost) throw new Error("Not enough points.");
  member.points -= reward.cost;
  return copyMember(member);
}
