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

  let sessionUser = null;
  let activeVisit = null;
  let selectedTests = [];
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
    document.getElementById("decision").addEventListener("change", (e) => {
      document.getElementById("testOrderSection").hidden = e.target.value !== "order_tests";
    });

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
    document.getElementById("decision").value = "prescribe";
    document.getElementById("testOrderSection").hidden = true;
    document.getElementById("testSearchInput").value = "";
    document.getElementById("testSearchResults").innerHTML = "";
    selectedTests = [];
    renderSelectedTests();

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
          <strong>${escapeHtml(c.decision)}</strong> — ${escapeHtml(c.symptoms || "—")}
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
        const statusLabel = { pending: "Ordered", in_progress: "In Progress", completed: "Completed" }[o.status] || o.status;
        const resultLine =
          o.status === "completed"
            ? `<div class="chart-feed-meta">${escapeHtml(o.result_notes || "No notes")}${
                o.result_file_name
                  ? ` &middot; <a href="/api/lab-orders/${o.id}/result-file" target="_blank" rel="noopener" class="file-view-link"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>${escapeHtml(o.result_file_name)}</a>`
                  : ""
              }</div>`
            : "";
        return `<div class="chart-feed-item">
          <strong>${escapeHtml(o.test_name)}</strong> — <span class="queue-status ${o.status === "completed" ? "completed" : "waiting"}">${escapeHtml(statusLabel)}</span>
          ${resultLine}
          <div class="chart-feed-meta">Ordered ${escapeHtml(new Date(o.created_at).toLocaleString())}</div>
        </div>`;
      })
      .join("");

    feed.innerHTML =
      labOrderItems + consultationItems + admissionItems || `<p class="wizard-hint">No prior history.</p>`;
  }

  function wireConsultForm() {
    document.getElementById("completeConsultBtn").addEventListener("click", async () => {
      const errorEl = document.getElementById("consultError");
      errorEl.textContent = "";

      if (!activeVisit) return;

      const decision = document.getElementById("decision").value;
      if (decision === "order_tests" && selectedTests.length === 0) {
        errorEl.textContent = "Select at least one test to order.";
        return;
      }

      const res = await fetch(`/api/opd/visits/${activeVisit.id}/consultation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          symptoms: document.getElementById("symptoms").value.trim(),
          notes: document.getElementById("consultNotes").value.trim(),
          decision,
          testIds: decision === "order_tests" ? selectedTests.map((t) => t.id) : undefined,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        errorEl.textContent = data.message || "Could not record consultation.";
        return;
      }

      let confirmationText = "Consultation recorded.";
      if (data.admissionId && data.admissionAlreadyExisted) {
        confirmationText = `Consultation recorded. This patient already has an active/pending admission (#${data.admissionId}) — no duplicate was created.`;
      } else if (data.admissionId) {
        confirmationText = `Consultation recorded. Admission request #${data.admissionId} created for bed allocation.`;
      }
      document.getElementById("consultConfirmation").textContent = confirmationText;

      activeVisit = null;
      loadQueue();
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const user = await guardSession();
    if (!user) return;
    wireLogout();
    wireConsultForm();
    wireTestOrderWidget();
    loadQueue();
  });
})();
