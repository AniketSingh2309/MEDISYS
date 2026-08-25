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

  function t(key, fallback) {
    if (window.i18n && typeof window.i18n.t === 'function') {
      const res = window.i18n.t(key);
      if (res && res !== key) return res;
    }
    return fallback || key;
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
          results.innerHTML = `<p class="portal-subtitle">${t('registration.no_matching_patients', 'No matching patients found.')}</p>`;
        }
      }, 300);
    });
  }

  // Shared between wireAbhaFetch() and wireForm(): null (never attempted),
  // 'pending' (attempted but the ABHA provider was down/timed out — don't
  // block registration, just flag it for a later retry), 'not_found' (ABDM
  // confirmed no linked ABHA), or 'verified' (successfully fetched/verified).
  let abhaLinkStatus = null;

  function wireAbhaFetch() {
    const typeMobile = document.getElementById("abhaTypeMobile");
    const typeAadhaar = document.getElementById("abhaTypeAadhaar");
    const identifierInput = document.getElementById("abhaIdentifierInput");
    const fetchBtn = document.getElementById("abhaFetchBtn");
    const otpSection = document.getElementById("abhaOtpSection");
    const otpInput = document.getElementById("abhaOtpInput");
    const verifyBtn = document.getElementById("abhaVerifyBtn");
    const errorEl = document.getElementById("abhaError");
    const verifiedBadge = document.getElementById("abhaVerifiedBadge");
    const notFoundEl = document.getElementById("abhaNotFound");
    const sandboxEnrollToggle = document.getElementById("abhaSandboxEnrollToggle");
    const enrollSection = document.getElementById("abhaEnrollSection");
    const enrollAadhaarInput = document.getElementById("abhaEnrollAadhaarInput");
    const enrollFetchBtn = document.getElementById("abhaEnrollFetchBtn");

    let currentTxnId = null;
    let currentKind = null; // 'login' | 'enroll'

    function currentIdType() {
      return typeAadhaar.checked ? "aadhaar" : "mobile";
    }

    function updatePlaceholder() {
      identifierInput.placeholder =
        currentIdType() === "aadhaar" ? "Enter 12-digit Aadhaar number" : "Enter 10-digit mobile number";
      identifierInput.value = "";
      resetFlow();
    }
    typeMobile.addEventListener("change", updatePlaceholder);
    typeAadhaar.addEventListener("change", updatePlaceholder);

    function resetFlow() {
      otpSection.hidden = true;
      otpInput.value = "";
      errorEl.textContent = "";
      notFoundEl.hidden = true;
      enrollSection.hidden = true;
      verifiedBadge.hidden = true;
      currentTxnId = null;
      currentKind = null;
      abhaLinkStatus = null;
    }

    function applyProfile(profile) {
      if (profile.name) document.getElementById("fullName").value = profile.name;
      if (profile.dob) document.getElementById("dob").value = profile.dob;
      if (profile.gender) document.getElementById("gender").value = profile.gender;
      if (profile.mobile) document.getElementById("phone").value = profile.mobile;
      if (profile.address) document.getElementById("address").value = profile.address;
      document.getElementById("abhaId").value = profile.abhaNumber || "";
      document.getElementById("abhaAddress").value = profile.abhaAddress || "";

      abhaLinkStatus = "verified";
      verifiedBadge.hidden = false;
      otpSection.hidden = true;
      enrollSection.hidden = true;
      notFoundEl.hidden = true;
      errorEl.textContent = "";
      if (window.showToast) {
        showToast(
          profile.mock ? "ABHA details fetched (mock data — configure ABDM_PROVIDER for live lookups)." : "ABHA details fetched and applied.",
          "success"
        );
      }
    }

    fetchBtn.addEventListener("click", async () => {
      resetFlow();
      const type = currentIdType();
      const value = identifierInput.value.trim();
      if (!value) {
        errorEl.textContent = `Enter a ${type === "aadhaar" ? "Aadhaar" : "mobile"} number first.`;
        return;
      }

      fetchBtn.disabled = true;
      try {
        const res = await fetch("/api/abha/request-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ type, value }),
        });
        const data = await res.json();
        if (!data.success) {
          if (data.notFound) {
            abhaLinkStatus = "not_found";
            notFoundEl.hidden = false;
            return;
          }
          if (data.providerDown) abhaLinkStatus = "pending";
          errorEl.textContent = data.message || "Could not send OTP. Please try again.";
          return;
        }
        currentTxnId = data.txnId;
        currentKind = "login";
        otpSection.hidden = false;
        otpInput.focus();
        if (window.showToast) {
          showToast(data.mock ? "Mock OTP sent — use 111111." : "OTP sent to the registered mobile.", "success");
        }
      } catch (err) {
        abhaLinkStatus = "pending";
        errorEl.textContent = "Unable to reach the server. You can continue with manual registration below.";
      } finally {
        fetchBtn.disabled = false;
      }
    });

    async function doVerify(endpoint, body) {
      verifyBtn.disabled = true;
      errorEl.textContent = "";
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!data.success) {
          if (data.notFound) {
            abhaLinkStatus = "not_found";
            otpSection.hidden = true;
            notFoundEl.hidden = false;
          } else {
            if (data.providerDown) abhaLinkStatus = "pending";
            errorEl.textContent = data.message || "Verification failed. Please try again.";
          }
          return;
        }
        applyProfile(data.profile);
      } catch (err) {
        abhaLinkStatus = "pending";
        errorEl.textContent = "Unable to reach the server. You can continue with manual registration below.";
      } finally {
        verifyBtn.disabled = false;
      }
    }

    verifyBtn.addEventListener("click", () => {
      const otp = otpInput.value.trim();
      if (!otp) {
        errorEl.textContent = "Enter the OTP first.";
        return;
      }
      if (!currentTxnId) {
        errorEl.textContent = "Please fetch details again — this OTP request has expired.";
        return;
      }
      if (currentKind === "enroll") {
        doVerify("/api/abha/enroll/verify-otp", {
          txnId: currentTxnId,
          otp,
          mobile: document.getElementById("phone").value.trim() || undefined,
        });
      } else {
        doVerify("/api/abha/verify-otp", { txnId: currentTxnId, otp });
      }
    });

    // Sandbox-only test-ABHA creation — deliberately tucked behind a collapsed
    // toggle inside the "not found" box (not a primary action) so it can't be
    // mistaken for the right move on a real patient. Real patients should
    // self-create via the official ABHA app/portal (see the guidance text
    // above this toggle) — MEDISYS never creates ABHA accounts on their behalf.
    sandboxEnrollToggle.addEventListener("click", () => {
      enrollSection.hidden = !enrollSection.hidden;
      if (!enrollSection.hidden) enrollAadhaarInput.focus();
    });

    enrollFetchBtn.addEventListener("click", async () => {
      const aadhaar = enrollAadhaarInput.value.trim();
      if (!aadhaar) {
        errorEl.textContent = "Enter the Aadhaar number first.";
        return;
      }
      enrollFetchBtn.disabled = true;
      errorEl.textContent = "";
      try {
        const res = await fetch("/api/abha/enroll/request-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ aadhaar }),
        });
        const data = await res.json();
        if (!data.success) {
          if (data.providerDown) abhaLinkStatus = "pending";
          errorEl.textContent = data.message || "Could not send OTP. Please try again.";
          return;
        }
        currentTxnId = data.txnId;
        currentKind = "enroll";
        enrollSection.hidden = true;
        otpSection.hidden = false;
        otpInput.value = "";
        otpInput.focus();
        if (window.showToast) {
          showToast(data.mock ? "Mock OTP sent — use 111111." : "OTP sent to the Aadhaar-linked mobile.", "success");
        }
      } catch (err) {
        abhaLinkStatus = "pending";
        errorEl.textContent = "Unable to reach the server. You can continue with manual registration below.";
      } finally {
        enrollFetchBtn.disabled = false;
      }
    });

    // ABHA fields are hand-editable now (staff can type a patient's existing
    // ABHA straight from their card/app). If someone edits away what a
    // successful OTP fetch just filled in, the "Verified via ABHA" claim is
    // no longer true — drop it back to unverified rather than leave a stale
    // badge next to a hand-typed value.
    const abhaIdField = document.getElementById("abhaId");
    const abhaAddressField = document.getElementById("abhaAddress");
    function clearVerifiedOnManualEdit() {
      if (!verifiedBadge.hidden) {
        verifiedBadge.hidden = true;
        abhaLinkStatus = null;
      }
    }
    abhaIdField.addEventListener("input", clearVerifiedOnManualEdit);
    abhaAddressField.addEventListener("input", clearVerifiedOnManualEdit);

    updatePlaceholder();
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
        errorEl.textContent = t('registration.name_required', 'Patient name is required.');
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
            abhaAddress: document.getElementById("abhaAddress").value.trim(),
            abhaVerified: !document.getElementById("abhaVerifiedBadge").hidden,
            abhaLinkStatus,
            category: document.getElementById("category").value,
            uhid: document.getElementById("uhidCustom").value.trim(),
            password: document.getElementById("patientPasswordCustom").value.trim(),
          }),
        });
        const data = await res.json();

        if (!data.success) {
          errorEl.textContent = data.message || t('registration.error_create', 'Could not register patient. Please try again.');
          return;
        }

        form.hidden = true;
        document.getElementById("uhidOutput").value = data.patient.uhid;
        document.getElementById("patientPasswordOutput").value = data.patient.password;
        document.getElementById("patientResult").hidden = false;
        if (window.showToast) showToast(`${t('registration.patient', 'Patient')} ${fullName} ${t('registration.registered_uhid', 'registered — UHID')} ${data.patient.uhid}`, "success");
      } catch (err) {
        errorEl.textContent = t('common.server_error', 'Unable to reach the server. Please try again.');
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
      document.getElementById("abhaVerifiedBadge").hidden = true;
      document.getElementById("abhaOtpSection").hidden = true;
      document.getElementById("abhaNotFound").hidden = true;
      document.getElementById("abhaEnrollSection").hidden = true;
      document.getElementById("abhaError").textContent = "";
      document.getElementById("abhaIdentifierInput").value = "";
      abhaLinkStatus = null;
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const user = await guardSession();
    if (!user) return;
    wireLogout();
    wireSearch();
    wireAbhaFetch();
    wireForm();

    window.addEventListener("i18n:languageChanged", () => {
      if (window.i18n) window.i18n.applyTranslations();
    });
  });
})();
