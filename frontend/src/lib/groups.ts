import * as groups from "@/lib/api/gen/groups";

import { CURRENT_USER } from "./session";
import { GroupCreateResponse, GroupInviteCodeResponse, GroupJoinResponse, GroupSummaryResponse } from "./api/gen/schemas";

export async function createGroup(name: string):  Promise<GroupCreateResponse>
{
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Enter a group name.");

    const response = await groups.createGroup({name: trimmed, owner_id: CURRENT_USER.id});
    return response;
}

export async function joinGroup(inviteCode: string): Promise<GroupJoinResponse>
{
    const code = inviteCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) throw new Error("Invite codes are 6 letters or numbers.");

    const response = await groups.joinGroup({user_id: CURRENT_USER.id, invite_code: code});
    return response;
}

export async function getInviteCode(groupId: number): Promise<GroupInviteCodeResponse>
{
    const response = await groups.getInviteCode({group_id: groupId, user_id: CURRENT_USER.id});
    return response;
}

export async function listGroups(): Promise<GroupSummaryResponse[]>
{
    const response = await groups.listGroups({user_id: CURRENT_USER.id});
    return response;
}
