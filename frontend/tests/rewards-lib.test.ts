import { beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "@/lib/api/gen/rewards";
import { toApiRewardType, toMember, toReward } from "@/lib/map";
import { createReward, deleteReward, listRewards, redeemReward, updateReward } from "@/lib/rewards";

// The generated API client is replaced, so nothing here makes a network call.
vi.mock("@/lib/api/gen/rewards", () => ({
  listRewards: vi.fn(),
  createReward: vi.fn(),
  updateReward: vi.fn(),
  deleteReward: vi.fn(),
  redeemReward: vi.fn(),
}));
vi.mock("@/lib/session", () => ({ CURRENT_USER: { id: 1, name: "Test User", email: "test@example.com" } }));

const apiDinner = { id: 1, name: "Pick dinner", cost: 25, type: "group" };
const apiMovie = { id: 2, name: "Choose movie night", cost: 20, type: "individual" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("map: reward helpers", () => {
  it("maps UI scope to the API type", () => {
    expect(toApiRewardType("Personal")).toBe("individual");
    expect(toApiRewardType("Group")).toBe("group");
  });

  it("maps an API reward to the UI shape (name to title, type to scope)", () => {
    expect(toReward(apiDinner)).toEqual({ id: 1, title: "Pick dinner", cost: 25, scope: "Group" });
    expect(toReward(apiMovie)).toEqual({ id: 2, title: "Choose movie night", cost: 20, scope: "Personal" });
  });

  it("treats an unknown API type as Group", () => {
    expect(toReward({ ...apiDinner, type: "team" }).scope).toBe("Group");
  });

  it("round-trips scope through the API type", () => {
    expect(toApiRewardType(toReward(apiMovie).scope)).toBe("individual");
    expect(toApiRewardType(toReward(apiDinner).scope)).toBe("group");
  });
});

describe("map: toMember", () => {
  it("keeps a real name", () => {
    expect(toMember({ id: 1, name: "Real Name", points: 5 })).toEqual({ id: 1, name: "Real Name", points: 5 });
  });

  it("uses the signed-in user's name when the API sends a blank or placeholder name", () => {
    expect(toMember({ id: 1, name: "Member 1", points: 5 }).name).toBe("Test User");
    expect(toMember({ id: 1, name: "", points: 5 }).name).toBe("Test User");
  });

  it("leaves other users' placeholder names alone", () => {
    expect(toMember({ id: 2, name: "Member 2", points: 5 }).name).toBe("Member 2");
  });
});

describe("listRewards", () => {
  it("asks the API for the group and maps every row", async () => {
    vi.mocked(api.listRewards).mockResolvedValue([apiDinner, apiMovie] as never);
    const result = await listRewards(7);
    expect(api.listRewards).toHaveBeenCalledWith({ group_id: 7, user_id: 1 });
    expect(result).toEqual([
      { id: 1, title: "Pick dinner", cost: 25, scope: "Group" },
      { id: 2, title: "Choose movie night", cost: 20, scope: "Personal" },
    ]);
  });

  it("passes API errors through", async () => {
    vi.mocked(api.listRewards).mockRejectedValue(new Error("Not a member of this group"));
    await expect(listRewards(7)).rejects.toThrow("Not a member of this group");
  });
});

describe("createReward", () => {
  it("sends the trimmed name and the API type, and returns the UI reward", async () => {
    vi.mocked(api.createReward).mockResolvedValue({ id: 3, name: "Free coffee", cost: 30, type: "individual" } as never);
    const result = await createReward(7, { title: "  Free coffee  ", cost: 30, scope: "Personal" });
    expect(api.createReward).toHaveBeenCalledWith({
      user_id: 1,
      group_id: 7,
      name: "Free coffee",
      cost: 30,
      type: "individual",
    });
    expect(result).toEqual({ id: 3, title: "Free coffee", cost: 30, scope: "Personal" });
  });

  it("sends type group for a Group reward", async () => {
    vi.mocked(api.createReward).mockResolvedValue(apiDinner as never);
    await createReward(7, { title: "Pick dinner", cost: 25, scope: "Group" });
    expect(api.createReward).toHaveBeenCalledWith({
      user_id: 1,
      group_id: 7,
      name: "Pick dinner",
      cost: 25,
      type: "group",
    });
  });

  it.each([
    ["a blank name", { title: "   ", cost: 10, scope: "Group" }, "Enter a reward name."],
    ["a cost of 0", { title: "A", cost: 0, scope: "Group" }, "Enter whole points, 1 or more."],
    ["a negative cost", { title: "A", cost: -1, scope: "Group" }, "Enter whole points, 1 or more."],
    ["a decimal cost", { title: "A", cost: 2.5, scope: "Group" }, "Enter whole points, 1 or more."],
    ["an unknown scope", { title: "A", cost: 10, scope: "Team" }, "Choose group or personal."],
  ])("rejects %s without calling the API", async (_label, input, message) => {
    await expect(createReward(7, input as never)).rejects.toThrow(message);
    expect(api.createReward).not.toHaveBeenCalled();
  });
});

describe("updateReward", () => {
  it("updates by reward id (the group id is not sent) and returns the UI reward", async () => {
    vi.mocked(api.updateReward).mockResolvedValue({ id: 1, name: "Taco night", cost: 30, type: "individual" } as never);
    const result = await updateReward(7, 1, { title: " Taco night ", cost: 30, scope: "Personal" });
    expect(api.updateReward).toHaveBeenCalledWith(
      1,
      { name: "Taco night", cost: 30, type: "individual" },
      { user_id: 1 },
    );
    expect(result).toEqual({ id: 1, title: "Taco night", cost: 30, scope: "Personal" });
  });

  it("rejects invalid input without calling the API", async () => {
    await expect(updateReward(7, 1, { title: "A", cost: 0, scope: "Group" })).rejects.toThrow("Enter whole points, 1 or more.");
    expect(api.updateReward).not.toHaveBeenCalled();
  });
});

describe("deleteReward", () => {
  it("deletes by reward id", async () => {
    vi.mocked(api.deleteReward).mockResolvedValue(undefined as never);
    await expect(deleteReward(7, 1)).resolves.toBeUndefined();
    expect(api.deleteReward).toHaveBeenCalledWith(1, { user_id: 1 });
  });
});

describe("redeemReward", () => {
  it("redeems by reward id and returns the member with their new points", async () => {
    vi.mocked(api.redeemReward).mockResolvedValue({ id: 1, name: "Real Name", points: 5 } as never);
    const result = await redeemReward(7, 1);
    expect(api.redeemReward).toHaveBeenCalledWith(1, { user_id: 1 });
    expect(result).toEqual({ id: 1, name: "Real Name", points: 5 });
  });

  it("passes API errors through (for example, not enough points)", async () => {
    vi.mocked(api.redeemReward).mockRejectedValue(new Error("Not enough points."));
    await expect(redeemReward(7, 1)).rejects.toThrow("Not enough points.");
  });
});
