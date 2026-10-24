"use client";

import { type ReactNode, createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  CURRENT_USER,
  type Chore,
  type CreateChoreInput,
  type CreateRewardInput,
  type Group,
  type Member,
  type Reward,
  claimChore,
  completeChore,
  createChore,
  createGroup,
  createReward,
  deleteChore,
  getInviteCode,
  listChores,
  listGroups,
  listMembers,
  listRewards,
  redeemReward,
} from "@/lib/chores";

export type Modal = "add-chore" | "remove-chore" | "update-rewards" | "create-group";
export type NewChore = Omit<CreateChoreInput, "groupId">;
export type NewReward = Omit<CreateRewardInput, "groupId">;

type AppState = {
  groups: Group[];
  group: Group | undefined;
  chores: Chore[];
  members: Member[];
  rewards: Reward[];
  myPoints: number;
  ready: boolean;
  pending: boolean;
  modal: Modal | null;
  toast: string | null;
  setModal: (modal: Modal | null) => void;
  notify: (msg: string) => void;
  switchGroup: (id: number) => void;
  claim: (id: number) => void;
  complete: (id: number) => void;
  redeem: (reward: Reward) => void;
  removeChore: (id: number) => void;
  addChore: (input: NewChore) => void;
  addReward: (input: NewReward) => void;
  addGroup: (name: string) => void;
  inviteMember: () => void;
};

const AppContext = createContext<AppState | null>(null);

export function useApp() {
  const state = useContext(AppContext);
  if (!state) throw new Error("useApp must be used inside AppProvider");
  return state;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState<number | null>(null);
  const [chores, setChores] = useState<Chore[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [modal, setModal] = useState<Modal | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(() => {
    let cancelled = false;
    listGroups()
      .then((nextGroups) => {
        if (cancelled) return;
        setGroups(nextGroups);
        setGroupId((current) => current ?? nextGroups[0]?.id ?? null);
        if (nextGroups.length === 0) setReady(true);
      })
      .catch(() => {
        if (!cancelled) notify("Could not load groups");
      });
    return () => {
      cancelled = true;
    };
  }, [notify]);

  useEffect(() => {
    if (groupId == null) return;
    let cancelled = false;
    Promise.all([listChores(groupId), listMembers(groupId), listRewards(groupId)])
      .then(([nextChores, nextMembers, nextRewards]) => {
        if (cancelled) return;
        setChores(nextChores);
        setMembers(nextMembers);
        setRewards(nextRewards);
      })
      .catch(() => {
        if (!cancelled) notify("Could not load household");
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [groupId, notify]);

  const group = groups.find((item) => item.id === groupId);
  const myPoints = members.find((member) => member.id === CURRENT_USER.id)?.points ?? 0;

  const run = async (action: () => Promise<void>, failure: string) => {
    if (pending) return;
    setPending(true);
    try {
      await action();
    } catch {
      notify(failure);
    } finally {
      setPending(false);
    }
  };

  const openGroup = (id: number) => {
    setReady(false);
    setChores([]);
    setMembers([]);
    setRewards([]);
    setGroupId(id);
  };

  const switchGroup = (id: number) => {
    if (id === groupId) return;
    openGroup(id);
    notify(`Switched to ${groups.find((item) => item.id === id)?.name ?? "household"}`);
  };

  const claim = (id: number) =>
    run(async () => {
      const chore = await claimChore(id);
      setChores((current) => current.map((item) => (item.id === chore.id ? chore : item)));
      notify("Chore claimed");
    }, "Could not claim chore");

  const complete = (id: number) =>
    run(async () => {
      const { chore, member } = await completeChore(id);
      setChores((current) => current.map((item) => (item.id === chore.id ? chore : item)));
      setMembers((current) => current.map((item) => (item.id === member.id ? member : item)));
      notify(`Completed. +${chore.points} points`);
    }, "Could not complete chore");

  const redeem = (reward: Reward) =>
    run(async () => {
      const member = await redeemReward(reward.groupId, reward.id);
      setMembers((current) => current.map((item) => (item.id === member.id ? member : item)));
      notify(`Redeemed: ${reward.title}`);
    }, "Could not redeem reward");

  const removeChore = (id: number) =>
    run(async () => {
      await deleteChore(id);
      setChores((current) => current.filter((chore) => chore.id !== id));
      notify("Chore removed");
    }, "Could not remove chore");

  const addChore = (input: NewChore) => {
    if (groupId == null) return;
    run(async () => {
      const chore = await createChore({ ...input, groupId });
      setChores((current) => [...current, chore]);
      setModal(null);
      notify("Chore added");
    }, "Could not add chore");
  };

  const addReward = (input: NewReward) => {
    if (groupId == null) return;
    run(async () => {
      const reward = await createReward({ ...input, groupId });
      setRewards((current) => [...current, reward]);
      setModal(null);
      notify(`Reward added: ${reward.title}`);
    }, "Could not add reward");
  };

  const addGroup = (name: string) =>
    run(async () => {
      const { inviteCode, ...created } = await createGroup(name);
      setGroups((current) => [...current, created]);
      openGroup(created.id);
      setModal(null);
      notify(`Created ${created.name}. Invite code: ${inviteCode}`);
    }, "Could not create group");

  const inviteMember = () => {
    if (groupId == null) return;
    run(async () => {
      const { invite_code: code } = await getInviteCode(groupId);
      const copied = await (navigator.clipboard?.writeText(code).then(() => true, () => false) ?? false);
      notify(copied ? `Invite code ${code} copied` : `Invite code: ${code}`);
    }, "Could not get invite code");
  };

  return (
    <AppContext.Provider
      value={{
        groups,
        group,
        chores,
        members,
        rewards,
        myPoints,
        ready,
        pending,
        modal,
        toast,
        setModal,
        notify,
        switchGroup,
        claim,
        complete,
        redeem,
        removeChore,
        addChore,
        addReward,
        addGroup,
        inviteMember,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function Toast() {
  const { toast } = useApp();
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-[#1c2750] px-5 py-2.5 text-sm font-medium text-white shadow-lg transition-all duration-200 ${
        toast ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
      }`}
    >
      {toast}
    </div>
  );
}
