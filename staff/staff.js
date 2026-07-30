(function () {
  const MODULE_ICONS = {
    opd: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/><path d="M9 13l2 2 4-4"/></svg>`,
    radiology: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 9h18M9 4v14"/><circle cx="15" cy="12" r="2.5"/></svg>`,
    billing: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h9l3 3v17H6V2z"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>`,
    pharmacy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><g transform="rotate(45 12 12)"><rect x="4" y="9" width="16" height="6" rx="3"/><line x1="12" y1="9" x2="12" y2="15"/></g></svg>`,
    laboratory: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2h6M10 2v6l-5.5 9.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-3.5L14 8V2"/><path d="M7.5 15h9"/></svg>`,
    bloodbank: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c-4 5-6 8.5-6 11a6 6 0 0 0 12 0c0-2.5-2-6-6-11z"/></svg>`,
  };

  const MODULE_LABELS = {
    opd: "OPD",
    radiology: "Radiology",
    billing: "Billing & Insurance",
    pharmacy: "Pharmacy",
    laboratory: "Laboratory",
    bloodbank: "Blood Bank",
  };

  const ROLE_MODULE = {
    pharmacist: "pharmacy",
    pathology_staff: "pathology",
    billing_staff: "billing",
    blood_bank_staff: "bloodbank",
  };

  async function guardSession() {
    const res = await fetch("/api/session", { credentials: "same-origin" });
    const data = await res.json();

    if (!data.user || !data.user.hospitalId || data.user.role === "hospital_admin" || data.user.role === "patient") {
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

  async function loadProfile() {
    const res = await fetch("/api/me", { credentials: "same-origin" });
    const data = await res.json();
    if (!data.success) return;

    const { fullName, roleLabel, hospitalName, role } = data.profile;
    document.getElementById("welcomeHeading").textContent = `Welcome, ${fullName}`;
    document.getElementById("staffSubtitle").textContent = `${roleLabel} at ${hospitalName}`;

    const actionCards = document.getElementById("staffActionCards");
    const CARD_ICONS = {
      registration: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/><path d="M9 13l2 2 4-4"/></svg>`,
      calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>`,
      bed: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M3 18h18M3 18v2M21 18v2M6 10V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4"/></svg>`,
      vitals: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l2-7 4 14 2-7h6"/></svg>`,
      ward: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V8l9-5 9 5v13M9 21v-6h6v6"/></svg>`,
      clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>`,
      queue: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="3"/><circle cx="16" cy="9" r="2.6"/><path d="M2.5 20c0-3.3 2.6-5.6 5.5-5.6s5.5 2.3 5.5 5.6M14.5 14.9c2.4.2 4.5 2.3 4.5 5.1"/></svg>`,
      admission: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3v5a3 3 0 0 0 6 0V3"/><path d="M12 11v4a5 5 0 0 0 10 0v-2"/><circle cx="21" cy="10" r="1.6"/></svg>`,
    };

    function actionCard(href, iconKey, label, hint) {
      return `<a href="${href}" class="staff-action-card">
        <span class="staff-action-icon">${CARD_ICONS[iconKey]}</span>
        <span class="staff-action-label">${label}</span>
        <span class="staff-action-hint">${hint}</span>
      </a>`;
    }

    if (role === "receptionist") {
      actionCards.innerHTML =
        actionCard("registration.html", "registration", "Patient Registration", "Search existing patients or register a new one") +
        actionCard("opd.html", "calendar", "OPD Booking &amp; Queue", "Book an appointment, issue a walk-in token, view today's queue") +
        actionCard("ipd-admission.html", "admission", "Admission Request", "Start a direct IPD admission for a patient");
    } else if (role === "nurse") {
      actionCards.innerHTML =
        actionCard("vitals.html", "vitals", "OPD Vitals", "Log BP, temperature, weight, SpO2 before consultation") +
        actionCard("ward-setup.html", "ward", "Ward &amp; Bed Setup", "Add wards and beds for this hospital") +
        actionCard("bed-allocation.html", "bed", "Bed Allocation", "Allocate a bed to a pending admission request") +
        actionCard("nurse-ipd.html", "admission", "IPD Patients", "Log medication administered for admitted patients");
    } else if (role === "doctor") {
      actionCards.innerHTML =
        actionCard("doctor-schedule.html", "clock", "My Schedule", "Set your weekly available time slots") +
        actionCard("doctor-queue.html", "queue", "My Queue", "Call patients, view EMR history, record consultations") +
        actionCard("doctor-ipd.html", "admission", "IPD Rounds", "Round notes and orders for your admitted patients");
    }

    const moduleKey = ROLE_MODULE[role];
    const grid = document.getElementById("staffModuleGrid");
    grid.innerHTML = moduleKey
      ? `<div class="module-card readonly">
          <span class="module-card-icon">${MODULE_ICONS[moduleKey]}</span>
          <span class="module-card-label">${MODULE_LABELS[moduleKey]}</span>
          <span class="module-card-soon">Coming soon</span>
        </div>`
      : "";
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const user = await guardSession();
    if (!user) return;
    wireLogout();
    loadProfile();
  });
})();
