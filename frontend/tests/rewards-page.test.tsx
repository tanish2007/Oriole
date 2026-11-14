import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import RewardsPage from "@/app/(main)/groups/[groupId]/rewards/page";
import { listMembers } from "@/lib/chores";
import {
  createReward,
  deleteReward,
  listRewards,
  redeemReward,
  updateReward,
} from "@/lib/rewards";

const { notify, group, router } = vi.hoisted(() => ({
  notify: vi.fn(),
  group: { id: 7, name: "Test Group" },
  router: { replace: vi.fn(), push: vi.fn() },
}));

vi.mock("@/components/app-shell", () => ({
  useNotify: () => notify,
  useGroup: () => group,
  useRefreshTick: () => 0,
}));

vi.mock("@/lib/rewards", () => ({
  listRewards: vi.fn(),
  createReward: vi.fn(),
  updateReward: vi.fn(),
  deleteReward: vi.fn(),
  redeemReward: vi.fn(),
}));

vi.mock("@/lib/chores", () => ({
  listMembers: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  CURRENT_USER: {
    id: 1,
    name: "Test User",
    email: "test@example.com",
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/groups/7/rewards",
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(),
}));

const reward = {
  id: 1,
  title: "Free coffee",
  cost: 30,
  scope: "Personal" as const,
};

function setPoints(points: number) {
  vi.mocked(listMembers).mockResolvedValue([
    { id: 1, points },
  ] as never);
}

async function renderPage() {
  const user = userEvent.setup();
  render(<RewardsPage />);

  await screen.findByText("Free coffee");

  return user;
}

function rewardRow(title = "Free coffee") {
  return screen.getByText(title).closest("li") as HTMLElement;
}

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(listRewards).mockResolvedValue([reward]);
  setPoints(100);
});

describe("Rewards page", () => {
  it("displays rewards and the user's points", async () => {
    await renderPage();

    expect(screen.getByText("Free coffee")).toBeInTheDocument();
    expect(screen.getByText("30 pts · Personal")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(listRewards).toHaveBeenCalledWith(7);
  });

  it("shows an empty message when there are no rewards", async () => {
    vi.mocked(listRewards).mockResolvedValue([]);

    render(<RewardsPage />);

    expect(
      await screen.findByText("No rewards yet. Add one for the group.")
    ).toBeInTheDocument();
  });

  it("shows an error if rewards fail to load", async () => {
    vi.mocked(listRewards).mockRejectedValue(
      new Error("Could not load rewards")
    );

    render(<RewardsPage />);

    expect(
      await screen.findByText("Could not load rewards")
    ).toBeInTheDocument();

    expect(notify).toHaveBeenCalledWith("Could not load rewards");
  });

  it("creates a reward", async () => {
    const created = {
      id: 2,
      title: "Movie night",
      cost: 50,
      scope: "Group" as const,
    };

    vi.mocked(createReward).mockImplementation(async () => {
      vi.mocked(listRewards).mockResolvedValue([reward, created]);
      return created;
    });

    const user = await renderPage();

    await user.click(screen.getByRole("button", { name: "Add reward" }));

    const dialog = screen.getByRole("dialog");

    await user.type(
      within(dialog).getByLabelText("Reward name"),
      "Movie night"
    );

    await user.type(
      within(dialog).getByLabelText("Point cost"),
      "50"
    );

    await user.click(
      within(dialog).getByRole("button", { name: "Add reward" })
    );

    expect(createReward).toHaveBeenCalledWith(7, {
      title: "Movie night",
      cost: 50,
      scope: "Group",
    });

    expect(await screen.findByText("Movie night")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(notify).toHaveBeenCalledWith("Reward added");
  });

  it("does not create a reward with an empty name or invalid cost", async () => {
    const user = await renderPage();

    await user.click(screen.getByRole("button", { name: "Add reward" }));

    const dialog = screen.getByRole("dialog");

    await user.click(
      within(dialog).getByRole("button", { name: "Add reward" })
    );

    expect(
      within(dialog).getByText("Enter a reward name.")
    ).toBeInTheDocument();

    expect(
      within(dialog).getByText("Enter whole points, 1 or more.")
    ).toBeInTheDocument();

    expect(createReward).not.toHaveBeenCalled();
  });

  it("edits an existing reward", async () => {
    const edited = {
      ...reward,
      title: "Coffee and snacks",
      cost: 40,
    };

    vi.mocked(updateReward).mockImplementation(async () => {
      vi.mocked(listRewards).mockResolvedValue([edited]);
      return edited;
    });

    const user = await renderPage();

    await user.click(
      within(rewardRow()).getByRole("button", { name: "Edit" })
    );

    const dialog = screen.getByRole("dialog");

    const nameInput = within(dialog).getByLabelText("Reward name");
    const costInput = within(dialog).getByLabelText("Point cost");

    await user.clear(nameInput);
    await user.type(nameInput, "Coffee and snacks");

    await user.clear(costInput);
    await user.type(costInput, "40");

    await user.click(
      within(dialog).getByRole("button", { name: "Save" })
    );

    expect(updateReward).toHaveBeenCalledWith(7, 1, {
      title: "Coffee and snacks",
      cost: 40,
      scope: "Personal",
    });

    expect(
      await screen.findByText("Coffee and snacks")
    ).toBeInTheDocument();

    expect(notify).toHaveBeenCalledWith("Reward updated");
  });

  it("redeems a reward and updates the points", async () => {
    vi.mocked(redeemReward).mockImplementation(async () => {
      setPoints(70);
      return { id: 1, points: 70 } as never;
    });

    const user = await renderPage();

    await user.click(
      within(rewardRow()).getByRole("button", { name: "Redeem" })
    );

    expect(redeemReward).toHaveBeenCalledWith(7, 1);

    await vi.waitFor(() => {
      expect(screen.getByText("Your points:").parentElement)
        .toHaveTextContent("70");
    });

    expect(notify).toHaveBeenCalledWith("Redeemed: Free coffee");
  });

  it("does not redeem a reward when the user has insufficient points", async () => {
    setPoints(10);

    const user = await renderPage();

    const redeemButton = within(rewardRow()).getByRole("button", {
      name: "Redeem",
    });

    expect(redeemButton).toBeDisabled();
    expect(redeemButton).toHaveAttribute(
      "title",
      "Need 20 more points"
    );

    await user.click(redeemButton);

    expect(redeemReward).not.toHaveBeenCalled();
  });

  it("removes a reward after confirmation", async () => {
    vi.mocked(deleteReward).mockImplementation(async () => {
      vi.mocked(listRewards).mockResolvedValue([]);
    });

    const user = await renderPage();

    await user.click(
      within(rewardRow()).getByRole("button", { name: "Remove" })
    );

    expect(deleteReward).not.toHaveBeenCalled();

    await user.click(
      within(rewardRow()).getByRole("button", { name: "Remove" })
    );

    expect(deleteReward).toHaveBeenCalledWith(7, 1);

    await vi.waitFor(() => {
      expect(screen.queryByText("Free coffee")).not.toBeInTheDocument();
    });

    expect(notify).toHaveBeenCalledWith("Reward removed");
  });

  it("cancels removing a reward", async () => {
    const user = await renderPage();

    await user.click(
      within(rewardRow()).getByRole("button", { name: "Remove" })
    );

    await user.click(
      within(rewardRow()).getByRole("button", { name: "Cancel" })
    );

    expect(deleteReward).not.toHaveBeenCalled();
    expect(screen.getByText("Free coffee")).toBeInTheDocument();

    expect(
      within(rewardRow()).getByRole("button", { name: "Redeem" })
    ).toBeInTheDocument();
  });
});