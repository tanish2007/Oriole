(() => {
  const CURRENT_USER = "Alex Rivera";

  const state = {
    groupId: "maple",
    filter: "all",
    period: "week",
    calMonth: 9, // Oct 2026 (0-indexed)
    calYear: 2026,
    yourPoints: 42,
  };

  const groups = {
    maple: {
      id: "maple",
      name: "Maple House",
      members: 4,
      role: "member",
      tag: "Home",
    },
    study: {
      id: "study",
      name: "Study Squad",
      members: 5,
      role: "owner",
      tag: "Owner",
    },
  };

  let chores = [
    {
      id: 1,
      title: "Kitchen deep clean",
      desc: "Counters, sink, stove, floors",
      points: 15,
      due: "2026-10-12",
      assignee: null,
      status: "available",
      group: "maple",
    },
    {
      id: 2,
      title: "Take out trash",
      desc: "Kitchen + bathrooms",
      points: 5,
      due: "2026-10-11",
      assignee: "Jordan Lee",
      status: "claimed",
      group: "maple",
    },
    {
      id: 3,
      title: "Vacuum living room",
      desc: "Rugs and under couch",
      points: 10,
      due: "2026-10-14",
      assignee: CURRENT_USER,
      status: "claimed",
      group: "maple",
    },
    {
      id: 4,
      title: "Grocery run",
      desc: "Shared list on fridge",
      points: 12,
      due: "2026-10-13",
      assignee: null,
      status: "available",
      group: "maple",
    },
    {
      id: 5,
      title: "Wipe bathrooms",
      desc: "Sinks, mirrors, counters",
      points: 10,
      due: "2026-10-09",
      assignee: "Sam Okonkwo",
      status: "done",
      group: "maple",
    },
    {
      id: 6,
      title: "Laundry fold & put away",
      desc: "Shared towels only",
      points: 8,
      due: "2026-10-16",
      assignee: null,
      status: "available",
      group: "maple",
    },
  ];

  let rewards = [
    { id: 1, title: "Pick dinner", cost: 25, group: true },
    { id: 2, title: "Skip one chore", cost: 40, group: true },
    { id: 3, title: "Choose movie night", cost: 20, group: false },
  ];

  const members = {
    maple: [
      { name: CURRENT_USER, week: 42, month: 118 },
      { name: "Jordan Lee", week: 38, month: 96 },
      { name: "Sam Okonkwo", week: 55, month: 140 },
      { name: "Riley Chen", week: 27, month: 81 },
    ],
    study: [
      { name: CURRENT_USER, week: 18, month: 44 },
      { name: "Priya N.", week: 30, month: 72 },
      { name: "Chris M.", week: 22, month: 61 },
      { name: "Taylor B.", week: 15, month: 39 },
      { name: "Devon K.", week: 12, month: 28 },
    ],
  };

  // DOM
  const loginScreen = document.getElementById("login-screen");
  const app = document.getElementById("app");
  const toastEl = document.getElementById("toast");
  const modal = document.getElementById("modal");
  const backdrop = document.getElementById("modal-backdrop");
  const modalTitle = document.getElementById("modal-title");
  const modalBody = document.getElementById("modal-body");
  const modalConfirm = document.getElementById("modal-confirm");
  const modalCancel = document.getElementById("modal-cancel");
  const sidebar = document.getElementById("sidebar");

  let modalOnConfirm = null;

  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => toastEl.classList.remove("show"), 2400);
  }

  function openModal({ title, bodyHtml, confirmLabel = "Confirm", onConfirm }) {
    modalTitle.textContent = title;
    modalBody.innerHTML = bodyHtml;
    modalConfirm.textContent = confirmLabel;
    modalOnConfirm = onConfirm;
    modal.classList.remove("hidden");
    backdrop.classList.remove("hidden");
  }

  function closeModal() {
    modal.classList.add("hidden");
    backdrop.classList.add("hidden");
    modalOnConfirm = null;
  }

  modalCancel.addEventListener("click", closeModal);
  backdrop.addEventListener("click", closeModal);
  modalConfirm.addEventListener("click", () => {
    if (typeof modalOnConfirm === "function") modalOnConfirm();
  });

  function enterApp() {
    loginScreen.classList.add("hidden");
    app.classList.remove("hidden");
    app.setAttribute("aria-hidden", "false");
    renderAll();
    toast("Welcome back, Alex");
  }

  document.getElementById("btn-google-login").addEventListener("click", enterApp);
  document.getElementById("login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    enterApp();
  });

  document.getElementById("btn-logout").addEventListener("click", () => {
    app.classList.add("hidden");
    app.setAttribute("aria-hidden", "true");
    loginScreen.classList.remove("hidden");
    toast("Logged out");
  });

  document.getElementById("mobile-toggle").addEventListener("click", () => {
    sidebar.classList.toggle("open");
  });

  // Navigation
  document.querySelectorAll(".nav-link, .profile-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.view;
      const expand = btn.dataset.expand;

      if (expand) {
        const item = btn.closest(".nav-item");
        const wasOpen = item.classList.contains("open");
        document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("open"));
        if (!wasOpen) item.classList.add("open");
      } else {
        document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("open"));
      }

      if (view) showView(view);
      sidebar.classList.remove("open");
    });
  });

  function showView(view) {
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    const el = document.getElementById(`view-${view}`);
    if (el) el.classList.add("active");

    document.querySelectorAll(".nav-link").forEach((l) => {
      l.classList.toggle("active", l.dataset.view === view || (view === "dashboard" && l.dataset.view === "dashboard"));
    });

    if (view === "calendar") renderCalendar();
    if (view === "leaderboard") renderLeaderboard();
    if (view === "groups") renderGroups();
    if (view === "dashboard") {
      renderChores();
      renderRewards();
      renderPointsMini();
      updateGroupInfo();
    }
  }

  // Submenu actions
  document.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;
      if (action === "add-chore") promptAddChore();
      if (action === "remove-chore") promptRemoveChore();
      if (action === "update-rewards") promptUpdateReward();
      if (action === "invite") {
        toast("Invite link copied (prototype)");
      }
      if (action === "create-group") {
        toast("Create group flow — owner invites members");
      }
      if (action === "switch-group") {
        state.groupId = btn.dataset.group;
        showView("dashboard");
        document.querySelectorAll(".nav-link").forEach((l) => {
          l.classList.toggle("active", l.dataset.view === "dashboard");
        });
        toast(`Switched to ${groups[state.groupId].name}`);
      }
    });
  });

  // Filters
  document.querySelectorAll("[data-filter]").forEach((tab) => {
    tab.addEventListener("click", () => {
      state.filter = tab.dataset.filter;
      document.querySelectorAll("[data-filter]").forEach((t) => t.classList.toggle("active", t === tab));
      renderChores();
    });
  });

  document.querySelectorAll("[data-period]").forEach((tab) => {
    tab.addEventListener("click", () => {
      state.period = tab.dataset.period;
      document.querySelectorAll("[data-period]").forEach((t) => t.classList.toggle("active", t === tab));
      renderLeaderboard();
    });
  });

  document.getElementById("cal-prev").addEventListener("click", () => {
    state.calMonth -= 1;
    if (state.calMonth < 0) {
      state.calMonth = 11;
      state.calYear -= 1;
    }
    renderCalendar();
  });

  document.getElementById("cal-next").addEventListener("click", () => {
    state.calMonth += 1;
    if (state.calMonth > 11) {
      state.calMonth = 0;
      state.calYear += 1;
    }
    renderCalendar();
  });

  function formatDate(iso) {
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function updateGroupInfo() {
    const g = groups[state.groupId];
    document.querySelectorAll("#view-dashboard .group-info h2, #view-calendar .group-info h2").forEach((h) => {
      if (h.closest("#view-dashboard") || h.closest("#view-calendar")) {
        // handled below more carefully
      }
    });

    const dash = document.querySelector("#view-dashboard .group-info");
    if (dash) {
      dash.querySelector("h2").textContent = g.name;
      dash.querySelector(".muted").textContent = `${g.members} members · You are ${g.role === "owner" ? "the owner" : "a member"}`;
    }
    const cal = document.querySelector("#view-calendar .group-info");
    if (cal) {
      cal.querySelector("h2").textContent = g.name;
    }
    const lb = document.querySelector("#view-leaderboard .group-info");
    if (lb) {
      lb.querySelector(".eyebrow").textContent = g.name;
    }
    document.getElementById("your-points").textContent = String(state.yourPoints);
  }

  function filteredChores() {
    return chores
      .filter((c) => c.group === state.groupId)
      .filter((c) => {
        if (state.filter === "all") return true;
        if (state.filter === "available") return c.status === "available";
        if (state.filter === "mine") return c.assignee === CURRENT_USER && c.status !== "done";
        if (state.filter === "done") return c.status === "done";
        return true;
      });
  }

  function renderChores() {
    const tbody = document.getElementById("chore-tbody");
    const rows = filteredChores();
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="muted">No chores in this filter.</td></tr>`;
      return;
    }

    tbody.innerHTML = rows
      .map((c) => {
        let action = "";
        if (c.status === "available") {
          action = `<button type="button" class="action-btn" data-chore="${c.id}" data-do="claim">Claim</button>`;
        } else if (c.status === "claimed" && c.assignee === CURRENT_USER) {
          action = `<button type="button" class="action-btn" data-chore="${c.id}" data-do="complete">Complete</button>`;
        } else if (c.status === "claimed") {
          action = `<button type="button" class="action-btn secondary" disabled>Claimed</button>`;
        } else {
          action = `<button type="button" class="action-btn secondary" disabled>Done</button>`;
        }

        return `
          <tr>
            <td>
              <span class="chore-name">${escapeHtml(c.title)}</span>
              <span class="chore-desc">${escapeHtml(c.desc)}</span>
            </td>
            <td><span class="points-badge">${c.points}</span></td>
            <td>${formatDate(c.due)}</td>
            <td>${c.assignee ? escapeHtml(c.assignee) : "—"}</td>
            <td><span class="status ${c.status}">${labelStatus(c.status)}</span></td>
            <td>${action}</td>
          </tr>`;
      })
      .join("");

    tbody.querySelectorAll("[data-do]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = Number(btn.dataset.chore);
        const chore = chores.find((c) => c.id === id);
        if (!chore) return;
        if (btn.dataset.do === "claim") {
          chore.status = "claimed";
          chore.assignee = CURRENT_USER;
          toast(`Claimed “${chore.title}”`);
        } else if (btn.dataset.do === "complete") {
          chore.status = "done";
          state.yourPoints += chore.points;
          const me = members[state.groupId].find((m) => m.name === CURRENT_USER);
          if (me) {
            me.week += chore.points;
            me.month += chore.points;
          }
          toast(`+${chore.points} points for “${chore.title}”`);
        }
        renderAll();
      });
    });
  }

  function labelStatus(s) {
    if (s === "available") return "Available";
    if (s === "claimed") return "In progress";
    return "Completed";
  }

  function renderRewards() {
    const list = document.getElementById("reward-list");
    list.innerHTML = rewards
      .map(
        (r) => `
      <li class="reward-item">
        <div>
          <strong>${escapeHtml(r.title)}</strong>
          <div class="chore-desc">${r.cost} pts · ${r.group ? "Group" : "Personal"}</div>
        </div>
        <button type="button" data-reward="${r.id}" ${state.yourPoints < r.cost ? "disabled" : ""}>Redeem</button>
      </li>`
      )
      .join("");

    list.querySelectorAll("[data-reward]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const reward = rewards.find((r) => r.id === Number(btn.dataset.reward));
        if (!reward || state.yourPoints < reward.cost) return;
        state.yourPoints -= reward.cost;
        toast(`Redeemed “${reward.title}” (−${reward.cost} pts)`);
        renderAll();
      });
    });
  }

  function renderPointsMini() {
    const list = document.getElementById("points-mini");
    const ranked = [...members[state.groupId]].sort((a, b) => b.week - a.week);
    list.innerHTML = ranked
      .map(
        (m, i) => `
      <li class="points-item">
        <span class="rank">${i + 1}</span>
        <span class="who">${escapeHtml(m.name)}${m.name === CURRENT_USER ? " (you)" : ""}</span>
        <span class="pts">${m.week}</span>
      </li>`
      )
      .join("");
  }

  function renderLeaderboard() {
    const list = document.getElementById("leaderboard-list");
    const key = state.period === "week" ? "week" : "month";
    const ranked = [...members[state.groupId]].sort((a, b) => b[key] - a[key]);
    const max = ranked[0]?.[key] || 1;

    list.innerHTML = ranked
      .map(
        (m, i) => `
      <li class="leader-item ${m.name === CURRENT_USER ? "you" : ""}">
        <div class="meta">
          <span class="rank">${i + 1}</span>
          <div style="flex:1">
            <div class="who">${escapeHtml(m.name)}${m.name === CURRENT_USER ? " · you" : ""}</div>
            <div class="bar"><span style="width:${Math.round((m[key] / max) * 100)}%"></span></div>
          </div>
        </div>
        <span class="pts">${m[key]} pts</span>
      </li>`
      )
      .join("");
  }

  function renderGroups() {
    const grid = document.getElementById("groups-grid");
    grid.innerHTML = Object.values(groups)
      .map(
        (g) => `
      <button type="button" class="group-card ${g.id === state.groupId ? "active" : ""}" data-open-group="${g.id}">
        <h3>${escapeHtml(g.name)}</h3>
        <p>${g.members} members · invite-only</p>
        <span class="tag">${g.tag}</span>
      </button>`
      )
      .join("");

    grid.querySelectorAll("[data-open-group]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.groupId = btn.dataset.openGroup;
        showView("dashboard");
        document.querySelectorAll(".nav-link").forEach((l) => {
          l.classList.toggle("active", l.dataset.view === "dashboard");
        });
        toast(`Switched to ${groups[state.groupId].name}`);
      });
    });
  }

  function renderCalendar() {
    const grid = document.getElementById("calendar-grid");
    const title = document.getElementById("cal-title");
    const monthName = new Date(state.calYear, state.calMonth, 1).toLocaleString("en-US", {
      month: "long",
      year: "numeric",
    });
    title.textContent = monthName;

    const first = new Date(state.calYear, state.calMonth, 1);
    const startDow = first.getDay();
    const daysInMonth = new Date(state.calYear, state.calMonth + 1, 0).getDate();
    const today = new Date(2026, 9, 11); // prototype "today"

    const dows = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    let html = dows.map((d) => `<div class="cal-dow">${d}</div>`).join("");

    const prevDays = new Date(state.calYear, state.calMonth, 0).getDate();
    for (let i = 0; i < startDow; i++) {
      const day = prevDays - startDow + i + 1;
      html += `<div class="cal-day muted"><span class="num">${day}</span></div>`;
    }

    const groupChores = chores.filter((c) => c.group === state.groupId);

    for (let day = 1; day <= daysInMonth; day++) {
      const iso = `${state.calYear}-${String(state.calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const isToday =
        today.getFullYear() === state.calYear &&
        today.getMonth() === state.calMonth &&
        today.getDate() === day;
      const events = groupChores.filter((c) => c.due === iso);
      html += `<div class="cal-day ${isToday ? "today" : ""}">
        <span class="num">${day}</span>
        ${events
          .slice(0, 2)
          .map((e) => `<span class="cal-event ${e.status}" title="${escapeHtml(e.title)}">${escapeHtml(e.title)}</span>`)
          .join("")}
        ${events.length > 2 ? `<span class="cal-event available">+${events.length - 2}</span>` : ""}
      </div>`;
    }

    const cellsUsed = startDow + daysInMonth;
    const remainder = (7 - (cellsUsed % 7)) % 7;
    for (let i = 1; i <= remainder; i++) {
      html += `<div class="cal-day muted"><span class="num">${i}</span></div>`;
    }

    grid.innerHTML = html;
  }

  function promptAddChore() {
    openModal({
      title: "Add chore",
      confirmLabel: "Create",
      bodyHtml: `
        <label>Title<input id="m-title" type="text" placeholder="e.g. Mop kitchen" /></label>
        <label>Description<input id="m-desc" type="text" placeholder="Optional details" /></label>
        <label>Points (max 20)<input id="m-points" type="number" min="1" max="20" value="10" /></label>
        <label>Due date<input id="m-due" type="date" value="2026-10-18" /></label>
        <p class="hint">Point caps help prevent abuse of high-value chores.</p>
      `,
      onConfirm: () => {
        const title = document.getElementById("m-title").value.trim();
        const desc = document.getElementById("m-desc").value.trim() || "No description";
        let points = Number(document.getElementById("m-points").value) || 10;
        points = Math.min(20, Math.max(1, points));
        const due = document.getElementById("m-due").value || "2026-10-18";
        if (!title) {
          toast("Title is required");
          return;
        }
        chores.unshift({
          id: Date.now(),
          title,
          desc,
          points,
          due,
          assignee: null,
          status: "available",
          group: state.groupId,
        });
        closeModal();
        showView("dashboard");
        toast(`Created “${title}”`);
      },
    });
  }

  function promptRemoveChore() {
    const options = chores
      .filter((c) => c.group === state.groupId)
      .map((c) => `<option value="${c.id}">${escapeHtml(c.title)}</option>`)
      .join("");
    openModal({
      title: "Remove chore",
      confirmLabel: "Remove",
      bodyHtml: `<label>Select chore<select id="m-remove">${options}</select></label>`,
      onConfirm: () => {
        const id = Number(document.getElementById("m-remove").value);
        const chore = chores.find((c) => c.id === id);
        chores = chores.filter((c) => c.id !== id);
        closeModal();
        renderAll();
        toast(chore ? `Removed “${chore.title}”` : "Removed");
      },
    });
  }

  function promptUpdateReward() {
    openModal({
      title: "Update rewards",
      confirmLabel: "Add reward",
      bodyHtml: `
        <label>Reward name<input id="m-r-title" type="text" placeholder="e.g. Free coffee run" /></label>
        <label>Point cost<input id="m-r-cost" type="number" min="5" max="100" value="30" /></label>
        <label>Type
          <select id="m-r-type">
            <option value="group">Group reward</option>
            <option value="personal">Personal reward</option>
          </select>
        </label>
      `,
      onConfirm: () => {
        const title = document.getElementById("m-r-title").value.trim();
        const cost = Number(document.getElementById("m-r-cost").value) || 30;
        const group = document.getElementById("m-r-type").value === "group";
        if (!title) {
          toast("Name is required");
          return;
        }
        rewards.push({ id: Date.now(), title, cost, group });
        closeModal();
        renderRewards();
        toast(`Reward “${title}” added`);
      },
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderAll() {
    updateGroupInfo();
    renderChores();
    renderRewards();
    renderPointsMini();
    renderLeaderboard();
    renderGroups();
    renderCalendar();
  }
})();
