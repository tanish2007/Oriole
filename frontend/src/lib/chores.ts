/**
 * Chore client. Pages should only talk to these functions.
 * Reward and leaderboard routes live in rewards.ts and leaderboard.ts.
 * Dates stay ISO (YYYY-MM-DD). The UI formats them for display.
 */

import { liveApiEnabled, request } from "./http";
import { chores, members, publicMember, takeChoreId } from "./mock-store";
import { routes } from "./routes";
import { CURRENT_GROUP, CURRENT_USER } from "./session";
import type { Chore, CreateChoreInput, Member } from "./types";

export type { Chore, CreateChoreInput, Member, Status } from "./types";
export { CURRENT_GROUP, CURRENT_USER } from "./session";

export async function listMembers(groupId: number): Promise<Member[]> {
  if (liveApiEnabled()) return request<Member[]>(routes.members(groupId));
  if (groupId !== CURRENT_GROUP.id) return [];
  return members.map(publicMember);
}

export async function listChores(groupId: number): Promise<Chore[]> {
  return chores.filter((chore) => chore.groupId === groupId).map((chore) => ({ ...chore }));
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
    id: takeChoreId(),
    groupId: input.groupId,
    title,
    detail,
    points: input.points,
    due: input.due,
    assigneeId: null,
    status: "available",
  };
  chores.push(chore);
  return { ...chore };
}

export async function claimChore(id: number): Promise<Chore> {
  const chore = chores.find((item) => item.id === id);
  if (!chore) throw new Error("Chore not found.");
  if (chore.status !== "available" || chore.assigneeId !== null) {
    throw new Error("Chore is not available.");
  }
  chore.assigneeId = CURRENT_USER.id;
  chore.status = "in_progress";
  return { ...chore };
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
  member.weekPoints += chore.points;
  member.monthPoints += chore.points;
  return { chore: { ...chore }, points: member.points };
}
