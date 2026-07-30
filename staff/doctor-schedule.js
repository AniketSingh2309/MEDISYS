(function () {
  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  async function guardSession() {
    const res = await fetch("/api/session", { credentials: "same-origin" });
    const data = await res.json();
    if (!data.user || data.user.role !== "doctor") {
      window.location.href = "../index.html";
      return null;
    }
    document.getElementById("portalUser").textContent = data.user.fullName || data.user.userId;
    return data.user;
  }

  function wireLogout() {
    document.getElementById("logoutBtn").addEventListener("click", async () => {
      await fetch("/api/logout", { method: "POST", credentials: "same-origin" });
      window.location.href = "../index.html";
    });
  }

  async function loadSchedule() {
    const res = await fetch("/api/doctor/schedule", { credentials: "same-origin" });
    const data = await res.json();
    const tbody = document.getElementById("scheduleTableBody");
    const emptyState = document.getElementById("scheduleEmptyState");
    const table = document.getElementById("scheduleTable");

    if (!data.success || data.schedule.length === 0) {
      tbody.innerHTML = "";
      table.hidden = true;
      emptyState.hidden = false;
      return;
    }
    table.hidden = false;
    emptyState.hidden = true;

    tbody.innerHTML = data.schedule
      .map(
        (s) => `<tr>
          <td>${DAY_NAMES[s.day_of_week]}</td>
          <td>${s.start_time}</td>
          <td>${s.end_time}</td>
          <td>${s.slot_minutes} min</td>
          <td><button type="button" class="icon-btn-delete delete-block-btn" data-id="${s.id}" aria-label="Remove">&times;</button></td>
        </tr>`
      )
      .join("");

    tbody.querySelectorAll(".delete-block-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await fetch(`/api/doctor/schedule/${btn.dataset.id}`, {
          method: "DELETE",
          credentials: "same-origin",
        });
        loadSchedule();
      });
    });
  }

  function wireAddBlock() {
    document.getElementById("addBlockBtn").addEventListener("click", async () => {
      const errorEl = document.getElementById("scheduleFormError");
      errorEl.textContent = "";

      const res = await fetch("/api/doctor/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          dayOfWeek: Number(document.getElementById("dayOfWeek").value),
          startTime: document.getElementById("startTime").value,
          endTime: document.getElementById("endTime").value,
          slotMinutes: Number(document.getElementById("slotMinutes").value) || 15,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        errorEl.textContent = data.message || "Could not add availability block.";
        return;
      }
      loadSchedule();
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const user = await guardSession();
    if (!user) return;
    wireLogout();
    wireAddBlock();
    loadSchedule();
  });
})();
