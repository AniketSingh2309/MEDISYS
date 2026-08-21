(function () {
  function t(key, fallback) {
    if (window.i18n && typeof window.i18n.t === 'function') {
      const res = window.i18n.t(key);
      if (res && res !== key) return res;
    }
    return fallback || key;
  }

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

  function actionCard(href, iconSvg, label, hint) {
    return `<a href="${href}" class="staff-action-card">
      <span class="staff-action-icon">${iconSvg}</span>
      <span class="staff-action-label">${label}</span>
      <span class="staff-action-hint">${hint}</span>
    </a>`;
  }

  const ICONS = {
    records: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/><path d="M8 13h2l1.5-3 2 6 1.5-3H16"/></svg>`,
    calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>`,
    prescription: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><g transform="rotate(45 12 12)"><rect x="4" y="9" width="16" height="6" rx="3"/><line x1="12" y1="9" x2="12" y2="15"/></g></svg>`,
    bill: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h9l3 3v17H6V2z"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>`,
  };

  async function loadProfile() {
    const res = await fetch("/api/me", { credentials: "same-origin" });
    const data = await res.json();
    if (!data.success) return;

    const { fullName, hospitalName } = data.profile;
    document.getElementById("welcomeHeading").textContent = `${t("dashboard.welcome", "Welcome")}, ${fullName}`;
    document.getElementById("patientSubtitle").textContent = `${t("dashboard.patient_at", "Patient at")} ${hospitalName}`;

    document.getElementById("patientActionCards").innerHTML =
      actionCard("records.html", ICONS.records, t("records.title", "Your Medical Records"), t("dashboard.card_patient_records_hint", "Consultations, admissions, vitals, and lab/radiology results")) +
      actionCard("appointments.html", ICONS.calendar, t("appointments.title", "Appointments"), t("dashboard.card_patient_appointments_hint", "Every OPD visit you've booked, past and upcoming")) +
      actionCard("prescriptions.html", ICONS.prescription, t("prescriptions.title", "Prescriptions"), t("dashboard.card_patient_prescriptions_hint", "Medicines your doctor has prescribed and their dispense status")) +
      actionCard("bills.html", ICONS.bill, t("bills.title", "Bills & Invoices"), t("dashboard.card_patient_bills_hint", "Outstanding charges, past bills, and pharmacy invoices"));
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const user = await guardSession();
    if (!user) return;
    wireLogout();
    loadProfile();

    window.addEventListener("i18n:languageChanged", () => {
      loadProfile();
    });
  });
})();
