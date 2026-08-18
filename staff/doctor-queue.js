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

  const DECISION_KEYS = { prescribe: "doctor_queue.prescription", order_tests: "doctor_queue.tests_ordered", admit: "doctor_queue.admission_requested" };
  const DECISION_LABELS = { prescribe: "Prescription", order_tests: "Tests Ordered", admit: "Admission Requested" };

  function formatDecisionLabel(decision) {
    return String(decision || "")
      .split(",")
      .map((d) => {
        const key = DECISION_KEYS[d.trim()];
        if (key && window.i18n && typeof window.i18n.t === "function") {
          const res = window.i18n.t(key);
          if (res && res !== key) return res;
        }
        return DECISION_LABELS[d.trim()] || d.trim();
      })
      .filter(Boolean)
      .join(" + ") || (window.i18n ? window.i18n.t("doctor_queue.consultation") : "Consultation");
  }

  const STATUS_MAP = {
    waiting: "opd.status_waiting",
    in_consultation: "opd.status_in_consultation",
    "in-consultation": "opd.status_in_consultation",
    completed: "opd.status_completed",
    cancelled: "opd.status_cancelled",
  };

  function getStatusDisplay(s) {
    const key = STATUS_MAP[s] || `opd.status_${s}`;
    if (window.i18n && typeof window.i18n.t === "function") {
      const res = window.i18n.t(key);
      if (res && res !== key) return res;
    }
    const fallbacks = {
      waiting: "Waiting",
      in_consultation: "In Consultation",
      "in-consultation": "In Consultation",
      completed: "Completed",
      cancelled: "Cancelled",
    };
    return fallbacks[s] || s;
  }

  let sessionUser = null;
  let activeVisit = null;
  let selectedTests = [];
  let selectedMeds = [];
  let searchDebounce = null;

  async function guardSession() {
    const res = await fetch("/api/session", { credentials: "same-origin" });
    const data = await res.json();
    if (!data.user || data.user.role !== "doctor") {
      window.location.href = "../index.html";
      return null;
    }
    sessionUser = data.user;
    document.getElementById("portalUser").textContent = data.user.fullName || data.user.userId;
    return data.user;
  }

  function wireLogout() {
    document.getElementById("logoutBtn").addEventListener("click", async () => {
      await fetch("/api/logout", { method: "POST", credentials: "same-origin" });
      window.location.href = "../index.html";
    });
  }

  async function loadQueue() {
    const res = await fetch(`/api/opd/queue?doctorUserId=${encodeURIComponent(sessionUser.userId)}`, {
      credentials: "same-origin",
    });
    const data = await res.json();
    const tbody = document.getElementById("queueTableBody");
    const emptyState = document.getElementById("queueEmptyState");

    if (!data.success || data.queue.length === 0) {
      tbody.innerHTML = "";
      emptyState.hidden = false;
      return;
    }
    emptyState.hidden = true;

    const callLabel = window.i18n ? window.i18n.t("doctor_queue.call_patient") : "Call";
    const consultLabel = window.i18n ? window.i18n.t("doctor_queue.consult") : "Consult";
    const walkInLabel = window.i18n ? window.i18n.t("registration.walk_in") : "Walk-in";

    tbody.innerHTML = data.queue
      .map((v) => {
        let actionBtn = "";
        if (v.status === "waiting") {
          actionBtn = `<button type="button" class="wizard-suggest-btn call-btn" data-id="${v.id}" data-uhid="${escapeHtml(v.patient_uhid)}" data-name="${escapeHtml(v.patient_name || v.patient_uhid)}">${escapeHtml(callLabel)}</button>`;
        } else if (v.status === "in-consultation") {
          actionBtn = `<button type="button" class="wizard-suggest-btn consult-btn" data-id="${v.id}" data-uhid="${escapeHtml(v.patient_uhid)}" data-name="${escapeHtml(v.patient_name || v.patient_uhid)}">${escapeHtml(consultLabel)}</button>`;
        }
        return `<tr>
          <td>#${v.token_number}</td>
          <td>${escapeHtml(v.patient_name || v.patient_uhid)}</td>
          <td>${escapeHtml(v.slot_time || walkInLabel)}</td>
          <td><span class="queue-status ${escapeHtml(v.status)}">${escapeHtml(getStatusDisplay(v.status))}</span></td>
          <td>${actionBtn}</td>
        </tr>`;
      })
      .join("");

    tbody.querySelectorAll(".call-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await fetch(`/api/opd/visits/${btn.dataset.id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ status: "in-consultation" }),
        });
        loadQueue();
      });
    });

    tbody.querySelectorAll(".consult-btn").forEach((btn) => {
      btn.addEventListener("click", () => openConsultation(btn.dataset.id, btn.dataset.uhid, btn.dataset.name));
    });
  }

  function renderSelectedTests() {
    const row = document.getElementById("selectedTestChips");
    row.innerHTML = selectedTests
      .map(
        (t) => `<span class="test-chip">${escapeHtml(t.name)}<button type="button" class="test-chip-remove" data-id="${t.id}">&times;</button></span>`
      )
      .join("");
    row.querySelectorAll(".test-chip-remove").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedTests = selectedTests.filter((t) => String(t.id) !== btn.dataset.id);
        renderSelectedTests();
      });
    });
  }

  function renderSelectedMeds() {
    const row = document.getElementById("selectedMedChips");
    row.innerHTML = selectedMeds
      .map(
        (m, i) =>
          `<span class="test-chip">${escapeHtml(m.medicineName)} — ${escapeHtml(m.dosage)}, ${escapeHtml(String(m.duration))}d${
            m.foodInstruction ? ", " + escapeHtml(m.foodInstruction) : ""
          }${m.urgency === "urgent" ? " (Urgent)" : ""}<button type="button" class="test-chip-remove" data-idx="${i}">&times;</button></span>`
      )
      .join("");
    row.querySelectorAll(".test-chip-remove").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedMeds.splice(Number(btn.dataset.idx), 1);
        renderSelectedMeds();
      });
    });
  }

  function wireAddMedButton() {
    document.getElementById("addMedBtn").addEventListener("click", () => {
      const errorEl = document.getElementById("consultError");
      errorEl.textContent = "";
      const medicineName = document.getElementById("medName").value.trim();
      const dosage = document.getElementById("medDosage").value;
      const duration = document.getElementById("medDuration").value;
      const foodInstruction = document.getElementById("medFoodInstruction").value;
      const urgency = document.getElementById("medUrgency").value;
      if (!medicineName || !dosage || !duration) {
        errorEl.textContent = window.i18n
          ? window.i18n.t("doctor_queue.fill_medicine_details")
          : "Fill in medicine name, dosage, and duration before adding it.";
        return;
      }
      selectedMeds.push({ medicineName, dosage, duration, foodInstruction, urgency });
      renderSelectedMeds();
      document.getElementById("medName").value = "";
      document.getElementById("medDosage").value = "";
      document.getElementById("medDuration").value = "";
      document.getElementById("medFoodInstruction").value = "";
      document.getElementById("medUrgency").value = "routine";
    });
  }

  async function runTestSearch(query) {
    const resultsEl = document.getElementById("testSearchResults");
    if (!query.trim()) {
      resultsEl.innerHTML = "";
      return;
    }
    const res = await fetch(`/api/tests/search?q=${encodeURIComponent(query)}`, { credentials: "same-origin" });
    const data = await res.json();
    if (!data.success) {
      resultsEl.innerHTML = "";
      return;
    }
    const selectedIds = new Set(selectedTests.map((t) => String(t.id)));
    const tests = data.tests.filter((t) => !selectedIds.has(String(t.id)));

    resultsEl.innerHTML = tests
      .map(
        (t) => `<div class="test-search-result-item" data-id="${t.id}" data-name="${escapeHtml(t.name)}">
          <span class="test-search-result-name">${escapeHtml(t.name)}</span>
          <span class="test-search-result-meta">${escapeHtml(t.category)} &middot; ₹${t.price}</span>
        </div>`
      )
      .join("");

    resultsEl.querySelectorAll(".test-search-result-item").forEach((item) => {
      item.addEventListener("click", () => {
        selectedTests.push({ id: item.dataset.id, name: item.dataset.name });
        renderSelectedTests();
        document.getElementById("testSearchInput").value = "";
        resultsEl.innerHTML = "";
      });
    });
  }

  function wireTestOrderWidget() {
    document.getElementById("testSearchInput").addEventListener("input", (e) => {
      clearTimeout(searchDebounce);
      const query = e.target.value;
      searchDebounce = setTimeout(() => runTestSearch(query), 200);
    });
  }

  async function openConsultation(visitId, patientUhid, patientName) {
    activeVisit = { id: visitId, patientUhid, patientName };
    const titlePrefix = window.i18n ? window.i18n.t("doctor_queue.consultation") : "Consultation";
    document.getElementById("consultTitle").textContent = `${titlePrefix} — ${patientName}`;
    document.getElementById("consultSection").hidden = false;
    document.getElementById("consultConfirmation").textContent = "";
    document.getElementById("consultError").textContent = "";
    document.getElementById("symptoms").value = "";
    document.getElementById("consultNotes").value = "";
    document.getElementById("medName").value = "";
    document.getElementById("medDosage").value = "";
    document.getElementById("medDuration").value = "";
    document.getElementById("medFoodInstruction").value = "";
    document.getElementById("medUrgency").value = "routine";
    document.getElementById("testSearchInput").value = "";
    document.getElementById("testSearchResults").innerHTML = "";
    document.getElementById("admitCheckbox").checked = false;
    selectedTests = [];
    selectedMeds = [];
    renderSelectedTests();
    renderSelectedMeds();

    const res = await fetch(`/api/patients/${encodeURIComponent(patientUhid)}/history`, {
      credentials: "same-origin",
    });
    const data = await res.json();
    const feed = document.getElementById("historyFeed");
    if (!data.success) {
      feed.innerHTML = "";
      return;
    }

    const consultationItems = data.history.consultations
      .map(
        (c) => `<div class="chart-feed-item">
          <strong>${escapeHtml(formatDecisionLabel(c.decision))}</strong> — ${escapeHtml(c.symptoms || "—")}
          <div class="chart-feed-meta">Dr. ${escapeHtml(c.doctor_name || "—")} &middot; ${escapeHtml(new Date(c.created_at).toLocaleString())}</div>
        </div>`
      )
      .join("");
    const admissionItems = data.history.admissions
      .map(
        (a) => `<div class="chart-feed-item">
          Admission (${escapeHtml(a.status)})
          <div class="chart-feed-meta">${escapeHtml(new Date(a.created_at).toLocaleString())}</div>
        </div>`
      )
      .join("");
    const labOrderItems = (data.history.labOrders || [])
      .map((o) => {
        const DONE_STATUSES = ["completed", "verified"];
        const isDone = DONE_STATUSES.includes(o.status);
        const statusLabel =
          { pending: "Ordered", in_progress: "In Progress", reported: "Reporting", completed: "Completed", verified: "Completed" }[
            o.status
          ] || o.status;
        const imageLinks = (o.images || [])
          .map(
            (img) =>
              ` &middot; <a href="/api/lab-orders/${o.id}/images/${img.id}" target="_blank" rel="noopener" class="file-view-link"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>${escapeHtml(img.fileName)}</a>`
          )
          .join("");
        const resultLine = isDone
          ? `<div class="chart-feed-meta">${escapeHtml(o.result_notes || "No notes")}${
              o.result_file_name
                ? ` &middot; <a href="/api/lab-orders/${o.id}/result-file" target="_blank" rel="noopener" class="file-view-link"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>${escapeHtml(o.result_file_name)}</a>`
                : ""
            }${imageLinks}</div>`
          : "";
        return `<div class="chart-feed-item">
          <strong>${escapeHtml(o.test_name)}</strong> — <span class="queue-status ${isDone ? "completed" : "waiting"}">${escapeHtml(statusLabel)}</span>
          ${resultLine}
          <div class="chart-feed-meta">Ordered ${escapeHtml(new Date(o.created_at).toLocaleString())}</div>
        </div>`;
      })
      .join("");

    const noHistoryMsg = window.i18n ? window.i18n.t("doctor_queue.no_prior_history") : "No prior history.";
    feed.innerHTML =
      labOrderItems + consultationItems + admissionItems || `<p class="wizard-hint">${escapeHtml(noHistoryMsg)}</p>`;
  }

  function wireConsultForm() {
    document.getElementById("completeConsultBtn").addEventListener("click", async () => {
      const errorEl = document.getElementById("consultError");
      errorEl.textContent = "";

      if (!activeVisit) return;

      const admit = document.getElementById("admitCheckbox").checked;
      if (selectedMeds.length === 0 && selectedTests.length === 0 && !admit) {
        errorEl.textContent = window.i18n
          ? window.i18n.t("doctor_queue.add_one_action")
          : "Add at least one action: prescribe a medicine, order a test, or admit the patient.";
        return;
      }

      const btn = document.getElementById("completeConsultBtn");
      btn.disabled = true;
      try {
        const res = await fetch(`/api/opd/visits/${activeVisit.id}/consultation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            symptoms: document.getElementById("symptoms").value.trim(),
            notes: document.getElementById("consultNotes").value.trim(),
            prescriptions: selectedMeds,
            testIds: selectedTests.map((t) => t.id),
            admit,
          }),
        });
        const data = await res.json();

        if (!data.success) {
          errorEl.textContent = data.message || "Could not record consultation.";
          return;
        }

        const parts = [];
        if (data.prescriptionCount > 0) parts.push(`${data.prescriptionCount} medicine(s) sent to Pharmacy`);
        if (data.testCount > 0) parts.push(`${data.testCount} test(s) ordered`);
        if (data.admissionId && data.admissionAlreadyExisted) {
          parts.push(`admission already active (#${data.admissionId})`);
        } else if (data.admissionId) {
          parts.push(`admission #${data.admissionId} requested`);
        }
        const summary = parts.length ? parts.join(" · ") : "Consultation recorded.";
        document.getElementById("consultConfirmation").textContent = `Consultation recorded — ${summary}.`;
        if (window.showToast) showToast(`Consultation saved: ${summary}.`, "success");

        activeVisit = null;
        loadQueue();

        // Hide the form after 2.5 seconds so they can read the confirmation
        setTimeout(() => {
          document.getElementById("consultSection").hidden = true;
        }, 2500);
      } finally {
        btn.disabled = false;
      }
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const user = await guardSession();
    if (!user) return;
    wireLogout();
    wireConsultForm();
    wireTestOrderWidget();
    wireAddMedButton();
    loadQueue();

    if (window.MEDISYS_RT) {
      MEDISYS_RT.on("opd_queue", loadQueue);
    }

    window.addEventListener("i18n:languageChanged", () => {
      loadQueue();
    });
  });
})();
