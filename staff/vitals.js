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

  let selectedVisit = null;

  async function guardSession() {
    const res = await fetch("/api/session", { credentials: "same-origin" });
    const data = await res.json();
    if (!data.user || !data.user.hospitalId || data.user.role === "patient") {
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

  async function loadQueue() {
    const res = await fetch("/api/opd/queue", { credentials: "same-origin" });
    const data = await res.json();
    const list = document.getElementById("queueList");
    const emptyState = document.getElementById("queueEmptyState");

    const visits = data.success ? data.queue : [];

    if (visits.length === 0) {
      list.innerHTML = "";
      emptyState.hidden = false;
      return;
    }
    emptyState.hidden = true;

    list.innerHTML = visits
      .map(
        (v) => `
        <div class="staff-entry-card portal-row" data-visit-id="${v.id}" data-patient-uhid="${escapeHtml(
          v.patient_uhid
        )}" data-patient-name="${escapeHtml(v.patient_name || v.patient_uhid)}" style="margin-bottom: 10px;" tabindex="0">
          <div class="staff-entry-name">#${v.token_number} — ${escapeHtml(v.patient_name || v.patient_uhid)}
            <span class="queue-status ${escapeHtml(v.status)}">${escapeHtml(v.status)}</span>
          </div>
          <div class="staff-entry-detail">Doctor: ${escapeHtml(v.doctor_name || v.doctor_user_id)}</div>
        </div>`
      )
      .join("");

    list.querySelectorAll(".portal-row").forEach((card) => {
      card.addEventListener("click", () => {
        selectedVisit = {
          id: card.dataset.visitId,
          patientUhid: card.dataset.patientUhid,
          patientName: card.dataset.patientName,
        };
        document.getElementById("vitalsFormTitle").textContent = `Log Vitals — ${selectedVisit.patientName}`;
        document.getElementById("vitalsFormSection").hidden = false;
        document.getElementById("vitalsFormError").textContent = "";
      });
    });
  }

  function wireForm() {
    document.getElementById("saveVitalsBtn").addEventListener("click", async () => {
      const errorEl = document.getElementById("vitalsFormError");
      errorEl.textContent = "";

      if (!selectedVisit) {
        errorEl.textContent = "Please select a patient from the queue first.";
        return;
      }

      const res = await fetch("/api/vitals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          patientUhid: selectedVisit.patientUhid,
          opdVisitId: selectedVisit.id,
          bp: document.getElementById("bp").value.trim(),
          temperature: document.getElementById("temperature").value.trim(),
          weight: document.getElementById("weight").value.trim(),
          spo2: document.getElementById("spo2").value.trim(),
        }),
      });
      const data = await res.json();

      if (!data.success) {
        errorEl.textContent = data.message || "Could not save vitals.";
        return;
      }

      errorEl.style.color = "#0a7d3a";
      errorEl.textContent = "Vitals saved.";
      ["bp", "temperature", "weight", "spo2"].forEach((id) => (document.getElementById(id).value = ""));
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const user = await guardSession();
    if (!user) return;
    wireLogout();
    wireForm();
    loadQueue();

    if (window.MEDISYS_RT) {
      MEDISYS_RT.on("opd_queue", loadQueue);
      MEDISYS_RT.on("ipd_admissions", loadQueue);
    }
  });
})();
