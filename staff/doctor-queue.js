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

  const DECISION_LABELS = { prescribe: "Prescription", order_tests: "Tests Ordered", admit: "Admission Requested" };
  function formatDecisionLabel(decision) {
    return String(decision || "")
      .split(",")
      .map((d) => DECISION_LABELS[d.trim()] || d.trim())
      .filter(Boolean)
      .join(" + ") || "Consultation";
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

    tbody.innerHTML = data.queue
      .map((v) => {
        let actionBtn = "";
        if (v.status === "waiting") {
          actionBtn = `<button type="button" class="wizard-suggest-btn call-btn" data-id="${v.id}" data-uhid="${escapeHtml(v.patient_uhid)}" data-name="${escapeHtml(v.patient_name || v.patient_uhid)}">Call</button>`;
        } else if (v.status === "in-consultation") {
          actionBtn = `<button type="button" class="wizard-suggest-btn consult-btn" data-id="${v.id}" data-uhid="${escapeHtml(v.patient_uhid)}" data-name="${escapeHtml(v.patient_name || v.patient_uhid)}">Consult</button>`;
        }
        return `<tr>
          <td>#${v.token_number}</td>
          <td>${escapeHtml(v.patient_name || v.patient_uhid)}</td>
          <td>${escapeHtml(v.slot_time || "Walk-in")}</td>
          <td><span class="queue-status ${escapeHtml(v.status)}">${escapeHtml(v.status)}</span></td>
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

  // Each mic button is scoped to one field — dictating into Symptoms only
  // fills Symptoms, dictating into Medicine only fills the medicine row,
  // and so on. The one thing that applies across all of them is the
  // admission flag: if the doctor says "admit" while dictating anything,
  // tick the admission checkbox regardless of which mic picked it up.
  function applyAdmitSuggestion(data) {
    if (data.admitSuggested) document.getElementById("admitCheckbox").checked = true;
  }

  function wireVoiceMics() {
    if (!window.MedisysVoice) return;

    const languageSelect = document.getElementById("voiceLanguage");
    MedisysVoice.renderLanguageOptions(languageSelect);
    const getLanguage = () => languageSelect.value;
    const setStatus = (text) => {
      document.getElementById("voiceStatus").textContent = text;
    };
    const showError = (message) => {
      document.getElementById("consultError").textContent = message;
    };

    MedisysVoice.attachMic(document.getElementById("micSymptoms"), {
      getLanguage,
      onStatus: setStatus,
      onError: showError,
      onResult: (data) => {
        const el = document.getElementById("symptoms");
        const text = data.transcriptEnglish || data.notes || "";
        el.value = el.value.trim() ? `${el.value}\n${text}` : text;
        applyAdmitSuggestion(data);
      },
    });

    MedisysVoice.attachMic(document.getElementById("micNotes"), {
      getLanguage,
      onStatus: setStatus,
      onError: showError,
      onResult: (data) => {
        const el = document.getElementById("consultNotes");
        const text = data.transcriptEnglish || data.notes || "";
        el.value = el.value.trim() ? `${el.value}\n${text}` : text;
        applyAdmitSuggestion(data);
      },
    });

    MedisysVoice.attachMic(document.getElementById("micMedicine"), {
      getLanguage,
      onStatus: setStatus,
      onError: showError,
      onResult: (data) => {
        const med = (data.medicines || [])[0];
        document.getElementById("medName").value = (med && med.name) || data.transcriptEnglish || data.notes || "";
        if (med && med.dosage) document.getElementById("medDosage").value = med.dosage;
        if (med && med.duration) document.getElementById("medDuration").value = med.duration;
        if (med && med.foodInstruction) document.getElementById("medFoodInstruction").value = med.foodInstruction;
        applyAdmitSuggestion(data);
      },
    });

    MedisysVoice.attachMic(document.getElementById("micTests"), {
      getLanguage,
      onStatus: setStatus,
      onError: showError,
      onResult: async (data) => {
        const query = (data.testsSuggested || [])[0] || data.transcriptEnglish || data.notes || "";
        const matches = (await searchTestCatalog(query)).filter(
          (t) => !selectedTests.some((s) => String(s.id) === String(t.id))
        );
        const match = matches.find((t) => t.name.toLowerCase() === query.toLowerCase()) || matches[0];

        if (match) {
          selectTest(match.id, match.name);
          setStatus(`Ticked "${match.name}" from the test catalog.`);
        } else {
          // No catalog match — leave it in the search box for manual review
          // instead of silently dropping the dictation.
          document.getElementById("testSearchInput").value = query;
          runTestSearch(query);
          setStatus(`No catalog match for "${query}" — pick from the results below.`);
        }
        applyAdmitSuggestion(data);
      },
    });
  }

  // Shared by the "+ Add" button and the medicine dictation mic, so a fully
  // specified voice-dictated medicine is added the same way a manually
  // typed one is — no separate code path to drift out of sync.
  function addCurrentMedicineToList({ silent = false } = {}) {
    const errorEl = document.getElementById("consultError");
    if (!silent) errorEl.textContent = "";
    const medicineName = document.getElementById("medName").value.trim();
    const dosage = document.getElementById("medDosage").value;
    const duration = document.getElementById("medDuration").value;
    const foodInstruction = document.getElementById("medFoodInstruction").value;
    const urgency = document.getElementById("medUrgency").value;
    if (!medicineName || !dosage || !duration) {
      if (!silent) errorEl.textContent = "Fill in medicine name, dosage, and duration before adding it.";
      return false;
    }
    selectedMeds.push({ medicineName, dosage, duration, foodInstruction, urgency });
    renderSelectedMeds();
    document.getElementById("medName").value = "";
    document.getElementById("medDosage").value = "";
    document.getElementById("medDuration").value = "";
    document.getElementById("medFoodInstruction").value = "";
    document.getElementById("medUrgency").value = "routine";
    return true;
  }

  function wireAddMedButton() {
    document.getElementById("addMedBtn").addEventListener("click", () => addCurrentMedicineToList());
  }

  // Shared by clicking a search result and by the test-order dictation mic.
  function selectTest(id, name) {
    if (selectedTests.some((t) => String(t.id) === String(id))) return;
    selectedTests.push({ id, name });
    renderSelectedTests();
    document.getElementById("testSearchInput").value = "";
    document.getElementById("testSearchResults").innerHTML = "";
  }

  async function searchTestCatalog(query) {
    if (!query.trim()) return [];
    const res = await fetch(`/api/tests/search?q=${encodeURIComponent(query)}`, { credentials: "same-origin" });
    const data = await res.json();
    return data.success ? data.tests : [];
  }

  async function runTestSearch(query) {
    const resultsEl = document.getElementById("testSearchResults");
    const tests = (await searchTestCatalog(query)).filter(
      (t) => !selectedTests.some((s) => String(s.id) === String(t.id))
    );
    if (!query.trim()) {
      resultsEl.innerHTML = "";
      return;
    }

    resultsEl.innerHTML = tests
      .map(
        (t) => `<div class="test-search-result-item" data-id="${t.id}" data-name="${escapeHtml(t.name)}">
          <span class="test-search-result-name">${escapeHtml(t.name)}</span>
          <span class="test-search-result-meta">${escapeHtml(t.category)} &middot; ₹${t.price}</span>
        </div>`
      )
      .join("");

    resultsEl.querySelectorAll(".test-search-result-item").forEach((item) => {
      item.addEventListener("click", () => selectTest(item.dataset.id, item.dataset.name));
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
    document.getElementById("consultTitle").textContent = `Consultation — ${patientName}`;
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

    feed.innerHTML =
      labOrderItems + consultationItems + admissionItems || `<p class="wizard-hint">No prior history.</p>`;
  }

  function buildConsultationPdfHtml() {
    const patientName = (activeVisit && activeVisit.patientName) || "—";
    const patientUhid = (activeVisit && activeVisit.patientUhid) || "—";
    const doctorName = (sessionUser && sessionUser.fullName) || (sessionUser && sessionUser.userId) || "—";
    const symptoms = document.getElementById("symptoms").value.trim() || "—";
    const notes = document.getElementById("consultNotes").value.trim() || "—";
    const admit = document.getElementById("admitCheckbox").checked;
    const now = new Date();

    const medRows = selectedMeds.length
      ? selectedMeds
          .map(
            (m) => `<tr>
              <td>${escapeHtml(m.medicineName)}</td>
              <td>${escapeHtml(m.dosage || "—")}</td>
              <td>${escapeHtml(String(m.duration || "—"))} day(s)</td>
              <td>${escapeHtml(m.foodInstruction || "—")}</td>
              <td>${m.urgency === "urgent" ? "Urgent" : "Routine"}</td>
            </tr>`
          )
          .join("")
      : `<tr><td colspan="5">No medicines prescribed.</td></tr>`;

    const testRows = selectedTests.length
      ? selectedTests.map((t) => `<li>${escapeHtml(t.name)}</li>`).join("")
      : "<li>No tests ordered.</li>";

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Consultation — ${escapeHtml(patientName)}</title>
<style>
  body { font-family: -apple-system, Arial, sans-serif; color: #142621; margin: 40px; line-height: 1.5; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .meta { color: #46605a; font-size: 13px; margin-bottom: 24px; }
  .meta span { display: inline-block; margin-right: 18px; }
  h2 { font-size: 15px; border-bottom: 1px solid #d6e0dd; padding-bottom: 4px; margin-top: 24px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #eef2f2; }
  th { color: #46605a; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
  p.field { white-space: pre-wrap; font-size: 13.5px; margin: 6px 0 0; }
  .admit-flag { font-weight: 600; color: ${admit ? "#0f6e5e" : "#46605a"}; }
  footer { margin-top: 32px; font-size: 11px; color: #7c918c; }
  @media print { body { margin: 20px; } }
</style>
</head>
<body>
  <h1>MEDISYS — Consultation Record</h1>
  <div class="meta">
    <span><strong>Patient:</strong> ${escapeHtml(patientName)} (${escapeHtml(patientUhid)})</span>
    <span><strong>Doctor:</strong> Dr. ${escapeHtml(doctorName)}</span>
    <span><strong>Date:</strong> ${escapeHtml(now.toLocaleString())}</span>
  </div>

  <h2>Symptoms</h2>
  <p class="field">${escapeHtml(symptoms)}</p>

  <h2>Notes</h2>
  <p class="field">${escapeHtml(notes)}</p>

  <h2>Prescribed Medicines</h2>
  <table>
    <thead><tr><th>Medicine</th><th>Dosage</th><th>Duration</th><th>Instruction</th><th>Priority</th></tr></thead>
    <tbody>${medRows}</tbody>
  </table>

  <h2>Tests / X-Rays Ordered</h2>
  <ul>${testRows}</ul>

  <h2>Admission</h2>
  <p class="admit-flag">${admit ? "🛏️ Admission requested." : "Not required."}</p>

  <footer>Generated from MEDISYS on ${escapeHtml(now.toLocaleString())}. Review all AI-dictated fields for accuracy before treating this as final.</footer>
</body>
</html>`;
  }

  function wirePdfDownload() {
    document.getElementById("downloadConsultPdfBtn").addEventListener("click", () => {
      const errorEl = document.getElementById("consultError");
      if (!activeVisit) {
        errorEl.textContent = "Open a consultation before downloading its document.";
        return;
      }
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        errorEl.textContent = "Could not open the print window — check your browser's popup blocker.";
        return;
      }
      printWindow.document.write(buildConsultationPdfHtml());
      printWindow.document.close();
      printWindow.focus();
      // Let the new document finish laying out before the print dialog opens.
      printWindow.onload = () => printWindow.print();
    });
  }

  function wireConsultForm() {
    document.getElementById("completeConsultBtn").addEventListener("click", async () => {
      const errorEl = document.getElementById("consultError");
      errorEl.textContent = "";

      if (!activeVisit) return;

      const admit = document.getElementById("admitCheckbox").checked;
      if (selectedMeds.length === 0 && selectedTests.length === 0 && !admit) {
        errorEl.textContent = "Add at least one action: prescribe a medicine, order a test, or admit the patient.";
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
    wireVoiceMics();
    wirePdfDownload();
    loadQueue();

    if (window.MEDISYS_RT) {
      MEDISYS_RT.on("opd_queue", loadQueue);
    }
  });
})();
