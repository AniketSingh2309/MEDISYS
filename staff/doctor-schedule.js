(function () {
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function formatDate(dateStr) {
    // avail_date comes back as a full ISO datetime from mysql2; keep only the date part.
    const d = new Date(dateStr);
    return `${DAY_NAMES[d.getDay()]}, ${d.toLocaleDateString()}`;
  }

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
          <td>${formatDate(s.avail_date)}</td>
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

  function wireRepeatToggle() {
    document.getElementById("repeatToggle").addEventListener("change", (e) => {
      document.getElementById("repeatOptions").hidden = !e.target.checked;
    });
  }

  function wireAddBlock() {
    document.getElementById("addBlockBtn").addEventListener("click", async () => {
      const errorEl = document.getElementById("scheduleFormError");
      errorEl.textContent = "";

      const date = document.getElementById("availDate").value;
      if (!date) {
        errorEl.textContent = "Pick a date.";
        return;
      }

      const repeat = document.getElementById("repeatToggle").checked;
      const endDate = repeat ? document.getElementById("repeatEndDate").value : undefined;
      if (repeat && !endDate) {
        errorEl.textContent = "Pick an end date for the range, or turn off the repeat option.";
        return;
      }
      const weekdays = repeat
        ? Array.from(document.querySelectorAll("#weekdayChecks input:checked")).map((el) => Number(el.value))
        : undefined;
      if (repeat && weekdays.length === 0) {
        errorEl.textContent = "Select at least one day of the week to repeat on.";
        return;
      }

      const btn = document.getElementById("addBlockBtn");
      btn.disabled = true;
      try {
        const res = await fetch("/api/doctor/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            date,
            endDate,
            weekdays,
            startTime: document.getElementById("startTime").value,
            endTime: document.getElementById("endTime").value,
            slotMinutes: Number(document.getElementById("slotMinutes").value) || 15,
          }),
        });
        const data = await res.json();
        if (!data.success) {
          errorEl.textContent = data.message || "Could not add availability.";
          return;
        }
        if (window.showToast) {
          const msg =
            data.datesRequested > 1
              ? `Added availability for ${data.datesCreated} of ${data.datesRequested} date(s) (duplicates skipped).`
              : "Availability added.";
          showToast(msg, "success");
        }
        loadSchedule();
      } finally {
        btn.disabled = false;
      }
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const user = await guardSession();
    if (!user) return;
    wireLogout();
    wireAddBlock();
    wireRepeatToggle();
    const todayStr = new Date().toISOString().slice(0, 10);
    document.getElementById("availDate").min = todayStr;
    document.getElementById("availDate").value = todayStr;
    document.getElementById("repeatEndDate").min = todayStr;
    loadSchedule();

    if (window.MEDISYS_RT) {
      MEDISYS_RT.on("consultations", loadSchedule);
    }
  });
})();
