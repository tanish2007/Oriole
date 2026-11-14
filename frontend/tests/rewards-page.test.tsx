import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import RewardsPage from "@/app/(main)/groups/[groupId]/rewards/page";
import { listMembers } from "@/lib/chores";
import { createReward, deleteReward, listRewards, redeemReward, updateReward } from "@/lib/rewards";

// Everything the page gets from outside is replaced, so these tests need no backend.
const { notify, group, router } = vi.hoisted(() => ({
  notify: vi.fn(),
  group: { id: 7, name: "Maple House" },
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
vi.mock("@/lib/chores", () => ({ listMembers: vi.fn() }));
vi.mock("@/lib/session", () => ({ CURRENT_USER: { id: 1, name: "Test User", email: "test@example.com" } }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/groups/7/rewards",
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(),
}));

const dinner = { id: 1, title: "Pick dinner", cost: 25, scope: "Group" as const };
const movie = { id: 2, title: "Choose movie night", cost: 20, scope: "Personal" as const };

function setPoints(points: number) {
  vi.mocked(listMembers).mockResolvedValue([{ id: 1, points }] as never);
}

async function renderPage() {
  const user = userEvent.setup();
  render(<RewardsPage />);
  await screen.findByText(dinner.title);
  return user;
}

const rowOf = (title: string) => screen.getByText(title).closest("li") as HTMLElement;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listRewards).mockResolvedValue([dinner, movie]);
  setPoints(30);
});

describe("loading", () => {
  it("shows each reward with its cost and type, and the user's points", async () => {
    await renderPage();
    expect(screen.getByText("25 pts · Group")).toBeInTheDocument();
    expect(screen.getByText("20 pts · Personal")).toBeInTheDocument();
    expect(await screen.findByText("30")).toBeInTheDocument();
    expect(listRewards).toHaveBeenCalledWith(7);
  });

  it("shows an empty state when the group has no rewards", async () => {
    vi.mocked(listRewards).mockResolvedValue([]);
    render(<RewardsPage />);
    expect(await screen.findByText("No rewards yet. Add one for the group.")).toBeInTheDocument();
  });

  it("shows the error and notifies when loading fails", async () => {
    vi.mocked(listRewards).mockRejectedValue(new Error("boom"));
    render(<RewardsPage />);
    expect(await screen.findByText("boom")).toBeInTheDocument();
    expect(notify).toHaveBeenCalledWith("boom");
  });
});

describe("redeeming", () => {
  it("disables Redeem and says how many points are missing when points are short", async () => {
    setPoints(10);
    await renderPage();
    const [dinnerRedeem, movieRedeem] = screen.getAllByRole("button", { name: "Redeem" });
    expect(dinnerRedeem).toBeDisabled();
    expect(dinnerRedeem).toHaveAttribute("title", "Need 15 more points");
    expect(movieRedeem).toBeDisabled();
    expect(redeemReward).not.toHaveBeenCalled();
  });

  it("enables Redeem when the user has exactly the cost", async () => {
    setPoints(25);
    await renderPage();
    const [dinnerRedeem, movieRedeem] = screen.getAllByRole("button", { name: "Redeem" });
    expect(dinnerRedeem).toBeEnabled();
    expect(movieRedeem).toBeEnabled();
  });

  it("redeems, shows the new balance and notifies", async () => {
    vi.mocked(redeemReward).mockImplementation(async () => {
      setPoints(5); // the server now reports the lower balance
      return { id: 1, name: "Test User", points: 5 } as never;
    });
    const user = await renderPage();
    await user.click(within(rowOf("Pick dinner")).getByRole("button", { name: "Redeem" }));
    expect(redeemReward).toHaveBeenCalledWith(7, 1);
    expect(await screen.findByText("5")).toBeInTheDocument();
    expect(notify).toHaveBeenCalledWith("Redeemed: Pick dinner");
  });

  it("notifies with the error and keeps the balance when redeeming fails", async () => {
    vi.mocked(redeemReward).mockRejectedValue(new Error("Not enough points."));
    const user = await renderPage();
    await user.click(within(rowOf("Pick dinner")).getByRole("button", { name: "Redeem" }));
    expect(notify).toHaveBeenCalledWith("Not enough points.");
    expect(await screen.findByText("30")).toBeInTheDocument();
  });
});

describe("adding a reward", () => {
  async function openAddModal() {
    const user = await renderPage();
    await user.click(screen.getByRole("button", { name: "Add reward" }));
    return { user, dialog: screen.getByRole("dialog") };
  }

  it("shows both errors and saves nothing when the form is empty", async () => {
    const { user, dialog } = await openAddModal();
    await user.click(within(dialog).getByRole("button", { name: "Add reward" }));
    expect(within(dialog).getByText("Enter a reward name.")).toBeInTheDocument();
    expect(within(dialog).getByText("Enter whole points, 1 or more.")).toBeInTheDocument();
    expect(createReward).not.toHaveBeenCalled();
  });

  it.each(["0", "-3", "2.5"])("rejects a cost of %s", async (cost) => {
    const { user, dialog } = await openAddModal();
    await user.type(screen.getByLabelText("Reward name"), "Free coffee");
    await user.type(screen.getByLabelText("Point cost"), cost);
    await user.click(within(dialog).getByRole("button", { name: "Add reward" }));
    expect(within(dialog).getByText("Enter whole points, 1 or more.")).toBeInTheDocument();
    expect(createReward).not.toHaveBeenCalled();
  });

  it("saves the trimmed name, cost and type, then closes and shows the reward", async () => {
    const created = { id: 3, title: "Free coffee", cost: 30, scope: "Personal" as const };
    vi.mocked(createReward).mockImplementation(async () => {
      vi.mocked(listRewards).mockResolvedValue([dinner, movie, created]);
      return created;
    });
    const { user, dialog } = await openAddModal();
    await user.type(screen.getByLabelText("Reward name"), "  Free coffee  ");
    await user.type(screen.getByLabelText("Point cost"), "30");
    await user.selectOptions(screen.getByLabelText("Type"), "Personal");
    await user.click(within(dialog).getByRole("button", { name: "Add reward" }));

    expect(createReward).toHaveBeenCalledWith(7, { title: "Free coffee", cost: 30, scope: "Personal" });
    expect(await screen.findByText("Free coffee")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(notify).toHaveBeenCalledWith("Reward added");
  });

  it("defaults the type to Group", async () => {
    vi.mocked(createReward).mockResolvedValue({ id: 3, title: "Pizza", cost: 10, scope: "Group" });
    const { user, dialog } = await openAddModal();
    await user.type(screen.getByLabelText("Reward name"), "Pizza");
    await user.type(screen.getByLabelText("Point cost"), "10");
    await user.click(within(dialog).getByRole("button", { name: "Add reward" }));
    expect(createReward).toHaveBeenCalledWith(7, { title: "Pizza", cost: 10, scope: "Group" });
  });

  it("keeps the modal open and notifies when saving fails", async () => {
    vi.mocked(createReward).mockRejectedValue(new Error("Could not save reward"));
    const { user, dialog } = await openAddModal();
    await user.type(screen.getByLabelText("Reward name"), "Pizza");
    await user.type(screen.getByLabelText("Point cost"), "10");
    await user.click(within(dialog).getByRole("button", { name: "Add reward" }));
    expect(notify).toHaveBeenCalledWith("Could not save reward");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes when the backdrop is clicked", async () => {
    const { user, dialog } = await openAddModal();
    await user.click(dialog.parentElement as HTMLElement);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes on Escape and on Cancel without saving", async () => {
    const { user } = await openAddModal();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add reward" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(createReward).not.toHaveBeenCalled();
  });
});

describe("editing a reward", () => {
  it("opens with the current values and saves the changes", async () => {
    const edited = { ...dinner, cost: 40 };
    vi.mocked(updateReward).mockImplementation(async () => {
      vi.mocked(listRewards).mockResolvedValue([edited, movie]);
      return edited;
    });
    const user = await renderPage();
    await user.click(within(rowOf("Pick dinner")).getByRole("button", { name: "Edit" }));

    const dialog = screen.getByRole("dialog", { name: "Edit reward" });
    expect(screen.getByLabelText("Reward name")).toHaveValue("Pick dinner");
    expect(screen.getByLabelText("Point cost")).toHaveValue(25);
    expect(screen.getByLabelText("Type")).toHaveValue("Group");

    await user.clear(screen.getByLabelText("Point cost"));
    await user.type(screen.getByLabelText("Point cost"), "40");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(updateReward).toHaveBeenCalledWith(7, 1, { title: "Pick dinner", cost: 40, scope: "Group" });
    expect(await screen.findByText("40 pts · Group")).toBeInTheDocument();
    expect(notify).toHaveBeenCalledWith("Reward updated");
  });
});

describe("removing a reward", () => {
  it("asks for confirmation first, and Cancel keeps the reward", async () => {
    const user = await renderPage();
    await user.click(within(rowOf("Pick dinner")).getByRole("button", { name: "Remove" }));
    expect(deleteReward).not.toHaveBeenCalled();

    await user.click(within(rowOf("Pick dinner")).getByRole("button", { name: "Cancel" }));
    expect(deleteReward).not.toHaveBeenCalled();
    expect(within(rowOf("Pick dinner")).getByRole("button", { name: "Redeem" })).toBeInTheDocument();
  });

  it("deletes after confirming and removes it from the list", async () => {
    vi.mocked(deleteReward).mockImplementation(async () => {
      vi.mocked(listRewards).mockResolvedValue([movie]);
    });
    const user = await renderPage();
    await user.click(within(rowOf("Pick dinner")).getByRole("button", { name: "Remove" }));
    await user.click(within(rowOf("Pick dinner")).getByRole("button", { name: "Remove" }));

    expect(deleteReward).toHaveBeenCalledWith(7, 1);
    await vi.waitFor(() => expect(screen.queryByText("Pick dinner")).not.toBeInTheDocument());
    expect(notify).toHaveBeenCalledWith("Reward removed");
  });
});
