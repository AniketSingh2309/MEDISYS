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

  const STATUS_LABEL = { waiting: "Waiting", "in-consultation": "In Consultation", completed: "Completed" };

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

  function t(key, fallback) {
    if (window.i18n && typeof window.i18n.t === 'function') {
      const res = window.i18n.t(key);
      if (res && res !== key) return res;
    }
    return fallback || key;
  }

  async function loadAppointments() {
    const res = await fetch("/api/patients/me/appointments", { credentials: "same-origin" });
    const data = await res.json();
    const tbody = document.getElementById("appointmentsTableBody");
    const emptyState = document.getElementById("appointmentsEmptyState");

    if (!data.success || data.appointments.length === 0) {
      tbody.innerHTML = "";
      emptyState.hidden = false;
      return;
    }
    emptyState.hidden = true;

    tbody.innerHTML = data.appointments
      .map((a) => {
        const rawStatus = a.status === "completed" ? "completed" : a.status === "in-consultation" ? "in-consultation" : "waiting";
        const statusKey = a.status === "completed" ? "opd.completed" : a.status === "in-consultation" ? "opd.in_consultation" : "opd.waiting";
        const statusLabel = t(statusKey, STATUS_LABEL[a.status] || a.status);
        const statusClass = rawStatus;
        return `<tr>
          <td>${escapeHtml(new Date(a.visit_date).toLocaleDateString())}</td>
          <td>${escapeHtml(a.slot_time || t('appointments.walk_in', 'Walk-in'))}</td>
          <td>${escapeHtml(a.doctor_name || a.doctor_user_id)}</td>
          <td>${escapeHtml(a.source === "appointment" ? t('appointments.appointment', 'Appointment') : t('appointments.walk_in', 'Walk-in'))}</td>
          <td><span class="queue-status ${statusClass}">${escapeHtml(statusLabel)}</span></td>
        </tr>`;
      })
      .join("");
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const user = await guardSession();
    if (!user) return;
    wireLogout();
    loadAppointments();
    if (window.MEDISYS_RT) {
      ["opd_queue", "consultations"].forEach((resource) => MEDISYS_RT.on(resource, loadAppointments));
    }
    window.addEventListener("i18n:languageChanged", () => {
      loadAppointments();
      if (window.i18n) window.i18n.applyTranslations();
    });
  });
})();
