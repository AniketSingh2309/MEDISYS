// Shared telemedicine video-call modal — Jitsi Meet embedded via the free
// public meet.jit.si server (no account/API key needed). Used by both the
// patient portal (patient/appointments.js) and the doctor's consultation
// split-screen (staff/doctor-queue.js).
//
// Security note: meet.jit.si has no access control of its own — anyone who
// knows a room name can join it. The actual room slug is therefore always a
// random, unguessable token minted server-side per visit (see
// POST /api/telemedicine/verify-payment and GET /api/opd/visits/:id/meeting-room
// in server/server.js) and fetched just-in-time here — it's never derived
// from the visit id or anything else guessable, even though the on-screen
// "subject" is deliberately human-readable ("MEDISYS TELE VISIT {id}").
(function () {
  let apiScriptPromise = null;
  function ensureJitsiScript() {
    if (window.JitsiMeetExternalAPI) return Promise.resolve();
    if (apiScriptPromise) return apiScriptPromise;
    apiScriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://meet.jit.si/external_api.js";
      s.onload = resolve;
      s.onerror = () => reject(new Error("Could not load the video call service. Check your connection."));
      document.head.appendChild(s);
    });
    return apiScriptPromise;
  }

  function t(key, fallback) {
    if (window.i18n && typeof window.i18n.t === "function") {
      const res = window.i18n.t(key);
      if (res && res !== key) return res;
    }
    return fallback || key;
  }

  // opts: { visitId, displayName, containerEl (optional — embed inline instead
  // of a full-page modal, used by the doctor's split-screen pane) }
  async function openTelemedicineCall(opts) {
    const inline = Boolean(opts.containerEl);
    let overlay, closeBtn, statusEl, mountEl;

    if (inline) {
      mountEl = opts.containerEl;
      mountEl.innerHTML = `<p class="wizard-hint jitsi-status">${t("tele.connecting", "Connecting…")}</p><div class="jitsi-mount"></div>`;
      statusEl = mountEl.querySelector(".jitsi-status");
      mountEl = mountEl.querySelector(".jitsi-mount");
    } else {
      overlay = document.createElement("div");
      overlay.className = "jitsi-modal-overlay";
      overlay.innerHTML = `
        <div class="jitsi-modal">
          <div class="jitsi-modal-header">
            <span>📹 ${t("tele.live_call_title", "Live Telemedicine Video Call")}</span>
            <button type="button" class="jitsi-modal-close" aria-label="Close">&times;</button>
          </div>
          <p class="wizard-hint jitsi-status" style="padding: 8px 16px 0;">${t("tele.connecting", "Connecting…")}</p>
          <div class="jitsi-mount"></div>
        </div>`;
      document.body.appendChild(overlay);
      closeBtn = overlay.querySelector(".jitsi-modal-close");
      statusEl = overlay.querySelector(".jitsi-status");
      mountEl = overlay.querySelector(".jitsi-mount");
    }

    let api = null;
    function cleanup() {
      if (api) {
        try {
          api.dispose();
        } catch {
          /* already gone */
        }
        api = null;
      }
      if (overlay) overlay.remove();
      if (opts.onClose) opts.onClose();
    }

    if (closeBtn) closeBtn.addEventListener("click", cleanup);
    if (overlay) {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) cleanup();
      });
    }

    try {
      const [, roomRes] = await Promise.all([
        ensureJitsiScript(),
        fetch(`/api/opd/visits/${opts.visitId}/meeting-room`, { credentials: "same-origin" }).then((r) => r.json()),
      ]);
      if (!roomRes.success) {
        statusEl.textContent = roomRes.message || t("tele.could_not_join_call", "Could not join this call.");
        return;
      }

      statusEl.remove();
      api = new window.JitsiMeetExternalAPI("meet.jit.si", {
        roomName: roomRes.meetingRoom,
        parentNode: mountEl,
        width: "100%",
        height: "100%",
        userInfo: { displayName: opts.displayName || "" },
        configOverwrite: {
          subject: roomRes.subject,
          prejoinPageEnabled: true,
          disableDeepLinking: true,
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: ["microphone", "camera", "invite", "select-background", "settings", "hangup"],
        },
      });
      api.on("readyToClose", cleanup);
    } catch (err) {
      statusEl.textContent = err.message || t("tele.could_not_join_call", "Could not join this call.");
    }

    return { close: cleanup };
  }

  window.MedisysTelemedicine = { openTelemedicineCall };
})();
