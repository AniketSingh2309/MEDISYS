/*
 * MEDISYS Voice Dictation widget (AI4Bharat).
 * Shared by staff/doctor-queue.js (OPD consult) and staff/doctor-ipd.js
 * (round notes) — records mic audio, sends it to POST /api/voice/prescribe,
 * and hands the structured result back to the caller to fill into its own
 * form fields. Include this script tag before the page's own script.
 */
(function () {
  const LANGUAGES = [
    ["hi", "Hindi"], ["bn", "Bengali"], ["ta", "Tamil"], ["te", "Telugu"],
    ["mr", "Marathi"], ["gu", "Gujarati"], ["kn", "Kannada"], ["ml", "Malayalam"],
    ["pa", "Punjabi"], ["or", "Odia"], ["en", "English"],
  ];

  // Matches the inline-SVG icon language used everywhere else in MEDISYS
  // (stroke="currentColor", viewBox 24x24) instead of an emoji — emoji mic
  // icons render inconsistently (tiny/low-contrast) across OSes and browsers.
  const MIC_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v1a7 7 0 0 0 14 0v-1"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>`;
  const STOP_ICON = `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>`;

  /**
   * Renders a "language select + dictate button" control into `container`
   * and calls `onResult(data)` with the service's JSON response once a
   * recording is transcribed. `onError(message)` is called on failure.
   */
  function mount(container, { onResult, onError, onStart, onStop } = {}) {
    container.classList.add("voice-dictate-widget");
    container.innerHTML = `
      <select class="voice-dictate-lang"></select>
      <button type="button" class="wizard-suggest-btn voice-dictate-btn">${MIC_ICON}<span>Dictate (AI)</span></button>
      <span class="voice-dictate-status" aria-live="polite"></span>
    `;
    const select = container.querySelector(".voice-dictate-lang");
    const button = container.querySelector(".voice-dictate-btn");
    const status = container.querySelector(".voice-dictate-status");
    LANGUAGES.forEach(([code, label]) => {
      const opt = document.createElement("option");
      opt.value = code;
      opt.textContent = label;
      if (code === "hi") opt.selected = true;
      select.appendChild(opt);
    });

    let recorder = null;
    let chunks = [];
    let recording = false;

    async function startRecording() {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks = [];
      recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        await submitRecording(new Blob(chunks, { type: "audio/webm" }));
      };
      recorder.start();
      recording = true;
      button.innerHTML = `${STOP_ICON}<span>Stop &amp; Transcribe</span>`;
      button.classList.add("voice-mic-recording");
      status.textContent = "Recording…";
      if (onStart) onStart();
    }

    async function submitRecording(blob) {
      status.textContent = "Transcribing…";
      button.disabled = true;
      try {
        const body = new FormData();
        body.append("language", select.value);
        body.append("audio", blob, "dictation.webm");
        const res = await fetch("/api/voice/prescribe", { method: "POST", credentials: "same-origin", body });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Transcription failed.");
        }
        status.textContent = "Applied to form — please review.";
        if (onResult) onResult(data);
      } catch (err) {
        status.textContent = "";
        if (onError) onError(err.message || "Voice dictation failed.");
      } finally {
        button.disabled = false;
        button.innerHTML = `${MIC_ICON}<span>Dictate (AI)</span>`;
        button.classList.remove("voice-mic-recording");
        recording = false;
        if (onStop) onStop();
      }
    }

    button.addEventListener("click", () => {
      if (recording) {
        recorder.stop();
      } else {
        startRecording().catch((err) => {
          status.textContent = "";
          if (onError) onError(err.message || "Microphone access denied.");
        });
      }
    });
  }

  /**
   * Fills a <select> with the supported language options (in place — the
   * page owns the element and its id/wiring). Used by pages that want one
   * shared language choice for several independent mic buttons, rather
   * than the all-in-one `mount()` widget above.
   */
  function renderLanguageOptions(select, { defaultCode = "hi" } = {}) {
    LANGUAGES.forEach(([code, label]) => {
      const opt = document.createElement("option");
      opt.value = code;
      opt.textContent = label;
      if (code === defaultCode) opt.selected = true;
      select.appendChild(opt);
    });
  }

  /**
   * Turns an existing icon-only <button> into a self-contained mic control:
   * click to record, click again to stop and transcribe. Unlike `mount()`,
   * this doesn't render its own language picker or fill multiple fields —
   * the caller supplies `getLanguage()` and decides what to do with the
   * transcript in `onResult(data)`. Several of these can sit on one page,
   * each scoped to a single field.
   */
  function attachMic(button, { getLanguage, onResult, onError, onStatus } = {}) {
    // The icon itself never changes — idle vs. recording is communicated by
    // the .voice-mic-recording class alone (red fill + pulse, see admin.css),
    // the same way a native OS mic indicator works. Previously this swapped
    // button.textContent between "🎙️"/"⏹️" emoji, which both looked
    // inconsistent across platforms and would have silently broken once the
    // button held an SVG icon instead of emoji text (textContent of an
    // element containing only an <svg> is "", so the "idle" label restored
    // after recording would have gone blank).
    button.innerHTML = MIC_ICON;
    let recorder = null;
    let chunks = [];
    let recording = false;

    function setStatus(text) {
      if (onStatus) onStatus(text);
    }

    async function startRecording() {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks = [];
      recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        await submitRecording(new Blob(chunks, { type: "audio/webm" }));
      };
      recorder.start();
      recording = true;
      button.classList.add("voice-mic-recording");
      button.setAttribute("aria-label", (button.getAttribute("aria-label") || "Dictate") + " (recording — click to stop)");
      setStatus("Recording…");
    }

    async function submitRecording(blob) {
      setStatus("Transcribing…");
      button.disabled = true;
      try {
        const body = new FormData();
        body.append("language", (getLanguage && getLanguage()) || "hi");
        body.append("audio", blob, "dictation.webm");
        const res = await fetch("/api/voice/prescribe", { method: "POST", credentials: "same-origin", body });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Transcription failed.");
        }
        setStatus("");
        if (onResult) onResult(data);
      } catch (err) {
        setStatus("");
        if (onError) onError(err.message || "Voice dictation failed.");
      } finally {
        button.disabled = false;
        button.classList.remove("voice-mic-recording");
        button.setAttribute("aria-label", (button.getAttribute("aria-label") || "Dictate").replace(" (recording — click to stop)", ""));
        recording = false;
      }
    }

    button.addEventListener("click", () => {
      if (recording) {
        recorder.stop();
      } else {
        startRecording().catch((err) => {
          setStatus("");
          if (onError) onError(err.message || "Microphone access denied.");
        });
      }
    });
  }

  window.MedisysVoice = { mount, renderLanguageOptions, attachMic };
})();
