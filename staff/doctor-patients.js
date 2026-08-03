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

  async function loadPatients() {
    const res = await fetch("/api/doctor/patients", { credentials: "same-origin" });
    const data = await res.json();
    const tbody = document.getElementById("patientsTableBody");
    const emptyState = document.getElementById("patientsEmptyState");

    if (!data.success || data.patients.length === 0) {
      tbody.innerHTML = "";
      emptyState.hidden = false;
      return;
    }
    emptyState.hidden = true;

    tbody.innerHTML = data.patients
      .map((p) => {
        const reportBits = [];
        if (p.completed_report_count > 0) reportBits.push(`${p.completed_report_count} ready`);
        if (p.pending_report_count > 0) reportBits.push(`${p.pending_report_count} pending`);
        return `<tr>
          <td>${escapeHtml(p.full_name || p.uhid)}</td>
          <td>${escapeHtml(p.phone || "—")}</td>
          <td>${reportBits.length ? escapeHtml(reportBits.join(", ")) : "—"}</td>
          <td><button type="button" class="wizard-suggest-btn view-patient-btn" data-uhid="${escapeHtml(p.uhid)}" data-name="${escapeHtml(p.full_name || p.uhid)}">View Chart</button></td>
        </tr>`;
      })
      .join("");

    tbody.querySelectorAll(".view-patient-btn").forEach((btn) => {
      btn.addEventListener("click", () => loadChart(btn.dataset.uhid, btn.dataset.name));
    });
  }

  async function loadChart(uhid, name) {
    const res = await fetch(`/api/patients/${encodeURIComponent(uhid)}/history`, { credentials: "same-origin" });
    const data = await res.json();
    if (!data.success) return;

    document.getElementById("detailSection").hidden = false;
    document.getElementById("detailHeading").textContent = `Patient Chart — ${name}`;
    document.getElementById("detailSection").scrollIntoView({ behavior: "smooth", block: "start" });

    const consultationsFeed = document.getElementById("consultationsFeed");
    consultationsFeed.innerHTML =
      data.history.consultations
        .map((c) => {
          const label = c.decision === "prescribe" ? "Prescription" : c.decision === "order_tests" ? "Tests Ordered" : "Admission Requested";
          return `<div class="chart-feed-item">
            <strong>${escapeHtml(label)}</strong> — ${escapeHtml(c.symptoms || "—")}
            ${c.notes ? `<div>${escapeHtml(c.notes)}</div>` : ""}
            <div class="chart-feed-meta">${escapeHtml(new Date(c.created_at).toLocaleString())}</div>
          </div>`;
        })
        .join("") || `<p class="wizard-hint">No consultations recorded yet.</p>`;

    const reportsFeed = document.getElementById("reportsFeed");
    reportsFeed.innerHTML =
      (data.history.labOrders || [])
        .map((o) => {
          const statusLabel = { pending: "Ordered", in_progress: "In Progress", completed: "Ready" }[o.status] || o.status;
          const statusClass = o.status === "completed" ? "completed" : o.status === "in_progress" ? "in-consultation" : "waiting";
          const fileLink = o.result_file_name
            ? `<a href="/api/lab-orders/${o.id}/result-file" target="_blank" rel="noopener" class="file-view-link">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
                ${escapeHtml(o.result_file_name)}
              </a>`
            : "";
          return `<div class="chart-feed-item">
            <strong>${escapeHtml(o.test_name)}</strong> (${escapeHtml(o.category || o.department || "")}) —
            <span class="queue-status ${statusClass}">${escapeHtml(statusLabel)}</span>
            ${o.status === "completed" ? `<div>${escapeHtml(o.result_notes || "No notes")}${fileLink ? " &middot; " + fileLink : ""}</div>` : ""}
            <div class="chart-feed-meta">Ordered ${escapeHtml(new Date(o.created_at).toLocaleString())}</div>
          </div>`;
        })
        .join("") || `<p class="wizard-hint">No lab or radiology orders yet.</p>`;

    const admissionsFeed = document.getElementById("admissionsFeed");
    admissionsFeed.innerHTML =
      data.history.admissions
        .map(
          (a) => `<div class="chart-feed-item">
            Admission (${escapeHtml(a.status)})
            <div class="chart-feed-meta">${escapeHtml(new Date(a.created_at).toLocaleString())}</div>
          </div>`
        )
        .join("") || `<p class="wizard-hint">No admissions.</p>`;
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const user = await guardSession();
    if (!user) return;
    wireLogout();
    loadPatients();
  });
})();
