import * as groups from "@/lib/api/gen/groups";

import { toGroup } from "./map";
import type { Group } from "./types";
import { GroupCreateResponse, GroupInviteCodeResponse, GroupJoinResponse } from "./api/gen/schemas";

export type { Group } from "./types";

export async function createGroup(name: string):  Promise<GroupCreateResponse>
{
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Enter a group name.");

    const response = await groups.createGroup({name: trimmed});
    return response;
}

export async function joinGroup(inviteCode: string): Promise<GroupJoinResponse>
{
    const code = inviteCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) throw new Error("Invite codes are 6 letters or numbers.");

    const response = await groups.joinGroup({invite_code: code});
    return response;
}

export async function getInviteCode(groupId: number): Promise<GroupInviteCodeResponse>
{
    const response = await groups.getInviteCode({group_id: groupId});
    return response;
}

export async function listGroups(): Promise<Group[]>
{
    const response = await groups.listGroups();
    return response.map(toGroup);
}
