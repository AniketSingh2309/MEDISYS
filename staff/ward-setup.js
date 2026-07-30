(function () {
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c]));
  }

  async function guardSession() {
    const res = await fetch("/api/session", { credentials: "same-origin" });
    const data = await res.json();
    if (!data.user || !data.user.hospitalId || data.user.role === "patient") {
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

  async function loadWards() {
    const res = await fetch("/api/wards", { credentials: "same-origin" });
    const data = await res.json();
    const list = document.getElementById("wardsList");
    const emptyState = document.getElementById("wardsEmptyState");

    if (!data.success || data.wards.length === 0) {
      list.innerHTML = "";
      emptyState.hidden = false;
      return;
    }
    emptyState.hidden = true;

    list.innerHTML = data.wards
      .map(
        (w) => `
        <div class="ward-card">
          <div class="ward-card-title">${escapeHtml(w.name)}</div>
          <div class="bed-chip-grid">
            ${w.beds
              .map((b) => `<span class="bed-chip ${escapeHtml(b.status)}">${escapeHtml(b.bed_number)}</span>`)
              .join("") || `<span class="wizard-hint">No beds yet.</span>`}
          </div>
          <div class="wizard-suggest-row" style="margin-top: 14px;">
            <input type="text" placeholder="Bed number (e.g. B-01)" data-ward-id="${w.id}" class="add-bed-input" />
            <button type="button" class="wizard-suggest-btn add-bed-btn" data-ward-id="${w.id}">Add Bed</button>
          </div>
        </div>`
      )
      .join("");

    list.querySelectorAll(".add-bed-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const input = list.querySelector(`.add-bed-input[data-ward-id="${btn.dataset.wardId}"]`);
        const bedNumber = input.value.trim();
        if (!bedNumber) return;

        const res = await fetch(`/api/wards/${btn.dataset.wardId}/beds`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ bedNumber }),
        });
        const data = await res.json();
        if (data.success) loadWards();
      });
    });
  }

  function wireAddWard() {
    document.getElementById("addWardBtn").addEventListener("click", async () => {
      const input = document.getElementById("wardName");
      const errorEl = document.getElementById("wardFormError");
      errorEl.textContent = "";
      const name = input.value.trim();
      if (!name) {
        errorEl.textContent = "Ward name is required.";
        return;
      }

      const res = await fetch("/api/wards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!data.success) {
        errorEl.textContent = data.message || "Could not add ward.";
        return;
      }
      input.value = "";
      loadWards();
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const user = await guardSession();
    if (!user) return;
    wireLogout();
    wireAddWard();
    loadWards();
  });
})();
