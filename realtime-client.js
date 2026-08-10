// Real-time push client, shared across every page in the app. Loaded right
// after the Socket.IO client script (/socket.io/socket.io.js, auto-served by
// the backend) and right before each page's own JS file.
//
// It does two things:
//   1. Opens one Socket.IO connection per page, authenticated by the same
//      session cookie every REST call already uses (no login payload needed
//      - the server reads req.session off the handshake and joins this
//      socket to the right hospital/user rooms).
//   2. Exposes window.MEDISYS_RT.on(resource, callback) - a tiny pub-sub
//      wrapper so page JS can say "when pharmacy_orders changes, re-run my
//      existing loader" without touching Socket.IO directly.
//
// If the socket is ever unavailable (offline, server restarting), pages
// simply keep working off their normal REST calls / fallback poll timers -
// this is purely additive, never a hard dependency.
(function () {
  // portal-ui.js defines a richer window.showToast on pages that load it (and
  // overwrites this immediately, since it loads right after this file with no
  // DOMContentLoaded gate). Pages that don't load portal-ui.js (Billing Desk,
  // Blood Bank) still get a working toast, reusing the same .toast-container/
  // .toast CSS classes (defined in admin/admin.css, which every page links).
  if (!window.showToast) {
    window.showToast = function (message, type) {
      let container = document.getElementById("toastContainer");
      if (!container) {
        container = document.createElement("div");
        container.id = "toastContainer";
        container.className = "toast-container";
        document.body.appendChild(container);
      }
      const toast = document.createElement("div");
      toast.className = "toast toast-" + (type || "success");
      const icon = document.createElement("span");
      icon.className = "toast-icon";
      icon.textContent = type === "error" ? "⚠" : "✓";
      const text = document.createElement("span");
      text.className = "toast-message";
      text.textContent = message;
      toast.appendChild(icon);
      toast.appendChild(text);
      container.appendChild(toast);
      requestAnimationFrame(() => toast.classList.add("toast-show"));
      const remove = () => {
        toast.classList.remove("toast-show");
        setTimeout(() => toast.remove(), 250);
      };
      const timer = setTimeout(remove, 4200);
      toast.addEventListener("click", () => {
        clearTimeout(timer);
        remove();
      });
    };
  }

  const listeners = {}; // resource -> [callback, ...]

  function dispatch(payload) {
    if (!payload || !payload.resource) return;
    const cbs = listeners[payload.resource];
    if (!cbs) return;
    cbs.forEach((cb) => {
      try {
        cb(payload);
      } catch (err) {
        console.error("MEDISYS_RT listener error for " + payload.resource + ":", err);
      }
    });
  }

  window.MEDISYS_RT = {
    socket: null,
    on(resource, callback) {
      if (!listeners[resource]) listeners[resource] = [];
      listeners[resource].push(callback);
    },
  };

  fetch("/api/session", { credentials: "same-origin" })
    .then((r) => r.json())
    .then((data) => {
      if (!data || !data.user) return; // not logged in - nothing to connect
      if (typeof io !== "function") return; // socket.io client script didn't load
      const socket = io({ withCredentials: true });
      window.MEDISYS_RT.socket = socket;
      socket.on("data:changed", dispatch);
    })
    .catch(() => {});
})();
