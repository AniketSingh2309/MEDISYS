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

  async function openConsultation(visitId, patientUhid, patientName) {
    activeVisit = { id: visitId, patientUhid, patientName };
    document.getElementById("consultTitle").textContent = `Consultation — ${patientName}`;
    document.getElementById("consultSection").hidden = false;
    document.getElementById("consultConfirmation").textContent = "";
    document.getElementById("consultError").textContent = "";
    document.getElementById("symptoms").value = "";
    document.getElementById("consultNotes").value = "";

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

    feed.innerHTML = consultationItems + admissionItems || `<p class="wizard-hint">No prior history.</p>`;
  }

  function wireConsultForm() {
    document.getElementById("completeConsultBtn").addEventListener("click", async () => {
      const errorEl = document.getElementById("consultError");
      errorEl.textContent = "";

      if (!activeVisit) return;

      const res = await fetch(`/api/opd/visits/${activeVisit.id}/consultation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          symptoms: document.getElementById("symptoms").value.trim(),
          notes: document.getElementById("consultNotes").value.trim(),
          decision: document.getElementById("decision").value,
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
    loadQueue();
  });
})();
