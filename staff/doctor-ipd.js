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

  let currentAdmissionId = null;

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

  async function loadAdmissions() {
    const res = await fetch("/api/ipd/admissions?status=admitted", { credentials: "same-origin" });
    const data = await res.json();
    const select = document.getElementById("admissionSelect");
    if (!data.success || data.admissions.length === 0) {
      select.innerHTML = `<option value="">No admitted patients</option>`;
      return;
    }
    select.innerHTML =
      `<option value="">Select a patient</option>` +
      data.admissions
        .map((a) => `<option value="${a.id}">${escapeHtml(a.patient_name || a.patient_uhid)} (${escapeHtml(a.ward_name || "")} ${escapeHtml(a.bed_number || "")})</option>`)
        .join("");
  }

  async function loadChart(admissionId) {
    const res = await fetch(`/api/ipd/admissions/${admissionId}`, { credentials: "same-origin" });
    const data = await res.json();
    if (!data.success) return;

    currentAdmissionId = admissionId;
    document.getElementById("workspace").hidden = false;

    document.getElementById("vitalsFeed").innerHTML =
      data.vitals
        .map(
          (v) => `<div class="chart-feed-item">
            BP ${escapeHtml(v.bp || "—")}, Temp ${escapeHtml(v.temperature || "—")}, Weight ${escapeHtml(v.weight || "—")}, SpO2 ${escapeHtml(v.spo2 || "—")}
            <div class="chart-feed-meta">${escapeHtml(new Date(v.recorded_at).toLocaleString())}</div>
          </div>`
        )
        .join("") || `<p class="wizard-hint">No vitals logged yet.</p>`;

    document.getElementById("notesFeed").innerHTML =
      data.notes
        .map(
          (n) => `<div class="chart-feed-item">
            <span class="note-type-badge ${escapeHtml(n.note_type)}">${escapeHtml(n.note_type.replace("_", " "))}</span>${escapeHtml(n.message)}
            <div class="chart-feed-meta">by ${escapeHtml(n.flagged_by)} &middot; ${escapeHtml(new Date(n.created_at).toLocaleString())}</div>
          </div>`
        )
        .join("") || `<p class="wizard-hint">No notes yet.</p>`;

    document.getElementById("ordersFeed").innerHTML =
      data.orders
        .map(
          (o) => `<div class="chart-feed-item">
            <strong>${escapeHtml(o.order_type)}</strong>: ${escapeHtml(o.description)}
            <div class="chart-feed-meta">${escapeHtml(new Date(o.created_at).toLocaleString())}</div>
          </div>`
        )
        .join("") || `<p class="wizard-hint">No orders issued yet.</p>`;
  }

  function wireActions() {
    document.getElementById("admissionSelect").addEventListener("change", (e) => {
      if (e.target.value) loadChart(e.target.value);
      else document.getElementById("workspace").hidden = true;
    });

    document.getElementById("postRoundNoteBtn").addEventListener("click", async () => {
      const errorEl = document.getElementById("ipdError");
      errorEl.textContent = "";
      const message = document.getElementById("roundNote").value.trim();
      if (!message || !currentAdmissionId) {
        errorEl.textContent = "Note message is required.";
        return;
      }
      const res = await fetch(`/api/ipd/admissions/${currentAdmissionId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ noteType: "doctor_round", message }),
      });
      const data = await res.json();
      if (!data.success) {
        errorEl.textContent = data.message || "Could not post note.";
        return;
      }
      document.getElementById("roundNote").value = "";
      loadChart(currentAdmissionId);
    });

    document.getElementById("issueOrderBtn").addEventListener("click", async () => {
      const errorEl = document.getElementById("ipdError");
      errorEl.textContent = "";
      const description = document.getElementById("orderDescription").value.trim();
      if (!description || !currentAdmissionId) {
        errorEl.textContent = "Order description is required.";
        return;
      }
      const res = await fetch(`/api/ipd/admissions/${currentAdmissionId}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          orderType: document.getElementById("orderType").value,
          description,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        errorEl.textContent = data.message || "Could not issue order.";
        return;
      }
      document.getElementById("orderDescription").value = "";
      loadChart(currentAdmissionId);
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const user = await guardSession();
    if (!user) return;
    wireLogout();
    wireActions();
    loadAdmissions();
  });
})();
