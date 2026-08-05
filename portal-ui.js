// Shared portal chrome: moves the "Back to Dashboard" link into the header's
// top-right utility cluster as a proper button, adds a page-refresh icon button
// next to Logout, and exposes window.showToast(message, type) for success/error
// confirmations. Included on every staff/hospital/admin/patient subpage.
(function () {
  function refreshIconSvg() {
    return '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.9-6.6"/><path d="M21 4v6h-6"/></svg>';
  }

  function relocateBackLink(headerRight) {
    const backLink = document.querySelector('.portal-back-link');
    if (!backLink || backLink.dataset.portalUiMoved) return;
    backLink.dataset.portalUiMoved = 'true';
    backLink.classList.add('portal-back-btn');
    headerRight.insertBefore(backLink, headerRight.firstChild);
  }

  function injectRefreshButton(headerRight, logoutBtn) {
    if (document.getElementById('portalRefreshBtn')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'portalRefreshBtn';
    btn.title = 'Refresh this page';
    btn.setAttribute('aria-label', 'Refresh');
    btn.innerHTML = refreshIconSvg();
    btn.className = (logoutBtn && logoutBtn.className ? logoutBtn.className : 'portal-logout-btn') + ' portal-refresh-btn';
    btn.addEventListener('click', function () {
      btn.classList.add('portal-refresh-spinning');
      window.location.reload();
    });
    if (logoutBtn) {
      logoutBtn.parentElement.insertBefore(btn, logoutBtn);
    } else {
      headerRight.appendChild(btn);
    }
  }

  function ensureToastContainer() {
    let el = document.getElementById('toastContainer');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toastContainer';
      el.className = 'toast-container';
      document.body.appendChild(el);
    }
    return el;
  }

  window.showToast = function (message, type) {
    const container = ensureToastContainer();
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + (type || 'success');
    const icon = document.createElement('span');
    icon.className = 'toast-icon';
    icon.textContent = type === 'error' ? '⚠' : '✓';
    const text = document.createElement('span');
    text.className = 'toast-message';
    text.textContent = message;
    toast.appendChild(icon);
    toast.appendChild(text);
    container.appendChild(toast);
    requestAnimationFrame(function () {
      toast.classList.add('toast-show');
    });
    const AUTO_DISMISS_MS = 4200;
    const remove = function () {
      toast.classList.remove('toast-show');
      setTimeout(function () {
        toast.remove();
      }, 250);
    };
    const timer = setTimeout(remove, AUTO_DISMISS_MS);
    toast.addEventListener('click', function () {
      clearTimeout(timer);
      remove();
    });
  };

  document.addEventListener('DOMContentLoaded', function () {
    // Classic header: <div class="portal-header-right">...<button id="logoutBtn">
    // Custom queue-page header: <div class="topbar-right">...<button id="logoutBtn">
    const headerRight = document.querySelector('.portal-header-right') || document.querySelector('.topbar-right');
    const logoutBtn = document.getElementById('logoutBtn');
    if (headerRight) {
      relocateBackLink(headerRight);
      injectRefreshButton(headerRight, logoutBtn);
    }
  });
})();
