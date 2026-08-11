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

  const STATUS_LABEL = { pending_pharmacy: "Pending at Pharmacy", dispensed: "Dispensed" };

  async function guardSession() {
    const res = await fetch("/api/session", { credentials: "same-origin" });
    const data = await res.json();
    if (!data.user || data.user.role !== "patient") {
      window.location.href = "../index.html";
      return null;
    }
    document.getElementById("portalUser").textContent = data.user.userId;
    return data.user;
  }

  function wireLogout() {
    document.getElementById("logoutBtn").addEventListener("click", async () => {
      await fetch("/api/logout", { method: "POST", credentials: "same-origin" });
      window.location.href = "../index.html";
    });
  }

  async function loadPrescriptions() {
    const res = await fetch("/api/patients/me/prescriptions", { credentials: "same-origin" });
    const data = await res.json();
    const tbody = document.getElementById("prescriptionsTableBody");
    const emptyState = document.getElementById("prescriptionsEmptyState");

    if (!data.success || data.prescriptions.length === 0) {
      tbody.innerHTML = "";
      emptyState.hidden = false;
      return;
    }
    emptyState.hidden = true;

    tbody.innerHTML = data.prescriptions
      .map((p) => {
        const isDispensed = p.status === "dispensed";
        const statusLabel = STATUS_LABEL[p.status] || p.status;
        return `<tr>
          <td>${escapeHtml(p.medicine_name)}</td>
          <td>${escapeHtml(p.dosage)}</td>
          <td>${escapeHtml(p.duration)}</td>
          <td>${escapeHtml(p.food_instruction || "—")}</td>
          <td>${escapeHtml(p.urgency === "urgent" ? "Urgent" : "Routine")}</td>
          <td><span class="queue-status ${isDispensed ? "completed" : "waiting"}">${escapeHtml(statusLabel)}</span></td>
          <td>${escapeHtml(new Date(p.created_at).toLocaleString())}</td>
        </tr>`;
      })
      .join("");
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const user = await guardSession();
    if (!user) return;
    wireLogout();
    loadPrescriptions();
    if (window.MEDISYS_RT) {
      ["pharmacy_orders", "pharmacy_invoices"].forEach((resource) => MEDISYS_RT.on(resource, loadPrescriptions));
    }
  });
})();
