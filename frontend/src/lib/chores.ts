/**
 * Chore client. Pages should only talk to these functions.
 * Reward and leaderboard routes live in rewards.ts and leaderboard.ts.
 * Dates stay ISO (YYYY-MM-DD). The UI formats them for display.
 */

import * as chores from "@/lib/api/gen/chores"
import * as groups from "@/lib/api/gen/groups"

import { toChore, toMember } from "./map";
import { CURRENT_USER } from "./session";
import type { Chore, ChoreInput, CreateChoreInput, Member } from "./types";

export type { Chore, ChoreInput, CreateChoreInput, Member, Status } from "./types";
export { CURRENT_USER } from "./session";

export async function listMembers(groupId: number): Promise<Member[]>
{
  const response = await groups.listMembers(groupId, {user_id: CURRENT_USER.id});
  return response.map(toMember);
}

export async function listChores(groupId: number): Promise<Chore[]>
{
  const response = await chores.listChores({group_id: groupId, user_id: CURRENT_USER.id});
  return response.map(toChore);
}

export async function deleteChore(id: number): Promise<void>
{
  await chores.deleteChore(id, {user_id: CURRENT_USER.id});
}

function choreBody(input: ChoreInput)
{
  const title = input.title.trim();
  if (!title) throw new Error("Enter a chore title.");
  if (!Number.isInteger(input.points) || input.points < 1) {
    throw new Error("Enter whole points, 1 or more.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.due)) throw new Error("Pick a due date.");
  return { title: title, description: input.detail.trim(), points: input.points, due: input.due };
}

export async function createChore(input: CreateChoreInput): Promise<Chore>
{
  const response = await chores.createChore({user_id: CURRENT_USER.id, group_id: input.groupId, ...choreBody(input)});
  return toChore(response);
}

export async function updateChore(id: number, input: ChoreInput): Promise<Chore>
{
  const response = await chores.updateChore(id, choreBody(input), {user_id: CURRENT_USER.id});
  return toChore(response);
}

export async function claimChore(id: number): Promise<Chore>
{
  const response = await chores.claimChore(id, {user_id: CURRENT_USER.id});
  return toChore(response);
}

export async function completeChore(id: number): Promise<{ chore: Chore; points: number }> {
  const response = await chores.completeChore(id, {user_id: CURRENT_USER.id});
  return { chore: toChore(response.chore), points: response.points };
}
