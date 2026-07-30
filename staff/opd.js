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

  let selectedPatient = null;
  let selectedSlot = null;

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

  function wireSearch() {
    const input = document.getElementById("patientSearch");
    const results = document.getElementById("searchResults");
    let debounceTimer;

    input.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      const q = input.value.trim();
      if (!q) {
        results.innerHTML = "";
        return;
      }
      debounceTimer = setTimeout(async () => {
        const res = await fetch(`/api/patients/search?q=${encodeURIComponent(q)}`, {
          credentials: "same-origin",
        });
        const data = await res.json();
        if (!data.success) return;

        results.innerHTML = data.patients
          .map(
            (p) => `
            <div class="staff-entry-card portal-row" data-uhid="${escapeHtml(p.uhid)}" data-name="${escapeHtml(p.full_name)}" tabindex="0">
              <div class="staff-entry-name">${escapeHtml(p.full_name)}</div>
              <div class="staff-entry-detail">${escapeHtml(p.phone || "—")}</div>
              <span class="staff-entry-userid">${escapeHtml(p.uhid)}</span>
            </div>`
          )
          .join("");

        if (data.patients.length === 0) {
          results.innerHTML = `<p class="portal-subtitle">No matching patients found.</p>`;
        }

        results.querySelectorAll(".portal-row").forEach((card) => {
          card.addEventListener("click", () => {
            selectedPatient = { uhid: card.dataset.uhid, fullName: card.dataset.name };
            document.getElementById("selectedPatientHint").textContent = `Selected: ${selectedPatient.fullName} (${selectedPatient.uhid})`;
            document.getElementById("bookingSection").hidden = false;
            loadSlots();
          });
        });
      }, 300);
    });
  }

  async function loadDepartments() {
    const res = await fetch("/api/departments", { credentials: "same-origin" });
    const data = await res.json();
    if (!data.success) return;
    const select = document.getElementById("departmentSelect");
    select.innerHTML =
      `<option value="">All Departments</option>` +
      data.departments.map((d) => `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join("");
  }

  async function loadDoctors() {
    const departmentId = document.getElementById("departmentSelect").value;
    const url = departmentId
      ? `/api/opd/doctors?departmentId=${encodeURIComponent(departmentId)}`
      : "/api/opd/doctors";
    const res = await fetch(url, { credentials: "same-origin" });
    const data = await res.json();
    if (!data.success) return;
    const select = document.getElementById("doctorSelect");
    select.innerHTML = data.doctors.length
      ? data.doctors
          .map((d) => `<option value="${escapeHtml(d.user_id)}">${escapeHtml(d.full_name)}</option>`)
          .join("")
      : `<option value="">No doctors in this department</option>`;
    loadSlots();
  }

  async function loadSlots() {
    const doctorUserId = document.getElementById("doctorSelect").value;
    const visitDate = document.getElementById("visitDate").value;
    const slotGrid = document.getElementById("slotGrid");
    const bookBtn = document.getElementById("bookSlotBtn");
    selectedSlot = null;
    bookBtn.disabled = true;

    if (!doctorUserId || !visitDate) {
      slotGrid.innerHTML = "";
      return;
    }

    const res = await fetch(
      `/api/opd/slots?doctorUserId=${encodeURIComponent(doctorUserId)}&date=${encodeURIComponent(visitDate)}`,
      { credentials: "same-origin" }
    );
    const data = await res.json();
    if (!data.success) return;

    slotGrid.innerHTML = data.slots.length
      ? data.slots
          .map((s) => `<button type="button" class="slot-btn" data-slot="${escapeHtml(s)}">${escapeHtml(s)}</button>`)
          .join("")
      : `<p class="portal-subtitle">No schedule set for this doctor on this day.</p>`;

    slotGrid.querySelectorAll(".slot-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        slotGrid.querySelectorAll(".slot-btn").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        selectedSlot = btn.dataset.slot;
        bookBtn.disabled = false;
      });
    });
  }

  async function bookVisit(slotTime) {
    const errorEl = document.getElementById("opdFormError");
    errorEl.textContent = "";

    if (!selectedPatient) {
      errorEl.textContent = "Please search for and select a patient first.";
      return;
    }

    const doctorUserId = document.getElementById("doctorSelect").value;
    const visitDate = document.getElementById("visitDate").value;
    if (!doctorUserId || !visitDate) {
      errorEl.textContent = "Please pick a doctor and date.";
      return;
    }

    try {
      const res = await fetch("/api/opd/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          patientUhid: selectedPatient.uhid,
          doctorUserId,
          visitDate,
          slotTime: slotTime || undefined,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        errorEl.textContent = data.message || "Could not book visit. Please try again.";
        return;
      }

      document.getElementById("bookingConfirmation").textContent = `Token #${data.visit.tokenNumber} issued. ${data.confirmation}`;
      loadSlots();
      loadQueue();
    } catch (err) {
      errorEl.textContent = "Unable to reach the server. Please try again.";
    }
  }

  async function loadQueue() {
    const res = await fetch("/api/opd/queue", { credentials: "same-origin" });
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
      .map(
        (v) => `<tr>
          <td>#${v.token_number}</td>
          <td>${escapeHtml(v.patient_name || v.patient_uhid)}</td>
          <td>${escapeHtml(v.doctor_name || v.doctor_user_id)}</td>
          <td>${escapeHtml(v.slot_time || "Walk-in")}</td>
          <td><span class="queue-status ${escapeHtml(v.status)}">${escapeHtml(v.status)}</span></td>
        </tr>`
      )
      .join("");
  }

  async function loadNeedsAdmission() {
    const res = await fetch("/api/ipd/admissions?status=requested", { credentials: "same-origin" });
    const data = await res.json();
    const tbody = document.getElementById("needsAdmissionTableBody");
    const emptyState = document.getElementById("needsAdmissionEmptyState");

    if (!data.success || data.admissions.length === 0) {
      tbody.innerHTML = "";
      emptyState.hidden = false;
      return;
    }
    emptyState.hidden = true;

    tbody.innerHTML = data.admissions
      .map(
        (a) => `<tr>
          <td>${escapeHtml(a.patient_name || a.patient_uhid)}</td>
          <td>${escapeHtml(a.doctor_name || a.admitting_doctor_user_id || "—")}</td>
          <td>${escapeHtml(new Date(a.created_at).toLocaleString())}</td>
          <td><span class="queue-status waiting">awaiting bed</span></td>
        </tr>`
      )
      .join("");
  }

  async function loadWardPatients() {
    const res = await fetch("/api/ipd/admissions?status=admitted", { credentials: "same-origin" });
    const data = await res.json();
    const tbody = document.getElementById("wardPatientsTableBody");
    const emptyState = document.getElementById("wardPatientsEmptyState");

    if (!data.success || data.admissions.length === 0) {
      tbody.innerHTML = "";
      emptyState.hidden = false;
      return;
    }
    emptyState.hidden = true;

    tbody.innerHTML = data.admissions
      .map(
        (a) => `<tr>
          <td>${escapeHtml(a.patient_name || a.patient_uhid)}</td>
          <td>${escapeHtml(a.doctor_name || a.admitting_doctor_user_id || "—")}</td>
          <td>${escapeHtml(a.ward_name || "—")}</td>
          <td>${escapeHtml(a.bed_number || "—")}</td>
          <td>${escapeHtml(a.admitted_at ? new Date(a.admitted_at).toLocaleString() : "—")}</td>
        </tr>`
      )
      .join("");
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const user = await guardSession();
    if (!user) return;
    wireLogout();
    wireSearch();
    loadQueue();
    loadNeedsAdmission();
    loadWardPatients();

    document.getElementById("visitDate").value = new Date().toISOString().slice(0, 10);
    document.getElementById("departmentSelect").addEventListener("change", loadDoctors);
    document.getElementById("doctorSelect").addEventListener("change", loadSlots);
    document.getElementById("visitDate").addEventListener("change", loadSlots);
    document.getElementById("bookSlotBtn").addEventListener("click", () => bookVisit(selectedSlot));
    document.getElementById("walkInBtn").addEventListener("click", () => bookVisit(null));

    await loadDepartments();
    await loadDoctors();
  });
})();
