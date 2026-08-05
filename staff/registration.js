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
          .map((p) => {
            const age = p.dob ? `, DOB ${new Date(p.dob).toLocaleDateString()}` : "";
            return `
              <div class="staff-entry-card">
                <div class="staff-entry-name">${escapeHtml(p.full_name)}</div>
                <div class="staff-entry-detail">${escapeHtml(p.gender || "—")}${age}</div>
                <div class="staff-entry-detail">${escapeHtml(p.phone || "—")}</div>
                <div class="staff-entry-detail">${escapeHtml(p.category || "—")}</div>
                <span class="staff-entry-userid">${escapeHtml(p.uhid)}</span>
              </div>`;
          })
          .join("");

        if (data.patients.length === 0) {
          results.innerHTML = `<p class="portal-subtitle">No matching patients found.</p>`;
        }
      }, 300);
    });
  }

  function wireForm() {
    const form = document.getElementById("patientForm");
    const errorEl = document.getElementById("patientFormError");
    const submitBtn = document.getElementById("submitPatientBtn");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      errorEl.textContent = "";

      const fullName = document.getElementById("fullName").value.trim();
      if (!fullName) {
        errorEl.textContent = "Patient name is required.";
        return;
      }

      submitBtn.disabled = true;
      try {
        const res = await fetch("/api/patients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            fullName,
            dob: document.getElementById("dob").value,
            gender: document.getElementById("gender").value,
            phone: document.getElementById("phone").value.trim(),
            address: document.getElementById("address").value.trim(),
            emergencyContactName: document.getElementById("emergencyContactName").value.trim(),
            emergencyContactPhone: document.getElementById("emergencyContactPhone").value.trim(),
            abhaId: document.getElementById("abhaId").value.trim(),
            category: document.getElementById("category").value,
            uhid: document.getElementById("uhidCustom").value.trim(),
            password: document.getElementById("patientPasswordCustom").value.trim(),
          }),
        });
        const data = await res.json();

        if (!data.success) {
          errorEl.textContent = data.message || "Could not register patient. Please try again.";
          return;
        }

        form.hidden = true;
        document.getElementById("uhidOutput").value = data.patient.uhid;
        document.getElementById("patientPasswordOutput").value = data.patient.password;
        document.getElementById("patientResult").hidden = false;
        if (window.showToast) showToast(`Patient ${fullName} registered — UHID ${data.patient.uhid}`, "success");
      } catch (err) {
        errorEl.textContent = "Unable to reach the server. Please try again.";
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
    wireCopyButton("copyUhidBtn", "uhidOutput");
    wireCopyButton("copyPatientPasswordBtn", "patientPasswordOutput");

    document.getElementById("suggestPatientPasswordBtn").addEventListener("click", () => {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
      let pw = "";
      for (let i = 0; i < 10; i++) pw += chars[Math.floor(Math.random() * chars.length)];
      document.getElementById("patientPasswordCustom").value = pw;
    });

    document.getElementById("registerAnotherBtn").addEventListener("click", () => {
      form.reset();
      form.hidden = false;
      document.getElementById("patientResult").hidden = true;
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const user = await guardSession();
    if (!user) return;
    wireLogout();
    wireSearch();
    wireForm();
  });
})();
