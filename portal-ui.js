// Shared portal chrome: moves the "Back to Dashboard" link into the header's
// top-right utility cluster as a proper button, adds a page-refresh icon button
// next to Logout, and exposes window.showToast(message, type) for success/error
// confirmations. Included on every staff/hospital/admin/patient subpage.
(function () {
  function ensureI18nAssets(callback) {
    if (!document.querySelector('link[href*="language-selector.css"]')) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/css/language-selector.css';
      document.head.appendChild(link);
    }

    var pending = 0;
    function checkDone() {
      if (pending === 0 && callback) callback();
    }

    if (!window.i18n) {
      pending++;
      var s1 = document.createElement('script');
      s1.src = '/js/language-manager.js';
      s1.onload = function () {
        if (window.i18n && typeof window.i18n.init === 'function') {
          window.i18n.init().then(function () {
            pending--;
            checkDone();
          });
        } else {
          pending--;
          checkDone();
        }
      };
      document.head.appendChild(s1);
    } else if (window.i18n && typeof window.i18n.init === 'function') {
      pending++;
      window.i18n.init().then(function () {
        pending--;
        checkDone();
      });
    }

    if (!window.MedisysLanguageSelector) {
      pending++;
      var s2 = document.createElement('script');
      s2.src = '/js/language-selector.js';
      s2.onload = function () {
        pending--;
        checkDone();
      };
      document.head.appendChild(s2);
    }

    if (pending === 0 && callback) callback();
  }

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

  function injectLanguageSelector(headerRight, logoutBtn) {
    if (document.getElementById('portalLangSelectorWrap')) return;
    if (!window.MedisysLanguageSelector) return;
    var wrap = window.MedisysLanguageSelector.createElement();
    wrap.id = 'portalLangSelectorWrap';
    if (logoutBtn) {
      logoutBtn.parentElement.insertBefore(wrap, logoutBtn);
    } else {
      headerRight.appendChild(wrap);
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
    // Translate message key if message is an i18n key path
    text.textContent = window.i18n ? window.i18n.t(message) : message;
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
    records: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/><path d="M8 13h2l1.5-3 2 6 1.5-3H16"/></svg>',
    prescription: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><g transform="rotate(45 12 12)"><rect x="4" y="9" width="16" height="6" rx="3"/><line x1="12" y1="9" x2="12" y2="15"/></g></svg>',
    bill: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h9l3 3v17H6V2z"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>',
  };

  var ROLE_NAV_ITEMS = {
    receptionist: [
      { href: '/staff/registration.html', icon: 'registration', label: 'Registration', i18nKey: 'navigation.registration' },
      { href: '/staff/opd.html', icon: 'calendar', label: 'OPD Queue', i18nKey: 'navigation.opd_queue' },
      { href: '/staff/ipd-admission.html', icon: 'admission', label: 'Admission', i18nKey: 'navigation.admission' },
    ],
    nurse: [
      { href: '/staff/vitals.html', icon: 'vitals', label: 'OPD Vitals', i18nKey: 'navigation.opd_vitals' },
      { href: '/staff/ward-setup.html', icon: 'ward', label: 'Ward & Bed', i18nKey: 'navigation.ward_bed' },
      { href: '/staff/bed-allocation.html', icon: 'bed', label: 'Bed Allocation', i18nKey: 'navigation.bed_allocation' },
      { href: '/staff/nurse-ipd.html', icon: 'admission', label: 'IPD Patients', i18nKey: 'navigation.ipd_patients' },
      { href: '/staff/nurse-patients.html', icon: 'queue', label: 'My Patients', i18nKey: 'navigation.my_patients' },
      { href: '/staff/nurse-all-patients.html', icon: 'queue', label: 'All Patients', i18nKey: 'navigation.all_patients' },
    ],
    doctor: [
      { href: '/staff/doctor-schedule.html', icon: 'clock', label: 'My Schedule', i18nKey: 'navigation.my_schedule' },
      { href: '/staff/doctor-queue.html', icon: 'queue', label: 'My Queue', i18nKey: 'navigation.my_queue' },
      { href: '/staff/doctor-ipd.html', icon: 'admission', label: 'IPD Rounds', i18nKey: 'navigation.ipd_rounds' },
      { href: '/staff/doctor-patients.html', icon: 'registration', label: 'My Patients', i18nKey: 'navigation.my_patients' },
    ],
    pharmacist: [{ href: '/staff/pharmacy-queue.html', icon: 'queue', label: 'Pharmacy Queue', i18nKey: 'navigation.pharmacy_queue' }],
    blood_bank_staff: [{ href: '/staff/blood-bank-queue.html', icon: 'bloodbank', label: 'Blood Bank', i18nKey: 'navigation.blood_bank' }],
    patient: [
      { href: '/patient/records.html', icon: 'records', label: 'Medical Records', i18nKey: 'navigation.medical_records' },
      { href: '/patient/appointments.html', icon: 'calendar', label: 'Appointments', i18nKey: 'navigation.appointments' },
      { href: '/patient/prescriptions.html', icon: 'prescription', label: 'Prescriptions', i18nKey: 'navigation.prescriptions' },
      { href: '/patient/bills.html', icon: 'bill', label: 'Bills & Invoices', i18nKey: 'navigation.billing' },
    ],
  };

  var ROLE_DASHBOARD = { patient: '/patient/dashboard.html' };

  function navItemsForRole(role, details) {
    var dash = { href: ROLE_DASHBOARD[role] || '/staff/dashboard.html', icon: 'dashboard', label: 'Dashboard', i18nKey: 'navigation.dashboard' };
    var items;
    if (role === 'pathology_staff') {
      items =
        details && details.designation === 'Radiologist'
          ? [{ href: '/staff/radiology-queue.html', icon: 'queue', label: 'Radiology Queue', i18nKey: 'navigation.radiology_queue' }]
          : [{ href: '/staff/pathology-queue.html', icon: 'queue', label: 'Pathology & Lab', i18nKey: 'navigation.pathology_lab' }];
    } else {
      items = ROLE_NAV_ITEMS[role] || [];
    }
    return [dash].concat(items);
  }

  function injectSidebar() {
    var main = document.querySelector('.portal-main');
    if (!main || document.querySelector('.app-sidebar')) return;

    var KNOWN_ROLES = ['receptionist', 'nurse', 'doctor', 'pathology_staff', 'pharmacist', 'blood_bank_staff', 'patient'];
    fetch('/api/session', { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (sessionData) {
        var role = sessionData.user && sessionData.user.role;
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
        eyebrow.setAttribute('data-i18n', 'common.navigate');
        eyebrow.textContent = window.i18n ? window.i18n.t('common.navigate') : 'Navigate';
        aside.appendChild(eyebrow);

        items.forEach(function (item) {
          var a = document.createElement('a');
          a.href = item.href;
          a.className = 'app-sidebar-link' + (currentPath === item.href ? ' active' : '');
          var translatedLabel = window.i18n && item.i18nKey ? window.i18n.t(item.i18nKey) : item.label;
          a.title = translatedLabel;
          a.innerHTML =
            '<span class="app-sidebar-icon">' + (NAV_ICONS[item.icon] || '') + '</span>' +
            '<span class="app-sidebar-label" ' + (item.i18nKey ? 'data-i18n="' + item.i18nKey + '"' : '') + '>' + translatedLabel + '</span>';
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

  function initPortalUi() {
    const headerRight = document.querySelector('.portal-header-right') || document.querySelector('.topbar-right');
    const logoutBtn = document.getElementById('logoutBtn');
    if (headerRight) {
      relocateBackLink(headerRight);
      injectRefreshButton(headerRight, logoutBtn);
      injectLanguageSelector(headerRight, logoutBtn);
    }
    injectSidebar();
    if (window.i18n) {
      window.i18n.applyTranslations();
    }
  }

  window.addEventListener('i18n:languageChanged', function () {
    if (window.i18n) {
      window.i18n.applyTranslations();
    }
  });

  document.addEventListener('DOMContentLoaded', function () {
    ensureI18nAssets(function () {
      initPortalUi();
    });
  });
})();

