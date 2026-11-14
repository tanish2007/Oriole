
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "@/lib/api/gen/rewards";
import {
  listRewards,
  createReward,
  updateReward,
  deleteReward,
  redeemReward,
} from "@/lib/rewards";

vi.mock("@/lib/api/gen/rewards", () => ({
  listRewards: vi.fn(),
  createReward: vi.fn(),
  updateReward: vi.fn(),
  deleteReward: vi.fn(),
  redeemReward: vi.fn(),
}));

describe("Reward client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists rewards and converts API responses", async () => {
    vi.mocked(api.listRewards).mockResolvedValue([
      { id: 1, name: "Free coffee", cost: 30, type: "individual" },
      { id: 2, name: "Pick dinner", cost: 25, type: "group" },
    ]);

    const result = await listRewards(7);

    expect(api.listRewards).toHaveBeenCalledWith({ group_id: 7 });
    expect(result).toEqual([
      { id: 1, title: "Free coffee", cost: 30, scope: "Personal" },
      { id: 2, title: "Pick dinner", cost: 25, scope: "Group" },
    ]);
  });

  it("creates a personal reward", async () => {
    vi.mocked(api.createReward).mockResolvedValue({
      id: 3, name: "Ice cream", cost: 20, type: "individual",
    });

    const result = await createReward(7, {
      title: "Ice cream", cost: 20, scope: "Personal",
    });

    expect(api.createReward).toHaveBeenCalledWith({
      group_id: 7,
      name: "Ice cream",
      cost: 20,
      type: "individual",
    });
    expect(result.scope).toBe("Personal");
  });

  it("trims the reward title before creating", async () => {
    vi.mocked(api.createReward).mockResolvedValue({
      id: 3, name: "Ice cream", cost: 20, type: "individual",
    });

    await createReward(7, {
      title: "  Ice cream  ", cost: 20, scope: "Personal",
    });

    expect(api.createReward).toHaveBeenCalledWith({
      group_id: 7,
      name: "Ice cream",
      cost: 20,
      type: "individual",
    });
  });

  it("updates a group reward", async () => {
    vi.mocked(api.updateReward).mockResolvedValue({
      id: 2, name: "Movie night", cost: 40, type: "group",
    });

    const result = await updateReward(7, 2, {
      title: "Movie night", cost: 40, scope: "Group",
    });

    expect(api.updateReward).toHaveBeenCalledWith(2, {
      name: "Movie night",
      cost: 40,
      type: "group",
    });
    expect(result.title).toBe("Movie night");
  });

  it("deletes a reward", async () => {
    vi.mocked(api.deleteReward).mockResolvedValue(undefined);

    await expect(deleteReward(7, 2)).resolves.toBeUndefined();
    expect(api.deleteReward).toHaveBeenCalledWith(2);
  });

  it("redeems a reward and converts the returned member", async () => {
    vi.mocked(api.redeemReward).mockResolvedValue({
      id: 1, name: "Jennifer Ye", points: 70,
    });

    const result = await redeemReward(7, 2);

    expect(api.redeemReward).toHaveBeenCalledWith(2);
    expect(result).toEqual({
      id: 1, name: "Jennifer Ye", points: 70,
    });
  });

  it("rejects an empty reward title", async () => {
    await expect(
      createReward(7, { title: "  ", cost: 20, scope: "Personal" }),
    ).rejects.toThrow("Enter a reward name.");

    expect(api.createReward).not.toHaveBeenCalled();
  });

  it("rejects a zero reward cost", async () => {
    await expect(
      createReward(7, { title: "Coffee", cost: 0, scope: "Personal" }),
    ).rejects.toThrow("Enter whole points, 1 or more.");

    expect(api.createReward).not.toHaveBeenCalled();
  });

  it("rejects a non-integer reward cost", async () => {
    await expect(
      createReward(7, { title: "Coffee", cost: 2.5, scope: "Personal" }),
    ).rejects.toThrow("Enter whole points, 1 or more.");
  });

  it("rejects an invalid reward scope", async () => {
    await expect(
      createReward(7, {
        title: "Coffee",
        cost: 20,
        scope: "Other" as "Personal",
      }),
    ).rejects.toThrow("Choose group or personal.");
  });
});
