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

  // ---- Persistent sidebar app-shell (staff/*.html pages only) ----
  // Same set of tools per role as staff.js's dashboard cards, just always
  // visible for cross-navigation instead of only reachable from the dashboard.
  var NAV_ICONS = {
    dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/></svg>',
    registration: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/><path d="M9 13l2 2 4-4"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>',
    admission: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3v5a3 3 0 0 0 6 0V3"/><path d="M12 11v4a5 5 0 0 0 10 0v-2"/><circle cx="21" cy="10" r="1.6"/></svg>',
    vitals: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l2-7 4 14 2-7h6"/></svg>',
    ward: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V8l9-5 9 5v13M9 21v-6h6v6"/></svg>',
    bed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M3 18h18M3 18v2M21 18v2M6 10V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
    queue: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="3"/><circle cx="16" cy="9" r="2.6"/><path d="M2.5 20c0-3.3 2.6-5.6 5.5-5.6s5.5 2.3 5.5 5.6M14.5 14.9c2.4.2 4.5 2.3 4.5 5.1"/></svg>',
    bloodbank: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c-4 5-6 8.5-6 11a6 6 0 0 0 12 0c0-2.5-2-6-6-11z"/></svg>',
  };

  var ROLE_NAV_ITEMS = {
    receptionist: [
      { href: '/staff/registration.html', icon: 'registration', label: 'Registration' },
      { href: '/staff/opd.html', icon: 'calendar', label: 'OPD Queue' },
      { href: '/staff/ipd-admission.html', icon: 'admission', label: 'Admission' },
    ],
    nurse: [
      { href: '/staff/vitals.html', icon: 'vitals', label: 'OPD Vitals' },
      { href: '/staff/ward-setup.html', icon: 'ward', label: 'Ward & Bed' },
      { href: '/staff/bed-allocation.html', icon: 'bed', label: 'Bed Allocation' },
      { href: '/staff/nurse-ipd.html', icon: 'admission', label: 'IPD Patients' },
      { href: '/staff/nurse-patients.html', icon: 'queue', label: 'My Patients' },
    ],
    doctor: [
      { href: '/staff/doctor-schedule.html', icon: 'clock', label: 'My Schedule' },
      { href: '/staff/doctor-queue.html', icon: 'queue', label: 'My Queue' },
      { href: '/staff/doctor-ipd.html', icon: 'admission', label: 'IPD Rounds' },
      { href: '/staff/doctor-patients.html', icon: 'registration', label: 'My Patients' },
    ],
    pharmacist: [{ href: '/staff/pharmacy-queue.html', icon: 'queue', label: 'Pharmacy Queue' }],
    blood_bank_staff: [{ href: '/staff/blood-bank-queue.html', icon: 'bloodbank', label: 'Blood Bank' }],
  };

  function navItemsForRole(role, details) {
    var dash = { href: '/staff/dashboard.html', icon: 'dashboard', label: 'Dashboard' };
    var items;
    if (role === 'pathology_staff') {
      items =
        details && details.designation === 'Radiologist'
          ? [{ href: '/staff/radiology-queue.html', icon: 'queue', label: 'Radiology Queue' }]
          : [{ href: '/staff/pathology-queue.html', icon: 'queue', label: 'Pathology & Lab' }];
    } else {
      items = ROLE_NAV_ITEMS[role] || [];
    }
    return [dash].concat(items);
  }

  function injectSidebar() {
    var main = document.querySelector('.portal-main');
    // Skip pages that don't use the classic shell (login, radiology/pathology
    // queue pages already have their own bespoke sidebar) or if already injected.
    if (!main || document.querySelector('.app-sidebar')) return;

    var KNOWN_ROLES = ['receptionist', 'nurse', 'doctor', 'pathology_staff', 'pharmacist', 'blood_bank_staff'];
    fetch('/api/session', { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (sessionData) {
        var role = sessionData.user && sessionData.user.role;
        // Allow-list, not a deny-list — new/unmapped roles (superadmin, hospital_admin,
        // billing_staff, patient, ...) get no sidebar rather than a broken/empty one.
        if (!sessionData.user || KNOWN_ROLES.indexOf(role) === -1) return null;
        if (role !== 'pathology_staff') return { role: role, details: null };
        return fetch('/api/me', { credentials: 'same-origin' })
          .then(function (r) { return r.json(); })
          .then(function (meData) {
            return { role: role, details: meData.success ? meData.profile.details : null };
          });
      })
      .then(function (info) {
        if (!info) return;
        var items = navItemsForRole(info.role, info.details);
        var currentPath = window.location.pathname.replace(/\/+$/, '');

        var aside = document.createElement('aside');
        aside.className = 'app-sidebar';
        var eyebrow = document.createElement('div');
        eyebrow.className = 'app-sidebar-eyebrow';
        eyebrow.textContent = 'Navigate';
        aside.appendChild(eyebrow);

        items.forEach(function (item) {
          var a = document.createElement('a');
          a.href = item.href;
          a.className = 'app-sidebar-link' + (currentPath === item.href ? ' active' : '');
          a.title = item.label;
          a.innerHTML =
            '<span class="app-sidebar-icon">' + (NAV_ICONS[item.icon] || '') + '</span>' +
            '<span class="app-sidebar-label">' + item.label + '</span>';
          aside.appendChild(a);
        });

        var shell = document.createElement('div');
        shell.className = 'app-shell';
        main.parentNode.insertBefore(shell, main);
        shell.appendChild(aside);
        shell.appendChild(main);
      })
      .catch(function () {});
  }

  document.addEventListener('DOMContentLoaded', function () {
    // Classic header: <div class="portal-header-right">...<button id="logoutBtn">
    // Custom queue-page header: <div class="topbar-right">...<button id="logoutBtn">
    const headerRight = document.querySelector('.portal-header-right') || document.querySelector('.topbar-right');
    const logoutBtn = document.getElementById('logoutBtn');
    if (headerRight) {
      relocateBackLink(headerRight);
      injectRefreshButton(headerRight, logoutBtn);
    }
    injectSidebar();
  });
})();
