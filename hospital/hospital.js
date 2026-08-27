(function () {
  const MODULE_ICONS = {
    opd: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/><path d="M9 13l2 2 4-4"/></svg>`,
    radiology: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 9h18M9 4v14"/><circle cx="15" cy="12" r="2.5"/></svg>`,
    billing: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h9l3 3v17H6V2z"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>`,
    pharmacy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><g transform="rotate(45 12 12)"><rect x="4" y="9" width="16" height="6" rx="3"/><line x1="12" y1="9" x2="12" y2="15"/></g></svg>`,
    pathology: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 20h6M12 20v-4"/><path d="M6 20a7 7 0 0 1 12-5"/><path d="M10 12l-2-2 3-3 5 5-1.5 1.5"/><circle cx="8.5" cy="8.5" r="1.5"/></svg>`,
    laboratory: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2h6M10 2v6l-5.5 9.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-3.5L14 8V2"/><path d="M7.5 15h9"/></svg>`,
  };

  const MODULE_LABELS = {
    opd: "module.opd",
    radiology: "module.radiology",
    billing: "module.billing",
    pharmacy: "module.pharmacy",
    pathology: "module.pathology",
    laboratory: "module.laboratory",
    blood_bank: "module.blood_bank",
    ipd: "module.ipd",
  };

  // These link to module-overview.html — a read-only oversight dashboard
  // (patients, doctors, statuses) built for the hospital admin, not the
  // staff operational tool (which has claim/dispense/verify actions meant
  // for the specific staff role, not the admin). See module-overview.js for
  // the per-module data mapping. Modules without an entry here (e.g. "ipd",
  // split across separate doctor/nurse pages with no single admin view yet,
  // and "blood_bank", which has no read API wired up for this page yet)
  // still fall back to the old readonly/coming-soon card.
  const MODULE_PAGES = {
    opd: "module-overview.html?module=opd",
    radiology: "module-overview.html?module=radiology",
    billing: "module-overview.html?module=billing",
    pharmacy: "module-overview.html?module=pharmacy",
    pathology: "module-overview.html?module=pathology",
    laboratory: "module-overview.html?module=laboratory",
  };

  function getModuleLabel(m) {
    const key = MODULE_LABELS[m] || `module.${m}`;
    const fallbacks = {
      opd: "OPD",
      radiology: "Radiology",
      billing: "Billing & Insurance",
      pharmacy: "Pharmacy",
      pathology: "Pathology",
      laboratory: "Laboratory",
      blood_bank: "Blood Bank",
      ipd: "IPD",
    };
    if (window.i18n && typeof window.i18n.t === "function") {
      const res = window.i18n.t(key);
      if (res && res !== key) return res;
    }
    return fallbacks[m] || m;
  }

  const ROLE_ICONS = {
    doctor: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3v5a3 3 0 0 0 6 0V3"/><path d="M9 3H7M15 3h2"/><path d="M12 11v4a5 5 0 0 0 10 0v-2"/><circle cx="21" cy="10" r="1.6"/></svg>`,
    nurse: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="3.2"/><path d="M5.5 21c0-3.6 2.9-6.2 6.5-6.2S18.5 17.4 18.5 21"/><path d="M12 11.8v3.2M10.4 13.4h3.2"/></svg>`,
    pharmacist: MODULE_ICONS.pharmacy,
    pathology_staff: MODULE_ICONS.pathology,
    receptionist: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="13" width="18" height="7" rx="1.5"/><path d="M7 13V9a5 5 0 0 1 10 0v4"/><circle cx="9" cy="16.5" r="1"/><circle cx="15" cy="16.5" r="1"/></svg>`,
    billing_staff: MODULE_ICONS.billing,
    blood_bank_staff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c-4 5-6 8.5-6 11a6 6 0 0 0 12 0c0-2.5-2-6-6-11z"/></svg>`,
  };

  const ROLE_LABELS = {
    doctor: "Doctor",
    nurse: "Nurse",
    pharmacist: "Pharmacist",
    pathology_staff: "Pathologist",
    receptionist: "OPD",
    billing_staff: "Billing Staff",
    blood_bank_staff: "Blood Bank Staff",
  };

  const ROLE_KEYS = {
    doctor: "role.doctor",
    nurse: "role.nurse",
    pharmacist: "role.pharmacist",
    pathology_staff: "role.pathologist",
    receptionist: "role.opd",
    billing_staff: "role.billing_staff",
    blood_bank_staff: "role.blood_bank_staff",
  };

  function getRoleLabel(role) {
    const key = ROLE_KEYS[role] || `role.${role}`;
    if (window.i18n && typeof window.i18n.t === "function") {
      const res = window.i18n.t(key);
      if (res && res !== key) return res;
    }
    return ROLE_LABELS[role] || role;
  }

  function getRoleLabelPlural(role) {
    const key = `role.${role}_plural`;
    if (window.i18n && typeof window.i18n.t === "function") {
      const res = window.i18n.t(key);
      if (res && res !== key) return res;
    }
    return getRoleLabel(role) + "s";
  }

  const ROLE_FIELDS = {
    doctor: [
      { key: "specialization", label: "Specialization", type: "text" },
      { key: "qualification", label: "Qualification", type: "text" },
      { key: "licenseNumber", label: "Medical License No.", type: "text" },
      { key: "consultationFee", label: "Telemedicine Consultation Fee (₹)", type: "text" },
    ],
    nurse: [
      { key: "qualification", label: "Qualification", type: "text" },
      { key: "shift", label: "Shift", type: "select", options: ["Morning", "Evening", "Night"] },
      { key: "ward", label: "Ward", type: "text" },
    ],
    pharmacist: [
      { key: "licenseNumber", label: "License No.", type: "text" },
      { key: "qualification", label: "Qualification", type: "text" },
    ],
    pathology_staff: [
      {
        key: "designation",
        label: "Designation",
        type: "select",
        options: ["Pathologist", "Lab Assistant", "Radiologist"],
      },
      { key: "certification", label: "Certification", type: "text" },
      { key: "licenseNumber", label: "License No.", type: "text" },
    ],
    receptionist: [{ key: "shift", label: "Shift", type: "select", options: ["Morning", "Evening", "Night"] }],
    billing_staff: [
      { key: "department", label: "Department", type: "select", options: ["Billing", "Insurance", "Both"] },
    ],
    blood_bank_staff: [
      { key: "certification", label: "Certification", type: "text" },
      { key: "licenseNumber", label: "License No.", type: "text" },
    ],
  };

  const ROLE_DETAIL_SUMMARY = {
    doctor: (d) => d.specialization,
    nurse: (d) => [d.ward, d.shift].filter(Boolean).join(" · "),
    pharmacist: (d) => d.qualification,
    pathology_staff: (d) => d.designation,
    receptionist: (d) => d.shift,
    billing_staff: (d) => d.department,
    blood_bank_staff: (d) => d.certification,
  };

  const ROLE_LABELS_PLURAL = {
    receptionist: "OPD Staff",
    pathology_staff: "Pathology Staff",
  };

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c]));
  }

  function t(key, fallback, params) {
    if (window.i18n && typeof window.i18n.t === "function") {
      const res = window.i18n.t(key, params);
      if (res && res !== key) return res;
    }
    const text = fallback || key;
    if (!params) return text;
    return String(text).replace(/\{(\w+)\}/g, (m, k) => (params[k] !== undefined ? params[k] : m));
  }

  async function guardSession() {
    const res = await fetch("/api/session", { credentials: "same-origin" });
    const data = await res.json();

    if (!data.user || data.user.role !== "hospital_admin") {
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

  async function loadHospital() {
    const grid = document.getElementById("hospitalModuleGrid");
    if (!grid) return;

    const res = await fetch("/api/hospital/me", { credentials: "same-origin" });
    const data = await res.json();
    if (!data.success) return;

    const hospital = data.hospital;
    document.getElementById("hospitalName").textContent = hospital.name;

    const modules = (() => {
      try {
        return typeof hospital.modules === "string" ? JSON.parse(hospital.modules) : hospital.modules || [];
      } catch {
        return [];
      }
    })();

    function tOr(key, fallback) {
      if (window.i18n && typeof window.i18n.t === "function") {
        const res = window.i18n.t(key);
        if (res && res !== key) return res;
      }
      return fallback;
    }
    const openLabel = tOr("hospital_page.open_module", "Open");
    const soonLabel = tOr("hospital_page.coming_soon", "Coming soon");

    grid.innerHTML = modules
      .map((m) => {
        const href = MODULE_PAGES[m];
        const icon = `<span class="module-card-icon">${MODULE_ICONS[m] || ""}</span>`;
        const label = `<span class="module-card-label">${getModuleLabel(m)}</span>`;
        if (href) {
          return `<a class="module-card" href="${href}">${icon}${label}<span class="module-card-open">${openLabel}</span></a>`;
        }
        return `<div class="module-card readonly">${icon}${label}<span class="module-card-soon">${soonLabel}</span></div>`;
      })
      .join("");
  }

  async function loadOutbreakAlerts() {
    const section = document.getElementById("outbreakAlertsSection");
    const list = document.getElementById("outbreakAlertsList");
    if (!section || !list) return;

    const res = await fetch("/api/hospital/disease-alerts", { credentials: "same-origin" });
    const data = await res.json();
    if (!data.success || data.alerts.length === 0) {
      section.hidden = true;
      return;
    }

    section.hidden = false;
    list.innerHTML = data.alerts
      .map((a) => {
        const when = new Date(a.created_at).toLocaleString();
        return `
        <div class="outbreak-alert-card">
          <span class="outbreak-alert-icon">&#9888;</span>
          <div>
            <p class="outbreak-alert-title">${escapeHtml(a.diagnosis)} — ${t('hospital_page.possible_outbreak', 'possible outbreak')}</p>
            <p class="outbreak-alert-detail">${t('hospital_page.outbreak_detail', '{caseCount} cases recorded in the last {windowDays} days. SMS alert sent to {hospitalNotified} patient(s) at your hospital and {nearbyNotified} patient(s) in nearby areas.', { caseCount: a.case_count, windowDays: a.window_days, hospitalNotified: a.hospital_patients_notified, nearbyNotified: a.nearby_patients_notified })}</p>
            <p class="outbreak-alert-meta">${t('hospital_page.raised_at', 'Raised {when}', { when: escapeHtml(when) })}</p>
          </div>
        </div>`;
      })
      .join("");
  }

  async function loadStaffCount() {
    const hint = document.getElementById("staffCountHint");
    if (!hint) return;
    const res = await fetch("/api/hospital/staff", { credentials: "same-origin" });
    const data = await res.json();
    if (!data.success) return;
    const count = data.staff.length;
    if (count === 0) {
      hint.textContent = window.i18n ? window.i18n.t("hospital_page.staff_count_zero") : "No staff registered yet";
    } else if (count === 1) {
      hint.textContent = window.i18n ? window.i18n.t("hospital_page.staff_count_one", { count: 1 }) : "1 staff member";
    } else {
      hint.textContent = window.i18n ? window.i18n.t("hospital_page.staff_count_other", { count }) : `${count} staff members`;
    }
  }

  function initRolePicker() {
    const grid = document.getElementById("roleGrid");
    if (!grid) return;

    grid.innerHTML = Object.keys(ROLE_LABELS)
      .map(
        (role) => `
        <label class="module-card" data-role="${role}">
          <input type="radio" name="roleChoice" value="${role}" />
          <span class="module-card-icon">${ROLE_ICONS[role]}</span>
          <span class="module-card-label">${getRoleLabel(role)}</span>
        </label>`
      )
      .join("");

    const form = document.getElementById("staffForm");
    const formTitle = document.getElementById("staffFormTitle");
    const fieldsContainer = document.getElementById("roleFieldsContainer");

    grid.querySelectorAll(".module-card").forEach((card) => {
      const input = card.querySelector("input");
      input.addEventListener("change", async () => {
        grid.querySelectorAll(".module-card").forEach((c) => c.classList.toggle("selected", c === card));
        const role = card.dataset.role;
        formTitle.textContent = `${getRoleLabel(role)} Details`;
        fieldsContainer.innerHTML = (ROLE_FIELDS[role] || [])
          .map((field) => {
            if (field.type === "select") {
              const options = field.options
                .map((o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`)
                .join("");
              return `<label for="field_${field.key}">${escapeHtml(field.label)}</label>
                <select id="field_${field.key}" data-field="${field.key}">${options}</select>`;
            }
            return `<label for="field_${field.key}">${escapeHtml(field.label)}</label>
              <input type="text" id="field_${field.key}" data-field="${field.key}" />`;
          })
          .join("");

        if (role === "doctor") {
          fieldsContainer.innerHTML += `<label for="doctorDepartmentSelect">Department</label>
            <select id="doctorDepartmentSelect"><option value="">Loading departments...</option></select>`;
          const res = await fetch("/api/departments", { credentials: "same-origin" });
          const data = await res.json();
          const select = document.getElementById("doctorDepartmentSelect");
          select.innerHTML = data.success && data.departments.length
            ? `<option value="">Select a department</option>` +
              data.departments.map((d) => `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join("")
            : `<option value="">No departments set up yet</option>`;
        }

        form.hidden = false;
        form.dataset.role = role;
      });
    });
  }

  const DESIGNATION_PREFIXES = {
    Pathologist: "PA",
    "Lab Assistant": "LA",
    Radiologist: "RA",
  };

  function wireSuggestButtons() {
    document.getElementById("suggestStaffUserIdBtn").addEventListener("click", () => {
      const form = document.getElementById("staffForm");
      const role = form.dataset.role || "staff";
      const prefixMap = {
        doctor: "DR",
        nurse: "NR",
        pharmacist: "PH",
        pathology_staff: "PT",
        receptionist: "OPD",
        billing_staff: "BS",
        blood_bank_staff: "BB",
      };
      let prefix = prefixMap[role] || "ST";
      if (role === "pathology_staff") {
        const designationEl = document.getElementById("field_designation");
        prefix = DESIGNATION_PREFIXES[designationEl?.value] || prefix;
      }
      const digits = Math.floor(1000 + Math.random() * 90000);
      document.getElementById("staffUserIdCustom").value = `${prefix}-${digits}`;
    });

    document.getElementById("suggestStaffPasswordBtn").addEventListener("click", () => {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
      let pw = "";
      for (let i = 0; i < 10; i++) pw += chars[Math.floor(Math.random() * chars.length)];
      document.getElementById("staffPasswordCustom").value = pw;
    });
  }

  function initAddStaff() {
    const form = document.getElementById("staffForm");
    if (!form) return;

    initRolePicker();
    wireSuggestButtons();

    const errorEl = document.getElementById("staffFormError");
    const submitBtn = document.getElementById("submitStaffBtn");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      errorEl.textContent = "";

      const role = form.dataset.role;
      const details = {};
      form.querySelectorAll("[data-field]").forEach((el) => {
        details[el.dataset.field] = el.value;
      });

      submitBtn.disabled = true;
      try {
        const res = await fetch("/api/hospital/staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            role,
            fullName: document.getElementById("fullName").value.trim(),
            email: document.getElementById("email").value.trim(),
            phone: document.getElementById("phone").value.trim(),
            details,
            departmentId: document.getElementById("doctorDepartmentSelect")?.value || undefined,
            userId: document.getElementById("staffUserIdCustom").value.trim(),
            password: document.getElementById("staffPasswordCustom").value.trim(),
          }),
        });
        const data = await res.json();

        if (!data.success) {
          errorEl.textContent = data.message || t('hospital_page.could_not_add_staff', 'Could not add staff member. Please try again.');
          return;
        }

        form.hidden = true;
        document.getElementById("roleGrid").hidden = true;
        document.getElementById("staffUserIdOutput").value = data.staff.userId;
        document.getElementById("staffPasswordOutput").value = data.staff.password;
        document.getElementById("staffResult").hidden = false;
      } catch (err) {
        errorEl.textContent = t('hospital_page.unable_to_reach_server_retry', 'Unable to reach the server. Please try again.');
      } finally {
        submitBtn.disabled = false;
      }
    });

    function wireCopyButton(buttonId, inputId) {
      document.getElementById(buttonId).addEventListener("click", () => {
        const input = document.getElementById(inputId);
        input.select();
        navigator.clipboard.writeText(input.value).catch(() => {});
      });
    }
    wireCopyButton("copyStaffUserIdBtn", "staffUserIdOutput");
    wireCopyButton("copyStaffPasswordBtn", "staffPasswordOutput");

    document.getElementById("addAnotherBtn").addEventListener("click", () => {
      form.reset();
      document.querySelectorAll(".module-card.selected").forEach((c) => c.classList.remove("selected"));
      document.getElementById("roleFieldsContainer").innerHTML = "";
      document.getElementById("staffResult").hidden = true;
      document.getElementById("roleGrid").hidden = false;
      form.hidden = true;
    });
  }

  async function initStaffList() {
    const container = document.getElementById("staffGroups");
    if (!container) return;

    if (window.MEDISYS_RT && !container.dataset.rtWired) {
      container.dataset.rtWired = "true";
      MEDISYS_RT.on("staff", initStaffList);
    }

    const res = await fetch("/api/hospital/staff", { credentials: "same-origin" });
    const data = await res.json();

    if (!data.success || data.staff.length === 0) {
      document.getElementById("staffEmptyState").hidden = false;
      return;
    }

    const grouped = {};
    data.staff.forEach((s) => {
      grouped[s.role] = grouped[s.role] || [];
      grouped[s.role].push(s);
    });

    container.innerHTML = Object.keys(ROLE_LABELS)
      .filter((role) => grouped[role]?.length)
      .map((role) => {
        const entries = grouped[role];
        const cards = entries
          .map((s) => {
            const details = (() => {
              try {
                return typeof s.details === "string" ? JSON.parse(s.details) : s.details || {};
              } catch {
                return {};
              }
            })();
            const summaryFn = ROLE_DETAIL_SUMMARY[role];
            const summary = summaryFn ? summaryFn(details) : "";
            const added = new Date(s.created_at).toLocaleDateString();
            return `
              <div class="staff-entry-card">
                <div class="staff-entry-name">${escapeHtml(s.full_name)}</div>
                ${role === "doctor" && s.department_name ? `<div class="staff-entry-detail">${escapeHtml(s.department_name)}</div>` : ""}
                ${summary ? `<div class="staff-entry-detail">${escapeHtml(summary)}</div>` : ""}
                <div class="staff-entry-detail">${escapeHtml(s.email || "—")}${s.phone ? " · " + escapeHtml(s.phone) : ""}</div>
                <div class="staff-entry-detail">${window.i18n ? window.i18n.t("hospital_page.added_on") : "Added"} ${escapeHtml(added)}</div>
                <span class="staff-entry-userid">${escapeHtml(s.user_id)}</span>
                ${role === "doctor" ? `
                <div class="staff-fee-row">
                  <label for="fee_${escapeHtml(s.user_id)}">Telemedicine fee (₹)</label>
                  <input type="number" min="0" step="1" id="fee_${escapeHtml(s.user_id)}" class="staff-fee-input" value="${escapeHtml(details.consultationFee || "")}" placeholder="Not set" />
                  <button type="button" class="staff-fee-save-btn" data-user-id="${escapeHtml(s.user_id)}">Save</button>
                  <span class="staff-fee-status" data-status-for="${escapeHtml(s.user_id)}"></span>
                </div>` : ""}
              </div>`;
          })
          .join("");

        return `
          <div class="staff-group-section">
            <h2 class="staff-group-heading">${getRoleLabelPlural(role)} <span class="staff-group-count">${entries.length}</span></h2>
            <div class="staff-roster-grid">${cards}</div>
          </div>`;
      })
      .join("");

    container.querySelectorAll(".staff-fee-save-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const userId = btn.dataset.userId;
        const input = document.getElementById(`fee_${userId}`);
        const statusEl = container.querySelector(`[data-status-for="${userId}"]`);
        const fee = input.value.trim();
        if (!fee || Number(fee) <= 0) {
          statusEl.textContent = t('hospital_page.enter_fee_valid', 'Enter a fee > 0.');
          statusEl.className = "staff-fee-status error";
          return;
        }
        btn.disabled = true;
        try {
          const res = await fetch(`/api/hospital/staff/${encodeURIComponent(userId)}/fee`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ consultationFee: Number(fee) }),
          });
          const data = await res.json();
          statusEl.textContent = data.success ? t('common.saved', 'Saved.') : data.message || t('hospital_page.could_not_save', 'Could not save.');
          statusEl.className = "staff-fee-status" + (data.success ? "" : " error");
        } catch {
          statusEl.textContent = t('hospital_page.unable_to_reach_server', 'Unable to reach the server.');
          statusEl.className = "staff-fee-status error";
        } finally {
          btn.disabled = false;
        }
      });
    });
  }

  async function initDepartments() {
    const table = document.getElementById("departmentsTable");
    if (!table) return;

    async function loadDepartments() {
      const res = await fetch("/api/departments", { credentials: "same-origin" });
      const data = await res.json();
      const tbody = document.getElementById("departmentsTableBody");
      const emptyState = document.getElementById("departmentsEmptyState");

      if (!data.success || data.departments.length === 0) {
        tbody.innerHTML = "";
        emptyState.hidden = false;
        return;
      }
      emptyState.hidden = true;

      tbody.innerHTML = data.departments
        .map(
          (d) => `<tr>
            <td>${escapeHtml(d.name)}</td>
            <td><button type="button" class="icon-btn-delete delete-dept-btn" data-id="${d.id}" aria-label="Delete ${escapeHtml(d.name)}">&times;</button></td>
          </tr>`
        )
        .join("");

      tbody.querySelectorAll(".delete-dept-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          if (!confirm(t('hospital_page.confirm_remove_department', 'Remove this department? Doctors assigned to it will become unassigned.'))) return;
          await fetch(`/api/departments/${btn.dataset.id}`, { method: "DELETE", credentials: "same-origin" });
          loadDepartments();
        });
      });
    }

    document.getElementById("addDepartmentBtn").addEventListener("click", async () => {
      const input = document.getElementById("departmentName");
      const errorEl = document.getElementById("departmentFormError");
      errorEl.textContent = "";
      const name = input.value.trim();
      if (!name) {
        errorEl.textContent = t('hospital_page.department_name_required', 'Department name is required.');
        return;
      }
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!data.success) {
        errorEl.textContent = data.message || t('hospital_page.could_not_add_department', 'Could not add department.');
        return;
      }
      input.value = "";
      loadDepartments();
    });

    loadDepartments();

    if (window.MEDISYS_RT) {
      MEDISYS_RT.on("departments", loadDepartments);
    }
  }

  const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  async function initNurseAssignment() {
    const modeSelect = document.getElementById("assignmentModeSelect");
    if (!modeSelect) return;

    const [staffRes, wardsRes] = await Promise.all([
      fetch("/api/hospital/staff", { credentials: "same-origin" }).then((r) => r.json()),
      fetch("/api/wards", { credentials: "same-origin" }).then((r) => r.json()),
    ]);
    const doctors = staffRes.success ? staffRes.staff.filter((s) => s.role === "doctor") : [];
    const nurses = staffRes.success ? staffRes.staff.filter((s) => s.role === "nurse") : [];
    const wards = wardsRes.success ? wardsRes.wards : [];

    function optionsFor(list) {
      return list.length
        ? list.map((s) => `<option value="${escapeHtml(s.user_id)}">${escapeHtml(s.full_name)}</option>`).join("")
        : `<option value="">None registered yet</option>`;
    }

    document.getElementById("rosterNurseSelect").innerHTML = optionsFor(nurses);
    document.getElementById("teamNurseSelect").innerHTML = optionsFor(nurses);
    document.getElementById("teamDoctorSelect").innerHTML = optionsFor(doctors);
    document.getElementById("rosterWardSelect").innerHTML = wards.length
      ? wards.map((w) => `<option value="${w.id}">${escapeHtml(w.name)}</option>`).join("")
      : `<option value="">No wards set up yet</option>`;

    const hospitalRes = await fetch("/api/hospital/me", { credentials: "same-origin" }).then((r) => r.json());
    const currentMode = hospitalRes.success ? hospitalRes.hospital.nurse_assignment_mode : "ward_based";
    modeSelect.value = currentMode;
    document.getElementById("teamsSection").hidden = currentMode !== "doctor_team";

    modeSelect.addEventListener("change", async () => {
      const hint = document.getElementById("modeSaveHint");
      hint.textContent = t('common.saving', 'Saving...');
      const res = await fetch("/api/hospital/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ nurseAssignmentMode: modeSelect.value }),
      });
      const data = await res.json();
      hint.textContent = data.success ? t('common.saved', 'Saved.') : data.message || t('hospital_page.could_not_save', 'Could not save.');
      document.getElementById("teamsSection").hidden = modeSelect.value !== "doctor_team";
      if (data.success) loadTeams();
    });

    async function loadRoster() {
      const res = await fetch("/api/nurse-roster", { credentials: "same-origin" });
      const data = await res.json();
      const tbody = document.getElementById("rosterTableBody");
      const emptyState = document.getElementById("rosterEmptyState");

      if (!data.success || data.roster.length === 0) {
        tbody.innerHTML = "";
        emptyState.hidden = false;
        return;
      }
      emptyState.hidden = true;

      tbody.innerHTML = data.roster
        .map(
          (r) => `<tr>
            <td>${escapeHtml(r.nurse_name || r.nurse_user_id)}</td>
            <td>${escapeHtml(r.ward_name || "—")}</td>
            <td>${escapeHtml(r.shift)}</td>
            <td>${DAY_LABELS[r.day_of_week] || r.day_of_week}</td>
            <td><button type="button" class="icon-btn-delete delete-roster-btn" data-id="${r.id}" aria-label="Remove">&times;</button></td>
          </tr>`
        )
        .join("");

      tbody.querySelectorAll(".delete-roster-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          await fetch(`/api/nurse-roster/${btn.dataset.id}`, { method: "DELETE", credentials: "same-origin" });
          loadRoster();
        });
      });
    }

    document.getElementById("addRosterBtn").addEventListener("click", async () => {
      const errorEl = document.getElementById("rosterFormError");
      errorEl.textContent = "";
      const nurseUserId = document.getElementById("rosterNurseSelect").value;
      const wardId = document.getElementById("rosterWardSelect").value;
      if (!nurseUserId || !wardId) {
        errorEl.textContent = t('hospital_page.nurse_ward_required', 'A registered nurse and an existing ward are required.');
        return;
      }
      const res = await fetch("/api/nurse-roster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          nurseUserId,
          wardId,
          shift: document.getElementById("rosterShiftSelect").value,
          dayOfWeek: Number(document.getElementById("rosterDaySelect").value),
        }),
      });
      const data = await res.json();
      if (!data.success) {
        errorEl.textContent = data.message || t('hospital_page.could_not_add_roster', 'Could not add roster entry.');
        return;
      }
      loadRoster();
    });

    async function loadTeams() {
      const res = await fetch("/api/doctor-nurse-teams", { credentials: "same-origin" });
      const data = await res.json();
      const tbody = document.getElementById("teamsTableBody");
      const emptyState = document.getElementById("teamsEmptyState");

      if (!data.success || data.teams.length === 0) {
        tbody.innerHTML = "";
        emptyState.hidden = false;
        return;
      }
      emptyState.hidden = true;

      tbody.innerHTML = data.teams
        .map(
          (t) => `<tr>
            <td>${escapeHtml(t.doctor_name || t.doctor_user_id)}</td>
            <td>${escapeHtml(t.nurse_name || t.nurse_user_id)}</td>
            <td><button type="button" class="icon-btn-delete delete-team-btn" data-id="${t.id}" aria-label="Remove">&times;</button></td>
          </tr>`
        )
        .join("");

      tbody.querySelectorAll(".delete-team-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          await fetch(`/api/doctor-nurse-teams/${btn.dataset.id}`, { method: "DELETE", credentials: "same-origin" });
          loadTeams();
        });
      });
    }

    document.getElementById("addTeamBtn").addEventListener("click", async () => {
      const errorEl = document.getElementById("teamFormError");
      errorEl.textContent = "";
      const doctorUserId = document.getElementById("teamDoctorSelect").value;
      const nurseUserId = document.getElementById("teamNurseSelect").value;
      if (!doctorUserId || !nurseUserId) {
        errorEl.textContent = t('hospital_page.doctor_nurse_required', 'A registered doctor and nurse are required.');
        return;
      }
      const res = await fetch("/api/doctor-nurse-teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ doctorUserId, nurseUserId }),
      });
      const data = await res.json();
      if (!data.success) {
        errorEl.textContent = data.message || t('hospital_page.could_not_add_team', 'Could not add team.');
        return;
      }
      loadTeams();
    });

    loadRoster();
    loadTeams();

    if (window.MEDISYS_RT) {
      MEDISYS_RT.on("nurse_roster", () => {
        loadRoster();
        loadTeams();
      });
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const user = await guardSession();
    if (!user) return;
    wireLogout();
    loadHospital();
    loadStaffCount();
    loadOutbreakAlerts();
    initAddStaff();
    initStaffList();
    initDepartments();
    initNurseAssignment();

    if (window.MEDISYS_RT) {
      MEDISYS_RT.on("staff", loadStaffCount);
      MEDISYS_RT.on("hospitals", loadHospital);
      MEDISYS_RT.on("disease_alerts", (payload) => {
        loadOutbreakAlerts();
        if (window.showToast) {
          showToast(t('hospital_page.outbreak_toast', '⚠ Outbreak alert: {diagnosis} — {caseCount} recent cases.', { diagnosis: payload.diagnosis, caseCount: payload.caseCount }), "error");
        }
      });
    }

    window.addEventListener("i18n:languageChanged", () => {
      loadHospital();
      loadStaffCount();
      initRolePicker();
      initStaffList();
    });
  });
})();
