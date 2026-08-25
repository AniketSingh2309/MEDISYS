const DEPT_COLORS = { OPD: '#1b2f6e', IPD: '#2A4E85', Pathology: '#106349', Radiology: '#5A3E99', Pharmacy: '#9A3A29', Misc: '#5D6C63', Emergency: '#9A3A29' };
const MODE_COLORS = { Cash: '#1b2f6e', Card: '#2A4E85', UPI: '#106349', 'Insurance / TPA': '#5A3E99', Cheque: '#9A3A29', 'Net Banking': '#142357' };
const AVATAR_COLORS = ['#1b2f6e', '#2A4E85', '#106349', '#5A3E99', '#9A3A29', '#142357'];

let sessionUser = null;
let bills = [];
let payments = [];
let tariff = [];
let doctors = [];
let patients = [];
let currentItems = [];
let selectedPatient = null;
let currentBillsFilter = 'all';

/* ============================================================
   SESSION / API
============================================================ */
async function guardSession() {
  const res = await fetch('/api/session', { credentials: 'same-origin' });
  const data = await res.json();
  // hospital_admin gets read/oversight access too, mirroring the backend
  // (several billing routes already allow role === 'hospital_admin') —
  // staff-only mutation endpoints still enforce billing_staff server-side.
  if (!data.user || (data.user.role !== 'billing_staff' && data.user.role !== 'hospital_admin')) {
    window.location.href = '../index.html';
    return null;
  }
  sessionUser = data.user;
  document.getElementById('portalUser').textContent = data.user.fullName || data.user.userId;
  return data.user;
}

function wireLogout() {
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
    window.location.href = '../index.html';
  });
}

async function api(url, options) {
  const res = await fetch(url, { credentials: 'same-origin', ...options });
  return res.json();
}

function t(key, fallback) {
  if (window.i18n && typeof window.i18n.t === 'function') {
    const res = window.i18n.t(key);
    if (res && res !== key) return res;
  }
  return fallback || key;
}

function toast(msg, isError) {
  const c = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = 'toast' + (isError ? ' toast-error' : '');
  el.textContent = msg;
  c.appendChild(el);
  requestAnimationFrame(() => el.classList.add('toast-show'));
  setTimeout(() => { el.classList.remove('toast-show'); setTimeout(() => el.remove(), 300); }, 3200);
  el.addEventListener('click', () => el.remove());
}

/* ============================================================
   NAV
============================================================ */
function switchView(name) {
  document.querySelectorAll('.nav-item').forEach((n) => n.classList.toggle('active', n.dataset.view === name));
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
  if (name === 'dashboard') renderDashboard();
  if (name === 'patients') renderPatientsTable();
  if (name === 'bills') renderBillsTable();
  if (name === 'payments') renderPayments();
  if (name === 'claims') renderClaims();
  if (name === 'reports') renderReports();
  if (name === 'tariff') renderTariffTab();
  if (name === 'newbill') resetNewBillForm();
}

/* ============================================================
   UTIL
============================================================ */
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function inr(n) { n = Number(n) || 0; return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function inrShort(n) { n = Number(n) || 0; return '₹' + Math.round(n).toLocaleString('en-IN'); }
function todayStr() { return new Date().toISOString().slice(0, 10); }
function fmtDate(d) { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
function initials(name) { return (name || '?').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join(''); }
function colorFor(name) { let h = 0; for (const c of String(name)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return AVATAR_COLORS[h % AVATAR_COLORS.length]; }
function daysAgo(dateStr) { return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000); }
// "Overdue" isn't stored — it's Pending/Partial that's aged past 5 days, computed live so it
// stays accurate as time passes rather than freezing whatever it was at bill creation.
function displayStatus(b) {
  if (b.status !== 'Paid' && daysAgo(b.bill_date) >= 5) return 'Overdue';
  return b.status;
}
function statusClass(s) { return s.toLowerCase(); }

/* ---------- SVG DONUT + LEGEND ---------- */
function donutChart(dataMap, colorMap, size = 150) {
  const entries = Object.entries(dataMap).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
  const r = size / 2 - 14, cx = size / 2, cy = size / 2, circ = 2 * Math.PI * r;
  let offset = 0;
  const segs = entries.map(([k, v]) => {
    const frac = v / total;
    const dash = frac * circ;
    const seg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${colorMap[k] || '#5D6C63'}" stroke-width="16"
      stroke-dasharray="${dash} ${circ - dash}" stroke-dashoffset="${-offset}" stroke-linecap="butt" transform="rotate(-90 ${cx} ${cy})"/>`;
    offset += dash;
    return seg;
  }).join('');
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#e2e8f0" stroke-width="16"/>
    ${segs}
    <text x="${cx}" y="${cy - 3}" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="13" font-weight="600" fill="#111F35">${inrShort(total)}</text>
    <text x="${cx}" y="${cy + 13}" text-anchor="middle" font-family="Inter, sans-serif" font-size="9" fill="#5D6C63" letter-spacing="0.05em">TOTAL</text>
  </svg>`;
  const legend = `<div class="legend">` + entries.map(([k, v]) => {
    const pct = Math.round((v / total) * 100);
    return `<div class="legend-item">
      <div class="lhs"><span class="legend-dot" style="background:${colorMap[k] || '#5D6C63'}"></span>${escapeHtml(k)}</div>
      <div class="amt">${inrShort(v)} · ${pct}%</div>
    </div>`;
  }).join('') + `</div>`;
  return entries.length ? (svg + legend) : `<div class="empty">No data yet.</div>`;
}

/* ---------- SPARKLINE ---------- */
function sparkline(values, color) {
  if (!values.length) return '';
  const w = 120, h = 28, max = Math.max(...values, 1), min = Math.min(...values, 0);
  const range = (max - min) || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1 || 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const lastPt = pts.split(' ').pop().split(',');
  return `<svg width="100%" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="overflow:visible">
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${lastPt[0]}" cy="${lastPt[1]}" r="2.4" fill="${color}"/>
  </svg>`;
}
function lastNDaysTotals(n, fn) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    out.push(fn(d.toISOString().slice(0, 10)));
  }
  return out;
}

/* ============================================================
   LOAD DATA
============================================================ */
async function loadAll() {
  const [billData, payData, tariffData, docData, patientData] = await Promise.all([
    api('/api/billing/bills'),
    api('/api/billing/payments'),
    api('/api/billing/tariff'),
    api('/api/opd/doctors'),
    api('/api/billing/patients'),
  ]);
  bills = billData.success ? billData.bills : [];
  payments = payData.success ? payData.payments : [];
  tariff = tariffData.success ? tariffData.tariff : [];
  doctors = docData.success ? docData.doctors : [];
  patients = patientData.success ? patientData.patients : [];
  const badge = document.getElementById('patientsLiveCount');
  if (badge) badge.textContent = patients.length;
}

/* ============================================================
   DASHBOARD
============================================================ */
function renderDashboard() {
  document.getElementById('date-today-label').textContent = fmtDate(todayStr());

  const today = todayStr();
  const collectedToday = payments.filter((p) => p.paid_at.slice(0, 10) === today).reduce((s, p) => s + parseFloat(p.amount), 0);
  const outstanding = bills.filter((b) => b.status !== 'Paid');
  const outstandingTotal = outstanding.reduce((s, b) => s + parseFloat(b.balance_amount), 0);
  const paidCount = bills.filter((b) => b.status === 'Paid').length;
  const claimsInProcess = bills.filter((b) => b.is_insurance && b.claim_status !== 'Settled' && b.claim_status !== 'Rejected').length;

  document.getElementById('kpi-collected').textContent = inrShort(collectedToday);
  document.getElementById('kpi-outstanding').textContent = inrShort(outstandingTotal);
  document.getElementById('kpi-outstanding-count').textContent = `${outstanding.length} ${t('billing.bills_pending', 'bill(s) pending')}`;
  document.getElementById('kpi-paidcount').textContent = paidCount;
  document.getElementById('kpi-claims').textContent = claimsInProcess;

  document.getElementById('spark-collected').innerHTML = sparkline(lastNDaysTotals(14, (d) => payments.filter((p) => p.paid_at.slice(0, 10) === d).reduce((s, p) => s + parseFloat(p.amount), 0)), '#1b2f6e');
  document.getElementById('spark-outstanding').innerHTML = sparkline(lastNDaysTotals(14, (d) => bills.filter((b) => b.bill_date.slice(0, 10) <= d && b.status !== 'Paid').reduce((s, b) => s + parseFloat(b.balance_amount), 0)), '#9A3A29');
  document.getElementById('spark-paid').innerHTML = sparkline(lastNDaysTotals(14, (d) => bills.filter((b) => b.status === 'Paid' && b.bill_date.slice(0, 10) <= d).length), '#106349');
  document.getElementById('spark-claims').innerHTML = sparkline(lastNDaysTotals(14, () => claimsInProcess), '#2A4E85');

  const recent = [...bills].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6);
  document.getElementById('dash-recent-body').innerHTML = recent.length ? recent.map((b) => billRow(b, true)).join('') :
    `<tr><td colspan="6"><div class="empty">${t('billing.no_bills_yet', 'No bills yet.')}</div></td></tr>`;
  wireRowActions(document.getElementById('dash-recent-body'));

  const deptTotals = {};
  bills.forEach((b) => { deptTotals[b.department] = (deptTotals[b.department] || 0) + parseFloat(b.total_amount); });
  document.getElementById('dept-donut').innerHTML = donutChart(deptTotals, DEPT_COLORS);
}

function billRow(b, compact) {
  const status = displayStatus(b);
  const statusTrans = t('billing.status_' + status.toLowerCase(), status);
  return `<tr data-id="${b.id}">
    <td class="mono-cell">${escapeHtml(b.bill_no)}</td>
    <td><div class="patient-cell"><div class="avatar" style="background:${colorFor(b.patient_name)}">${initials(b.patient_name)}</div>${escapeHtml(b.patient_name)}</div></td>
    ${compact ? '' : `<td>${escapeHtml(b.department)}</td>`}
    <td>${fmtDate(b.bill_date)}</td>
    ${compact ? '' : `<td style="text-align:right" class="mono-cell">${inr(b.total_amount)}</td><td style="text-align:right" class="mono-cell">${inr(b.paid_amount)}</td>`}
    <td style="text-align:right" class="mono-cell">${compact ? inr(b.total_amount) : inr(b.balance_amount)}</td>
    <td><span class="pill ${statusClass(status)}">${statusTrans}</span></td>
    <td><div class="row-actions"><button class="icon-btn view-bill-btn" data-id="${b.id}">${t('billing.view', 'View')}</button></div></td>
  </tr>`;
}

function wireRowActions(container) {
  container.querySelectorAll('.view-bill-btn').forEach((btn) => btn.addEventListener('click', (e) => { e.stopPropagation(); openInvoice(Number(btn.dataset.id)); }));
  container.querySelectorAll('tr[data-id]').forEach((tr) => tr.addEventListener('click', () => openInvoice(Number(tr.dataset.id))));
}

/* ============================================================
   PATIENTS (LIVE) — every patient in the hospital, with status and
   what they currently owe, reconciled from real registration/OPD/
   lab/pharmacy/bed-allocation data.
============================================================ */
function patientStatusBadge(p) {
  if (p.isAdmitted) return `<span class="pill" style="background:var(--blue-soft);color:var(--blue);">${t('billing.admitted', 'Admitted')} — ${escapeHtml(p.wardName || t('billing.ward', 'Ward'))} · ${t('billing.bed', 'Bed')} ${escapeHtml(p.bedNumber || '—')}</span>`;
  if (p.visitCount === 0) return `<span class="pill" style="background:var(--paper-dim);color:var(--slate);">${t('billing.status_registered', 'Registered')}</span>`;
  if (p.latestVisitStatus === 'waiting') return `<span class="pill" style="background:var(--gold-soft);color:var(--gold-deep);">${t('billing.waiting_opd', 'Waiting (OPD)')}</span>`;
  if (p.latestVisitStatus === 'in-consultation') return `<span class="pill" style="background:var(--violet-soft);color:var(--violet);">${t('billing.in_consultation', 'In Consultation')}</span>`;
  return `<span class="pill" style="background:var(--paper-dim);color:var(--slate);">${t('billing.opd_last_visit', 'OPD · last visit ')}${p.latestVisitDate ? fmtDate(p.latestVisitDate) : '—'}</span>`;
}

function renderPatientsTable() {
  const q = (document.getElementById('patients-search').value || '').toLowerCase();
  const list = [...patients]
    .filter((p) => !q || p.fullName.toLowerCase().includes(q) || p.uhid.toLowerCase().includes(q))
    .sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));

  const body = document.getElementById('patients-body');
  const empty = document.getElementById('patients-empty');
  if (list.length === 0) { body.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  body.innerHTML = list.map((p) => `<tr data-uhid="${escapeHtml(p.uhid)}">
    <td><div class="patient-cell"><div class="avatar" style="background:${colorFor(p.fullName)}">${initials(p.fullName)}</div>
      <div>${escapeHtml(p.fullName)}<div style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--slate);">${escapeHtml(p.uhid)}</div></div></div></td>
    <td>${patientStatusBadge(p)}</td>
    <td>${p.visitCount}</td>
    <td style="text-align:right" class="mono-cell">${p.billingDeskOutstanding > 0 ? inr(p.billingDeskOutstanding) : `<span style="color:var(--emerald)">${t('billing.settled', 'Settled')}</span>`}</td>
    <td style="text-align:right" class="mono-cell">${p.pharmacyOutstanding > 0 ? inr(p.pharmacyOutstanding) : `<span style="color:var(--emerald)">${t('billing.settled', 'Settled')}</span>`}</td>
    <td style="text-align:right;font-weight:700;" class="mono-cell">${inr(p.totalOutstanding)}</td>
    <td><button class="icon-btn view-ledger-btn" data-uhid="${escapeHtml(p.uhid)}">${t('billing.view_ledger', 'View Ledger')}</button></td>
  </tr>`).join('');

  body.querySelectorAll('.view-ledger-btn').forEach((btn) => btn.addEventListener('click', (e) => { e.stopPropagation(); openLedger(btn.dataset.uhid); }));
  body.querySelectorAll('tr[data-uhid]').forEach((tr) => tr.addEventListener('click', () => openLedger(tr.dataset.uhid)));
}

async function openLedger(uhid) {
  const data = await api(`/api/billing/patients/${encodeURIComponent(uhid)}/ledger`);
  if (!data.success) return toast(data.message || 'Could not load patient.', true);
  const { patient, charges, pharmacyOrders, admission } = data;

  const unbilled = charges.filter((c) => !c.bill_id);
  const billed = charges.filter((c) => c.bill_id);
  const unbilledTotal = unbilled.reduce((s, c) => s + parseFloat(c.rate), 0);
  const pharmacyPendingTotal = pharmacyOrders.filter((p) => p.invoice_status !== 'Paid').reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const sourceLabel = { registration: 'Registration', opd_visit: 'Consultation', lab_order: 'Lab / Imaging', ipd_admission: 'Bed Charges' };

  const chargeRows = (list, editable) => list.map((c) => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:9px 0; border-bottom:1px solid var(--line-soft); font-size:13px;">
      <div style="display:flex; align-items:center; gap:10px;">
        ${editable ? `<input type="checkbox" class="charge-check" value="${c.id}" checked>` : ''}
        <div>
          <div style="font-weight:600;">${escapeHtml(c.description)}</div>
          <div style="font-size:11px;color:var(--slate);">${sourceLabel[c.source_type] || c.source_type} · ${escapeHtml(c.department)}${c.bill_no ? ' · ' + escapeHtml(c.bill_no) : ''}</div>
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:10px;">
        <span class="mono">${inr(c.rate)}</span>
        ${editable ? '' : `<span class="pill paid">Paid</span>`}
      </div>
    </div>`).join('');

  const pharmacyRows = pharmacyOrders.map((p) => {
    const isPaid = p.invoice_status === 'Paid';
    return `<div style="display:flex; justify-content:space-between; align-items:center; padding:9px 0; border-bottom:1px solid var(--line-soft); font-size:13px;">
      <div>
        <div style="font-weight:600;">${escapeHtml(p.medicine_name)}</div>
        <div style="font-size:11px;color:var(--slate);">Pharmacy · ${escapeHtml(p.dosage || '')}${p.invoice_number ? ' · ' + escapeHtml(p.invoice_number) : ' · not yet billed'}</div>
      </div>
      <div style="display:flex; align-items:center; gap:10px;">
        <span class="mono">${p.amount != null ? inr(p.amount) : '—'}</span>
        ${isPaid ? '<span class="pill paid">Paid</span>' : `<button class="icon-btn pay-pharmacy-btn" data-id="${p.id}" data-amount="${p.amount || 0}" data-name="${escapeHtml(p.medicine_name)}">Pay Now</button>`}
      </div>
    </div>`;
  }).join('');

  document.getElementById('ledger-body').innerHTML = `
    <div class="invoice-head" style="border-bottom-width:2px;">
      <div class="invoice-brand"><img src="../logo.png" alt="Core5 MEDISYS"><div><div class="hosp-name" style="font-size:19px;">${escapeHtml(patient.full_name)}</div><div class="hosp-meta">${escapeHtml(patient.uhid)}${patient.phone ? ' · ' + escapeHtml(patient.phone) : ''}</div></div></div>
      <div class="invoice-tag">
        <div class="taglabel">Total Outstanding</div>
        <div class="bignum" style="font-size:20px;">${inr(unbilledTotal + pharmacyPendingTotal)}</div>
      </div>
    </div>
    ${admission ? `<div class="meta-block" style="margin-bottom:18px;"><div class="h">Currently Admitted</div><div class="l"><b>${escapeHtml(admission.ward_name || 'Ward')}</b> · Bed ${escapeHtml(admission.bed_number || '—')}</div></div>` : ''}

    <h3 style="font-size:14px; margin:0 0 4px;">Billing Desk Charges</h3>
    <p style="font-size:12px;color:var(--slate);margin:0 0 8px;">Registration, consultation, lab/imaging, and bed charges. Uncheck anything you don't want to collect right now.</p>
    <div style="margin-bottom:6px;">${chargeRows(unbilled, true) || '<div class="empty" style="padding:14px 0;">Nothing outstanding.</div>'}</div>
    ${unbilled.length ? `<div style="text-align:right;margin:10px 0 22px;"><button class="btn gold" id="collect-charges-btn">Collect Selected</button></div>` : '<div style="margin-bottom:22px;"></div>'}

    ${billed.length ? `<h3 style="font-size:14px; margin:0 0 8px;">Already Collected</h3><div style="margin-bottom:22px;">${chargeRows(billed, false)}</div>` : ''}

    <h3 style="font-size:14px; margin:0 0 4px;">Pharmacy</h3>
    <p style="font-size:12px;color:var(--slate);margin:0 0 8px;">Paid/pending status is pulled live from the Pharmacy portal — anything already paid there shows Paid here and isn't counted twice.</p>
    <div>${pharmacyRows || '<div class="empty" style="padding:14px 0;">No pharmacy orders yet.</div>'}</div>
  `;

  const collectBtn = document.getElementById('collect-charges-btn');
  if (collectBtn) collectBtn.addEventListener('click', () => collectSelectedCharges(uhid));
  document.querySelectorAll('.pay-pharmacy-btn').forEach((btn) =>
    btn.addEventListener('click', () => payPharmacyOrder(uhid, Number(btn.dataset.id), btn.dataset.name, parseFloat(btn.dataset.amount)))
  );

  document.getElementById('ledger-wrap').classList.add('open');
}
window.openLedger = openLedger;

function closeLedger() { document.getElementById('ledger-wrap').classList.remove('open'); }
window.closeLedger = closeLedger;

async function collectSelectedCharges(uhid) {
  const checked = Array.from(document.querySelectorAll('.charge-check:checked')).map((el) => Number(el.value));
  if (checked.length === 0) return toast('Select at least one charge.', true);
  const mode = prompt('Payment mode (Cash, Card, UPI, Cheque, Net Banking, Insurance / TPA):', 'Cash') || 'Cash';
  const data = await api(`/api/billing/patients/${encodeURIComponent(uhid)}/collect`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chargeIds: checked, paymentMode: mode }),
  });
  if (!data.success) return toast(data.message || 'Could not collect payment.', true);
  toast(`Collected ${inr(data.total)} — bill ${data.billNo}`);
  await loadAll();
  renderPatientsTable();
  openLedger(uhid);
}
window.collectSelectedCharges = collectSelectedCharges;

// Reuses Pharmacy's own generate+pay endpoints so a payment taken from Billing Desk is
// identical to one taken from the Pharmacy portal — one invoice, one source of truth.
async function payPharmacyOrder(uhid, orderId, medName, amount) {
  if (!confirm(`Collect ${inr(amount)} for ${medName} now?`)) return;
  const genData = await api('/api/pharmacy-invoices/generate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderIds: [orderId] }),
  });
  if (!genData.success) return toast(genData.message || 'Could not generate pharmacy bill.', true);
  const payData = await api(`/api/pharmacy-invoices/${genData.invoiceId}/pay`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentType: 'Cash' }),
  });
  if (!payData.success) return toast(payData.message || 'Bill generated but payment failed.', true);
  toast(`Collected ${inr(genData.totalAmount)} for ${medName}`);
  await loadAll();
  renderPatientsTable();
  openLedger(uhid);
}
window.payPharmacyOrder = payPharmacyOrder;

/* ============================================================
   BILLS LIST
============================================================ */
function renderBillsTable() {
  const q = (document.getElementById('bills-search').value || '').toLowerCase();
  let list = bills.filter((b) => {
    const matchStatus = currentBillsFilter === 'all' || displayStatus(b) === currentBillsFilter;
    const matchQ = !q || b.patient_name.toLowerCase().includes(q) || (b.patient_uhid || '').toLowerCase().includes(q) || b.bill_no.toLowerCase().includes(q);
    return matchStatus && matchQ;
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const body = document.getElementById('bills-body');
  const empty = document.getElementById('bills-empty');
  if (list.length === 0) { body.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  body.innerHTML = list.map((b) => billRow(b, false)).join('');
  wireRowActions(body);
}

function wireStatusFilters() {
  document.querySelectorAll('#status-filters .chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      currentBillsFilter = chip.dataset.status;
      document.querySelectorAll('#status-filters .chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      renderBillsTable();
    });
  });
}

/* ============================================================
   NEW BILL FORM
============================================================ */
function resetNewBillForm() {
  selectedPatient = null;
  document.getElementById('nb-search').value = '';
  document.getElementById('nb-abha').value = '';
  document.getElementById('nb-name').value = '';
  document.getElementById('nb-dept').value = 'OPD';
  document.getElementById('nb-date').value = todayStr();
  document.getElementById('nb-discpct').value = 0;
  document.getElementById('nb-taxpct').value = 0;
  document.getElementById('nb-received').value = 0;
  document.getElementById('nb-mode').value = 'Cash';
  document.getElementById('nb-payer').value = '';
  document.getElementById('nb-policy').value = '';
  document.getElementById('insurance-fields').style.display = 'none';
  document.getElementById('insurance-switch').classList.remove('on');
  document.getElementById('nb-error').style.display = 'none';
  currentItems = [];
  renderItems();
  renderSummary();

  const doctorSel = document.getElementById('nb-doctor');
  doctorSel.innerHTML = `<option value="">— none —</option>` + doctors.map((d) => `<option value="${d.user_id}">${escapeHtml(d.full_name)}</option>`).join('');

  const presetRow = document.getElementById('preset-row');
  presetRow.innerHTML = tariff.map((t) => `
    <button type="button" class="preset-btn" data-desc="${escapeHtml(t.charge_head)}" data-dept="${escapeHtml(t.department)}" data-rate="${t.default_rate}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>${escapeHtml(t.charge_head)}
    </button>`).join('') +
    `<button type="button" class="preset-btn" id="preset-custom"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>Custom</button>`;
  presetRow.querySelectorAll('.preset-btn[data-desc]').forEach((btn) => {
    btn.addEventListener('click', () => addItem(btn.dataset.desc, btn.dataset.dept, Number(btn.dataset.rate)));
  });
  document.getElementById('preset-custom').addEventListener('click', () => addItem('Miscellaneous', 'Misc', 0));
}

function addItem(desc, dept, rate) {
  currentItems.push({ id: 'it' + Date.now() + Math.random().toString(16).slice(2), desc, dept, qty: 1, rate });
  renderItems(); renderSummary();
}
function removeItem(id) { currentItems = currentItems.filter((i) => i.id !== id); renderItems(); renderSummary(); }
function updateItem(id, field, value) {
  const it = currentItems.find((i) => i.id === id); if (!it) return;
  it[field] = (field === 'qty' || field === 'rate') ? (Number(value) || 0) : value;
  renderItems(); renderSummary();
}
window.removeItem = removeItem;
window.updateItem = updateItem;

function renderItems() {
  const body = document.getElementById('items-body');
  if (currentItems.length === 0) {
    body.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--slate);padding:20px 0;">No items yet — use a preset above or add a custom row.</td></tr>`;
    return;
  }
  body.innerHTML = currentItems.map((it) => {
    const amt = (it.qty * it.rate) || 0;
    return `<tr>
      <td><input class="desc" value="${escapeHtml(it.desc)}" onchange="updateItem('${it.id}','desc',this.value)"></td>
      <td><input class="num" style="width:82px;text-align:left" value="${escapeHtml(it.dept)}" onchange="updateItem('${it.id}','dept',this.value)"></td>
      <td><input class="num" type="number" min="0" value="${it.qty}" onchange="updateItem('${it.id}','qty',this.value)"></td>
      <td><input class="num" type="number" min="0" value="${it.rate}" onchange="updateItem('${it.id}','rate',this.value)"></td>
      <td class="amt">${inr(amt)}</td>
      <td><button class="rm-row" onclick="removeItem('${it.id}')">&times;</button></td>
    </tr>`;
  }).join('');
}

function renderSummary() {
  const subtotal = currentItems.reduce((s, it) => s + (it.qty * it.rate || 0), 0);
  const discPct = Number(document.getElementById('nb-discpct').value) || 0;
  const taxPct = Number(document.getElementById('nb-taxpct').value) || 0;
  const received = Number(document.getElementById('nb-received').value) || 0;
  const discAmt = subtotal * (discPct / 100);
  const taxAmt = (subtotal - discAmt) * (taxPct / 100);
  const total = subtotal - discAmt + taxAmt;
  const balance = Math.max(0, total - received);

  document.getElementById('sum-subtotal').textContent = inr(subtotal);
  document.getElementById('sum-discount').textContent = '− ' + inr(discAmt);
  document.getElementById('sum-tax').textContent = '+ ' + inr(taxAmt);
  document.getElementById('sum-total').textContent = inr(total);
  document.getElementById('sum-balance').textContent = inr(balance);
}
window.renderSummary = renderSummary;

function toggleInsurance() {
  const sw = document.getElementById('insurance-switch');
  const on = !sw.classList.contains('on');
  sw.classList.toggle('on', on);
  document.getElementById('insurance-fields').style.display = on ? 'block' : 'none';
}
window.toggleInsurance = toggleInsurance;

function wirePatientSearch() {
  let debounce;
  document.getElementById('nb-search').addEventListener('input', (e) => {
    clearTimeout(debounce);
    const q = e.target.value.trim();
    const results = document.getElementById('nb-search-results');
    if (!q) { results.style.display = 'none'; return; }
    debounce = setTimeout(async () => {
      const data = await api(`/api/patients/search?q=${encodeURIComponent(q)}`);
      if (!data.success) return;
      results.style.display = 'block';
      results.innerHTML = data.patients.length
        ? data.patients.map((p) => `<div class="search-result-item" data-uhid="${escapeHtml(p.uhid)}">${escapeHtml(p.full_name)} <span class="uh">${escapeHtml(p.uhid)}</span></div>`).join('')
        : `<div class="search-result-item" style="color:var(--slate);cursor:default;">No matching patients.</div>`;
      results.querySelectorAll('[data-uhid]').forEach((el) => {
        el.addEventListener('click', () => {
          const p = data.patients.find((x) => x.uhid === el.dataset.uhid);
          selectedPatient = p;
          document.getElementById('nb-name').value = p.full_name;
          document.getElementById('nb-abha').value = p.abha_id || '';
          document.getElementById('nb-search').value = `${p.full_name} (${p.uhid})`;
          results.style.display = 'none';
        });
      });
    }, 300);
  });
  document.addEventListener('click', (e) => {
    const wrap = document.getElementById('nb-search-results');
    if (wrap && !e.target.closest('.field')) wrap.style.display = 'none';
  });
}

async function saveBill() {
  const errorEl = document.getElementById('nb-error');
  errorEl.style.display = 'none';
  const patientName = document.getElementById('nb-name').value.trim();
  if (!patientName) { errorEl.textContent = 'Patient name is required.'; errorEl.style.display = 'block'; return; }
  if (currentItems.length === 0) { errorEl.textContent = 'Add at least one line item.'; errorEl.style.display = 'block'; return; }

  const isInsurance = document.getElementById('insurance-switch').classList.contains('on');
  const payload = {
    patientUhid: selectedPatient ? selectedPatient.uhid : null,
    patientName,
    abhaId: document.getElementById('nb-abha').value.trim(),
    department: document.getElementById('nb-dept').value,
    doctorUserId: document.getElementById('nb-doctor').value || null,
    billDate: document.getElementById('nb-date').value || todayStr(),
    items: currentItems.map((it) => ({ description: it.desc, department: it.dept, qty: it.qty, rate: it.rate })),
    discountPct: Number(document.getElementById('nb-discpct').value) || 0,
    taxPct: Number(document.getElementById('nb-taxpct').value) || 0,
    receivedAmount: Number(document.getElementById('nb-received').value) || 0,
    paymentMode: document.getElementById('nb-mode').value,
    isInsurance,
    payerName: document.getElementById('nb-payer').value.trim(),
    policyNo: document.getElementById('nb-policy').value.trim(),
  };

  const btn = document.getElementById('save-bill-btn');
  btn.disabled = true;
  const data = await api('/api/billing/bills', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  btn.disabled = false;
  if (!data.success) { errorEl.textContent = data.message || 'Could not save bill.'; errorEl.style.display = 'block'; return; }

  toast(`Bill ${data.billNo} created — ${data.status}`);
  await loadAll();
  switchView('bills');
  openInvoice(data.id);
}

/* ============================================================
   PAYMENTS
============================================================ */
function renderPayments() {
  const modeTotals = {};
  payments.forEach((p) => { modeTotals[p.mode] = (modeTotals[p.mode] || 0) + parseFloat(p.amount); });
  document.getElementById('mode-donut').innerHTML = donutChart(modeTotals, MODE_COLORS);

  const body = document.getElementById('payments-body');
  const empty = document.getElementById('payments-empty');
  const sorted = [...payments].sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at));
  if (sorted.length === 0) { body.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  body.innerHTML = sorted.map((p) => `<tr>
    <td>${fmtDate(p.paid_at)}</td>
    <td class="mono-cell">${escapeHtml(p.bill_no)}</td>
    <td>${escapeHtml(p.patient_name)}</td>
    <td><span class="pill" style="background:var(--paper-dim);color:var(--ink-2);">${escapeHtml(p.mode)}</span></td>
    <td style="text-align:right" class="mono-cell">${inr(p.amount)}</td>
    <td class="mono-cell" style="color:var(--slate);">${escapeHtml(p.reference || '—')}</td>
  </tr>`).join('');
}

async function collectPayment(billId) {
  const bill = bills.find((b) => b.id === billId);
  if (!bill) return;
  const amountStr = prompt(`Collect payment for ${bill.bill_no} — balance due ${inr(bill.balance_amount)}.\nEnter amount received (₹):`, bill.balance_amount);
  if (amountStr === null) return;
  const amount = parseFloat(amountStr);
  if (!amount || amount <= 0) return toast('Enter a valid amount.', true);
  const mode = prompt('Payment mode (Cash, Card, UPI, Cheque, Net Banking, Insurance / TPA):', 'Cash') || 'Cash';

  const data = await api(`/api/billing/bills/${billId}/payments`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount, mode }),
  });
  if (!data.success) return toast(data.message || 'Could not record payment.', true);
  toast(`₹${amount.toFixed(2)} collected — bill is now ${data.status}`);
  await loadAll();
  renderBillsTable();
  renderDashboard();
}
window.collectPayment = collectPayment;

/* ============================================================
   CLAIMS
============================================================ */
function renderClaims() {
  const list = bills.filter((b) => b.is_insurance);
  const body = document.getElementById('claims-body');
  const empty = document.getElementById('claims-empty');
  if (list.length === 0) { body.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  body.innerHTML = list.map((b) => {
    const copay = Math.max(0, parseFloat(b.total_amount) - (parseFloat(b.approved_amount) || 0));
    const cls = (b.claim_status || 'submitted').toLowerCase();
    const nextActions = {
      Submitted: [['Approved', 'Mark Approved'], ['Rejected', 'Mark Rejected']],
      Approved: [['Settled', 'Mark Settled']],
      Rejected: [],
      Settled: [],
    }[b.claim_status] || [];
    return `<tr>
      <td class="mono-cell">${escapeHtml(b.bill_no)}</td>
      <td>${escapeHtml(b.patient_name)}</td>
      <td>${escapeHtml(b.payer_name || '—')}</td>
      <td class="mono-cell">${escapeHtml(b.policy_no || '—')}</td>
      <td style="text-align:right" class="mono-cell">${inr(b.total_amount)}</td>
      <td style="text-align:right" class="mono-cell">${b.approved_amount != null ? inr(b.approved_amount) : '—'}</td>
      <td style="text-align:right" class="mono-cell">${b.approved_amount != null ? inr(copay) : '—'}</td>
      <td><span class="pill ${cls}">${escapeHtml(b.claim_status || 'Submitted')}</span></td>
      <td><div class="row-actions">${nextActions.map(([status, label]) => `<button class="icon-btn claim-action-btn" data-id="${b.id}" data-status="${status}">${label}</button>`).join('')}</div></td>
    </tr>`;
  }).join('');
  body.querySelectorAll('.claim-action-btn').forEach((btn) => {
    btn.addEventListener('click', () => updateClaim(Number(btn.dataset.id), btn.dataset.status));
  });
}

async function updateClaim(billId, claimStatus) {
  let approvedAmount;
  if (claimStatus === 'Approved') {
    const bill = bills.find((b) => b.id === billId);
    const amtStr = prompt(`Approved amount for ${bill.bill_no} (billed ${inr(bill.total_amount)}):`, bill.total_amount);
    if (amtStr === null) return;
    approvedAmount = parseFloat(amtStr) || 0;
  }
  const data = await api(`/api/billing/bills/${billId}/claim`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ claimStatus, approvedAmount }),
  });
  if (!data.success) return toast(data.message || 'Could not update claim.', true);
  toast(`Claim marked ${claimStatus}`);
  await loadAll();
  renderClaims();
}

/* ============================================================
   REPORTS
============================================================ */
function renderReports() {
  const totalBilled = bills.reduce((s, b) => s + parseFloat(b.total_amount), 0);
  const totalCollected = payments.reduce((s, p) => s + parseFloat(p.amount), 0);
  const totalOutstanding = bills.reduce((s, b) => s + parseFloat(b.balance_amount), 0);
  const avg = bills.length ? totalBilled / bills.length : 0;

  document.getElementById('rep-billed').textContent = inrShort(totalBilled);
  document.getElementById('rep-collected').textContent = inrShort(totalCollected);
  document.getElementById('rep-outstanding').textContent = inrShort(totalOutstanding);
  document.getElementById('rep-avg').textContent = inrShort(avg);

  const deptTotals = {};
  bills.forEach((b) => { deptTotals[b.department] = (deptTotals[b.department] || 0) + parseFloat(b.total_amount); });
  document.getElementById('rep-dept-donut').innerHTML = donutChart(deptTotals, DEPT_COLORS);

  const modeTotals = {};
  payments.forEach((p) => { modeTotals[p.mode] = (modeTotals[p.mode] || 0) + parseFloat(p.amount); });
  document.getElementById('rep-mode-donut').innerHTML = donutChart(modeTotals, MODE_COLORS);
}

/* ============================================================
   TARIFF
============================================================ */
const TARIFF_DEPTS = ['OPD', 'IPD', 'Pathology', 'Radiology', 'Pharmacy', 'Emergency', 'Misc'];
let editingTariffId = null;

function renderTariffTab() {
  const body = document.getElementById('tariff-body');
  const empty = document.getElementById('tariff-empty');
  if (tariff.length === 0) { body.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  body.innerHTML = tariff.map((t) => {
    if (t.id === editingTariffId) {
      return `<tr>
        <td><input class="txt-input" id="tf-edit-head" value="${escapeHtml(t.charge_head)}" style="width:100%;"></td>
        <td><select class="txt-input" id="tf-edit-dept">${TARIFF_DEPTS.map((d) => `<option ${d === t.department ? 'selected' : ''}>${d}</option>`).join('')}</select></td>
        <td><input class="txt-input" id="tf-edit-rate" type="number" min="0" value="${Number(t.default_rate)}" style="width:100px;text-align:right;"></td>
        <td><div class="row-actions">
          <button class="icon-btn" id="tf-save-btn" data-id="${t.id}">Save</button>
          <button class="icon-btn" id="tf-cancel-btn">Cancel</button>
        </div></td>
      </tr>`;
    }
    return `<tr>
      <td>${escapeHtml(t.charge_head)}</td>
      <td>${escapeHtml(t.department)}</td>
      <td style="text-align:right" class="mono-cell">${inr(t.default_rate)}</td>
      <td><div class="row-actions">
        <button class="icon-btn tf-edit-btn" data-id="${t.id}">Edit</button>
        <button class="icon-btn tf-delete-btn" data-id="${t.id}" style="color:var(--rust);">Delete</button>
      </div></td>
    </tr>`;
  }).join('');

  body.querySelectorAll('.tf-edit-btn').forEach((btn) => btn.addEventListener('click', () => { editingTariffId = Number(btn.dataset.id); renderTariffTab(); }));
  body.querySelectorAll('.tf-delete-btn').forEach((btn) => btn.addEventListener('click', () => deleteTariff(Number(btn.dataset.id))));
  const saveBtn = document.getElementById('tf-save-btn');
  if (saveBtn) saveBtn.addEventListener('click', () => saveTariffEdit(Number(saveBtn.dataset.id)));
  const cancelBtn = document.getElementById('tf-cancel-btn');
  if (cancelBtn) cancelBtn.addEventListener('click', () => { editingTariffId = null; renderTariffTab(); });
}

async function saveTariffEdit(id) {
  const chargeHead = document.getElementById('tf-edit-head').value.trim();
  const department = document.getElementById('tf-edit-dept').value;
  const defaultRate = document.getElementById('tf-edit-rate').value;
  if (!chargeHead) return toast('Charge head is required.', true);
  const data = await api(`/api/billing/tariff/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chargeHead, department, defaultRate }),
  });
  if (!data.success) return toast(data.message || 'Could not update tariff.', true);
  toast('Tariff updated.');
  editingTariffId = null;
  await loadAll();
  renderTariffTab();
}

async function deleteTariff(id) {
  if (!confirm('Remove this charge head? It will disappear from the Create Bill presets, but any bills already created stay unaffected.')) return;
  const data = await api(`/api/billing/tariff/${id}`, { method: 'DELETE' });
  if (!data.success) return toast(data.message || 'Could not delete tariff.', true);
  toast('Tariff item removed.');
  await loadAll();
  renderTariffTab();
}

function wireTariffAddForm() {
  document.getElementById('tariff-add-btn').addEventListener('click', async () => {
    const errorEl = document.getElementById('tf-error');
    errorEl.style.display = 'none';
    const chargeHead = document.getElementById('tf-head').value.trim();
    const department = document.getElementById('tf-dept').value;
    const defaultRate = document.getElementById('tf-rate').value;
    if (!chargeHead) { errorEl.textContent = 'Charge head is required.'; errorEl.style.display = 'block'; return; }
    const data = await api('/api/billing/tariff', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chargeHead, department, defaultRate }),
    });
    if (!data.success) { errorEl.textContent = data.message || 'Could not add tariff.'; errorEl.style.display = 'block'; return; }
    document.getElementById('tf-head').value = '';
    document.getElementById('tf-rate').value = 0;
    toast(`${chargeHead} added to tariff.`);
    await loadAll();
    renderTariffTab();
  });
}

/* ============================================================
   INVOICE
============================================================ */
async function openInvoice(billId) {
  const data = await api(`/api/billing/bills/${billId}`);
  if (!data.success) return toast(data.message || 'Could not load bill.', true);
  const { bill, items, payments: billPayments } = data;
  const status = displayStatus(bill);

  const itemRows = items.map((it) => `<tr>
    <td>${escapeHtml(it.description)}</td><td>${escapeHtml(it.department || '—')}</td>
    <td style="text-align:center">${Number(it.qty)}</td>
    <td class="amt">${inr(it.rate)}</td><td class="amt">${inr(it.amount)}</td>
  </tr>`).join('');

  const paymentLines = billPayments.map((p) => `${escapeHtml(p.mode)} ${inr(p.amount)} on ${fmtDate(p.paid_at)}${p.reference ? ' (' + escapeHtml(p.reference) + ')' : ''}`).join('<br>') || 'No payments recorded.';

  const insuranceBlock = bill.is_insurance ? `
    <div class="meta-block">
      <div class="h">Insurance / TPA</div>
      <div class="l">
        <b>${escapeHtml(bill.payer_name || '—')}</b><br>
        Policy: ${escapeHtml(bill.policy_no || '—')}<br>
        Claim status: <span class="pill ${(bill.claim_status || 'submitted').toLowerCase()}">${escapeHtml(bill.claim_status || 'Submitted')}</span>
      </div>
    </div>` : `
    <div class="meta-block">
      <div class="h">${t('billing.payments', 'Payments')}</div>
      <div class="l">${paymentLines}</div>
    </div>`;

  document.getElementById('invoice-body').innerHTML = `
    <div class="ribbon ${statusClass(status)}">${statusTrans}</div>
    <div class="invoice-head">
      <div class="invoice-brand">
        <img src="../logo.png" alt="Core5 MEDISYS">
        <div>
          <div class="hosp-name">${escapeHtml(sessionUser.hospitalName || 'MEDISYS Hospital')}</div>
          <div class="hosp-meta">${t('billing.tax_invoice', 'Billing Desk · Tax Invoice')}</div>
        </div>
      </div>
      <div class="invoice-tag">
        <div class="taglabel">${t('billing.bill_no', 'Bill No.')}</div>
        <div class="bignum">${escapeHtml(bill.bill_no)}</div>
        <div class="status-pill"><span class="pill ${statusClass(status)}">${statusTrans}</span></div>
      </div>
    </div>

    <div class="invoice-meta-grid">
      <div class="meta-block">
        <div class="h">${t('billing.patient', 'Patient')}</div>
        <div class="l">
          <b>${escapeHtml(bill.patient_name)}</b><br>
          UHID: ${escapeHtml(bill.patient_uhid || 'Not registered')}<br>
          ${bill.abha_id ? `ABHA: ${escapeHtml(bill.abha_id)}<br>` : ''}
          ${t('common.department', 'Department')}: ${escapeHtml(bill.department)}${bill.doctor_name ? ' · Dr. ' + escapeHtml(bill.doctor_name) : ''}<br>
          ${t('common.date', 'Date')}: ${fmtDate(bill.bill_date)}
        </div>
      </div>
      ${insuranceBlock}
    </div>

    <div class="invoice-items">
      <table>
        <thead><tr><th>${t('billing.item_description', 'Description')}</th><th>${t('billing.dept', 'Dept')}</th><th style="text-align:center">${t('billing.qty', 'Qty')}</th><th class="amt">${t('billing.rate', 'Rate')}</th><th class="amt">${t('billing.amount', 'Amount')}</th></tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
    </div>

    <div class="invoice-totals">
      <div class="box">
        <div class="ln"><span>${t('billing.subtotal', 'Subtotal')}</span><span class="mono">${inr(bill.subtotal)}</span></div>
        <div class="ln"><span>${t('billing.discount', 'Discount')} (${Number(bill.discount_pct)}%)</span><span class="mono">− ${inr(bill.discount_amount)}</span></div>
        <div class="ln"><span>${t('billing.tax', 'GST')} (${Number(bill.tax_pct)}%)</span><span class="mono">+ ${inr(bill.tax_amount)}</span></div>
        <div class="ln grand"><span>${t('billing.total', 'Total')}</span><span class="mono">${inr(bill.total_amount)}</span></div>
        <div class="ln"><span>${t('billing.paid', 'Paid')}</span><span class="mono">${inr(bill.paid_amount)}</span></div>
        <div class="ln"><span>${t('billing.balance_due', 'Balance Due')}</span><span class="mono">${inr(bill.balance_amount)}</span></div>
      </div>
    </div>

    <div class="invoice-foot">
      <div class="sign-block"><div class="sign-line"></div>${t('billing.patient_signature', 'Patient / Attendant')}</div>
      <div class="sign-block"><div class="sign-line"></div>${t('billing.billing_desk_signature', 'Billing Desk — ')}${escapeHtml(sessionUser.fullName || sessionUser.userId)}</div>
    </div>

    ${bill.balance_amount > 0 ? `<div style="margin-top:20px;"><button class="btn gold" onclick="collectPayment(${bill.id})">${t('billing.collect_remaining', 'Collect Remaining')} ${inr(bill.balance_amount)}</button></div>` : ''}
  `;

  document.getElementById('invoice-wrap').classList.add('open');
}
window.openInvoice = openInvoice;

function closeInvoice() { document.getElementById('invoice-wrap').classList.remove('open'); }
window.closeInvoice = closeInvoice;
window.switchView = switchView;
window.saveBill = saveBill;

/* ============================================================
   INIT
============================================================ */
function showLoadError() {
  const loading = document.getElementById('appLoadingLabel');
  const errorBox = document.getElementById('appLoadError');
  if (loading) loading.style.display = 'none';
  if (errorBox) errorBox.style.display = 'block';
}

async function init() {
  let user;
  try {
    user = await guardSession();
  } catch (err) {
    console.error('Session check failed:', err);
    return showLoadError();
  }
  if (!user) return;
  wireLogout();

  try {
    await loadAll();
  } catch (err) {
    console.error('Failed to load billing data:', err);
    return showLoadError();
  }

  const root = document.getElementById('appRoot');
  const tpl = document.getElementById('appTemplate');
  root.replaceWith(tpl.content.cloneNode(true));

  if (window.i18n && typeof window.i18n.applyTranslations === 'function') {
    window.i18n.applyTranslations();
  }

  // #sidebarHospital only exists once the template above has been inserted into the page.
  const sidebarHospitalEl = document.getElementById('sidebarHospital');
  if (sidebarHospitalEl) sidebarHospitalEl.textContent = user.hospitalName || '';

  document.querySelectorAll('.nav-item').forEach((el) => el.addEventListener('click', () => switchView(el.dataset.view)));
  wireStatusFilters();
  wirePatientSearch();
  wireTariffAddForm();

  renderDashboard();

  const knownPatientUhids = new Set(patients.map((p) => p.uhid));

  async function refreshAndRerender() {
    let previousCount = patients.length;
    try {
      await loadAll();
    } catch (err) {
      console.error('Background refresh failed (will retry next cycle):', err);
      return;
    }
    patients.forEach((p) => {
      if (!knownPatientUhids.has(p.uhid)) {
        knownPatientUhids.add(p.uhid);
        if (previousCount > 0) showToast(`New patient: ${p.fullName || p.uhid}`, 'success');
      }
    });
    const activeView = document.querySelector('.nav-item.active');
    if (activeView) switchView(activeView.dataset.view);
  }

  // Live push does the real-time work now; this is just a safety-net in case
  // a socket ever silently drops.
  setInterval(refreshAndRerender, 60000);

  if (window.MEDISYS_RT) {
    ['billing_patients', 'billing_bills', 'billing_payments', 'billing_tariff', 'pharmacy_invoices', 'pharmacy_orders'].forEach(
      (resource) => MEDISYS_RT.on(resource, refreshAndRerender)
    );
  }

  window.addEventListener('i18n:languageChanged', () => {
    const activeView = document.querySelector('.nav-item.active');
    if (activeView) switchView(activeView.dataset.view);
    if (window.i18n) window.i18n.applyTranslations();
  });
}

document.addEventListener('DOMContentLoaded', init);
