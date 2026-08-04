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

  function showToast(message, type = 'success') {
    const container = document.getElementById("toastContainer");
    if (!container) {
      alert(message);
      return;
    }

    const toast = document.createElement("div");
    toast.className = `toast-item toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"></path></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"></path></svg>`;
    } else {
      iconSvg = `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    }

    const textSpan = document.createElement("div");
    textSpan.className = "toast-msg-text";
    textSpan.textContent = message;

    toast.innerHTML = `<div class="toast-icon-wrap">${iconSvg}</div>`;
    toast.appendChild(textSpan);

    const closeBtn = document.createElement("button");
    closeBtn.className = "toast-close-btn";
    closeBtn.innerHTML = `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"></path></svg>`;
    closeBtn.onclick = () => {
      toast.classList.add("toast-hiding");
      setTimeout(() => toast.remove(), 250);
    };
    toast.appendChild(closeBtn);

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("toast-hiding");
      setTimeout(() => toast.remove(), 250);
    }, 4000);
  }

  let sessionUser = null;
  let allOrders = [];
  let currentTab = "pending";
  let searchQuery = "";

  async function guardSession() {
    const res = await fetch("/api/session", { credentials: "same-origin" });
    const data = await res.json();
    if (!data.user) {
      window.location.href = "../index.html";
      return null;
    }
    sessionUser = data.user;
    document.getElementById("portalUser").textContent = data.user.fullName || data.user.userId;
    return data.user;
  }

  function wireLogout() {
    document.getElementById("logoutBtn").addEventListener("click", async () => {
      await fetch("/api/logout", { method: "POST", credentials: "same-origin" });
      window.location.href = "../index.html";
    });
  }

  async function loadPharmacyOrders() {
    try {
      const res = await fetch("/api/pharmacy-orders", { credentials: "same-origin" });
      const data = await res.json();
      
      if (data.success && data.orders) {
        allOrders = data.orders;
        renderTable();
      }
    } catch (err) {
      console.error("Error loading pharmacy orders:", err);
    }
  }

  function renderTable() {
    const grid = document.getElementById("pharmacyGrid");
    const emptyState = document.getElementById("pharmacyEmptyState");
    
    // 1. Filter by Tab
    let filtered = allOrders.filter(o => 
      currentTab === "pending" ? o.status === "pending" : o.status === "dispensed"
    );

    // 2. Filter by Search Query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(o => 
        (o.patient_uhid && o.patient_uhid.toLowerCase().includes(q)) ||
        (o.patient_name && o.patient_name.toLowerCase().includes(q)) ||
        (o.medicine_name && o.medicine_name.toLowerCase().includes(q))
      );
    }
    
    if (filtered.length === 0) {
      grid.innerHTML = "";
      emptyState.querySelector('p').textContent = currentTab === "pending" 
        ? "No pending prescriptions right now." 
        : "No dispensed history found.";
      emptyState.hidden = false;
      return;
    }

    emptyState.hidden = true;
    
    grid.innerHTML = filtered.map(order => {
      const isDispensed = order.status === 'dispensed';
      const isIPD = !!order.ipd_admission_id;
      const typePill = isIPD ? `<span class="pill ipd">IPD</span>` : `<span class="pill opd">OPD</span>`;
      
      let ageStr = '';
      if (order.patient_dob) {
        const age = Math.floor((new Date() - new Date(order.patient_dob)) / 31557600000);
        const g = order.patient_gender ? order.patient_gender.charAt(0).toUpperCase() : '';
        ageStr = `${age}${g} &bull; `;
      }

      const urgencyPill = order.urgency === 'urgent' 
        ? `<span class="pill urgent">Urgent</span>` 
        : (order.urgency === 'routine' ? `<span class="pill routine">Routine</span>` : '');
      
      const actionHtml = isDispensed 
        ? `<div style="display: flex; gap: 8px; align-items: center;">
             <span class="status-dispensed">Dispensed</span>
             <button onclick="window.__printPrescriptionSlip(${order.id})" style="display: inline-flex; align-items: center; gap: 5px; padding: 5px 12px; background: white; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12px; cursor: pointer; color: #334155; font-weight: 500;">
               <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> Print
             </button>
           </div>` 
        : `<button class="btn-dispense dispense-btn" data-id="${order.id}">Dispense</button>`;
        
      // Extract time from created_at if available
      const timeStr = order.created_at ? new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
        
      return `
        <div class="prescription-card">
          <div class="card-header">
            <div>
              <div class="patient-name">${escapeHtml(order.patient_name || 'Unknown Patient')}</div>
              <div class="patient-meta">${ageStr}${escapeHtml(order.patient_uhid)} &bull; Dr. ${escapeHtml(order.doctor_user_id)}</div>
            </div>
            <div>
              ${urgencyPill}
              ${typePill}
            </div>
          </div>
          
          <div class="med-list">
            <div class="med-item">${escapeHtml(order.medicine_name)}</div>
            <div class="med-dose">Dose: ${escapeHtml(order.dosage)} &nbsp;|&nbsp; For: ${escapeHtml(order.duration)} Days</div>
          </div>
          
          <div class="card-footer">
            <div class="time-stamp">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>
              ${escapeHtml(timeStr)}
            </div>
            <div>
              ${actionHtml}
            </div>
          </div>
        </div>
      `;
    }).join("");

    document.querySelectorAll('.dispense-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        await dispenseMedicine(id);
      });
    });
  }

  async function dispenseMedicine(orderId) {
    if(!confirm("Are you sure you want to mark this medicine as dispensed?")) return;
    
    try {
      const res = await fetch(`/api/pharmacy-orders/${orderId}/dispense`, { 
        method: "POST",
        credentials: "same-origin" 
      });
      const data = await res.json();
      if(data.success) {
        showToast("Medicine marked as dispensed & stock updated!", "success");
        loadPharmacyOrders();
      } else {
        showToast("Failed to dispense: " + data.message, "error");
      }
    } catch (err) {
      console.error("Error dispensing medicine:", err);
      showToast("Error connecting to server.", "error");
    }
  }

  let allStock = [];
  let stockSearchQuery = '';

  async function loadPharmacyStock() {
    try {
      const res = await fetch("/api/pharmacy-stock", { credentials: "same-origin" });
      const data = await res.json();
      if(data.success) {
        allStock = data.stock;
        renderStock();
      }
    } catch (err) {
      console.error(err);
    }
  }

  function renderStock() {
    const list = document.getElementById("stockList");
    let filtered = allStock;
    if (stockSearchQuery) {
      const q = stockSearchQuery.toLowerCase();
      filtered = filtered.filter(s => s.medicine_name.toLowerCase().includes(q));
    }
    
    const trackedCount = allStock.length;
    const lowCount = allStock.filter(s => s.stock_quantity <= s.min_stock_level).length;
    
    const sixtyDaysFromNow = new Date();
    sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);
    const expiringCount = allStock.filter(s => new Date(s.expiry_date) <= sixtyDaysFromNow).length;
    
    document.getElementById("statTracked").textContent = trackedCount;
    document.getElementById("statLow").textContent = lowCount;
    document.getElementById("statExpiring").textContent = expiringCount;
    document.getElementById("stockCount").textContent = lowCount > 0 ? lowCount : trackedCount;
    
    if (filtered.length === 0) {
      list.innerHTML = `<p style="padding:20px; text-align:center; color:#64748b;">No stock items found.</p>`;
      return;
    }

    list.innerHTML = filtered.map(item => {
      let stockColor = '#047857'; // Green
      let statusLabel = 'Healthy';
      if (item.stock_quantity === 0) { stockColor = '#b91c1c'; statusLabel = 'Out of Stock'; }
      else if (item.stock_quantity <= item.min_stock_level) { stockColor = '#d97706'; statusLabel = 'Low Stock'; }

      return `
      <div class="stock-list-item">
        <div class="stock-info" style="flex: 1;">
          <h4 style="margin-bottom: 4px;">${escapeHtml(item.medicine_name)} <span style="font-size: 12px; color: #94a3b8; font-weight: 400;">${escapeHtml(item.category || '')}</span></h4>
          <div style="font-size: 13px; color: #64748b;">
            Batch: ${escapeHtml(item.batch_number)} &nbsp;|&nbsp; Exp: ${item.expiry_date ? item.expiry_date.split('T')[0] : 'N/A'} &nbsp;|&nbsp; Min: ${item.min_stock_level}
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="text-align: right;">
            <div style="font-size: 20px; font-weight: 700; font-family: serif; color: ${stockColor}; margin-bottom: 2px;">
              ${item.stock_quantity} <span style="font-size: 12px; color: #64748b;">left</span>
            </div>
            <span style="font-size: 11px; font-weight: 600; color: ${stockColor};">${statusLabel}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <button onclick="window.__editStock(${item.id}, '${escapeHtml(item.medicine_name)}', '${escapeHtml(item.category)}', '${escapeHtml(item.batch_number)}', '${item.expiry_date ? item.expiry_date.split('T')[0] : ''}', ${item.stock_quantity}, ${item.min_stock_level}, ${item.unit_price || 0})" style="padding: 4px 10px; font-size: 12px; border: 1px solid #e2e8f0; background: white; border-radius: 6px; cursor: pointer; color: #334155;">Edit</button>
            <button onclick="window.__deleteStock(${item.id})" style="padding: 4px 10px; font-size: 12px; border: 1px solid #fca5a5; background: #fef2f2; border-radius: 6px; cursor: pointer; color: #b91c1c;">Delete</button>
          </div>
        </div>
      </div>
      `;
    }).join("");
  }

  // --- EDIT STOCK ---
  window.__editStock = function(id, name, category, batch, expiry, qty, minLevel, price) {
    document.getElementById('stockMedName').value = name;
    document.getElementById('stockCategory').value = category;
    document.getElementById('stockBatch').value = batch;
    document.getElementById('stockExpiry').value = expiry;
    document.getElementById('stockQty').value = qty;
    document.getElementById('stockPrice').value = price || '';
    const minInput = document.getElementById('stockMinLevel');
    if (minInput) minInput.value = minLevel;
    
    // Set editing mode
    const form = document.getElementById('addStockForm');
    form.setAttribute('data-edit-id', id);
    
    const modal = document.getElementById('addStockModal');
    modal.classList.add('show');
  };

  // --- DELETE STOCK ---
  window.__deleteStock = async function(id) {
    if (!confirm('Are you sure you want to delete this stock entry?')) return;
    try {
      const res = await fetch(`/api/pharmacy-stock/${id}`, { method: 'DELETE', credentials: 'same-origin' });
      const data = await res.json();
      if (data.success) {
        loadPharmacyStock();
      } else {
        alert('Failed: ' + data.message);
      }
    } catch (err) {
      console.error(err);
      alert('Server error');
    }
  };

  function setupStockModal() {
    const modal = document.getElementById("addStockModal");
    
     function openModal() {
      document.getElementById('addStockForm').removeAttribute('data-edit-id');
      document.getElementById('addStockForm').reset();
      modal.classList.add("show");
    }
    function closeModal() { modal.classList.remove("show"); }
    
    document.getElementById("addStockBtn").addEventListener("click", openModal);
    document.getElementById("closeStockModal").addEventListener("click", closeModal);
    
    // Second cancel button inside modal body
    const closeBtn2 = document.getElementById("closeStockModal2");
    if (closeBtn2) closeBtn2.addEventListener("click", closeModal);
    
    // Close on clicking backdrop
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });

    document.getElementById("addStockForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;
      const editId = form.getAttribute('data-edit-id');
      const minInput = document.getElementById('stockMinLevel');
      
      const payload = {
        medicineName: document.getElementById("stockMedName").value,
        category: document.getElementById("stockCategory").value,
        batchNumber: document.getElementById("stockBatch").value,
        expiryDate: document.getElementById("stockExpiry").value,
        stockQuantity: parseInt(document.getElementById("stockQty").value, 10),
        minStockLevel: minInput ? parseInt(minInput.value, 10) || 10 : 10,
        unitPrice: parseFloat(document.getElementById("stockPrice").value) || null
      };

      const url = editId ? `/api/pharmacy-stock/${editId}` : '/api/pharmacy-stock';
      const method = editId ? 'PUT' : 'POST';

      try {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: "same-origin"
        });
        const data = await res.json();
        if (data.success) {
          alert(editId ? "Stock updated successfully" : "Stock added successfully");
          closeModal();
          form.reset();
          form.removeAttribute('data-edit-id');
          loadPharmacyStock();
        } else {
          alert("Failed: " + data.message);
        }
      } catch (err) {
        console.error(err);
        alert("Server error");
      }
    });
    
    document.getElementById("stockSearchInput").addEventListener("input", (e) => {
      stockSearchQuery = e.target.value.trim();
      renderStock();
    });
  }

  // --- SUMMARY MANAGEMENT ---
  async function updateSummary() {
    // Ensure we have latest data
    await Promise.all([
      fetch("/api/pharmacy-orders", { credentials: "same-origin" }).then(res => res.json()).then(data => { if(data.success) allOrders = data.orders; }),
      fetch("/api/pharmacy-stock", { credentials: "same-origin" }).then(res => res.json()).then(data => { if(data.success) allStock = data.stock; })
    ]);

    const todayStr = new Date().toISOString().split('T')[0];
    
    // Dispensed today
    const dispensedToday = allOrders.filter(o => o.status === 'dispensed' && o.updated_at && o.updated_at.startsWith(todayStr)).length;
    
    // Waiting
    const waiting = allOrders.filter(o => o.status === 'pending_pharmacy').length;
    
    // Revenue billed (stubbed, assuming 0 for now as billing isn't fully linked to orders in our basic schema yet, or we sum amount)
    // For now we'll sum up some arbitrary logic or 0
    let revenue = 0;
    
    // Low stock items
    const lowStockCount = allStock.filter(s => s.stock_quantity <= s.min_stock_level && s.stock_quantity > 0).length;
    const outOfStockCount = allStock.filter(s => s.stock_quantity === 0).length;
    const totalLow = lowStockCount + outOfStockCount;

    document.getElementById("sumDispensed").textContent = dispensedToday;
    document.getElementById("sumWaiting").textContent = waiting;
    document.getElementById("sumRevenue").textContent = "₹" + revenue;
    document.getElementById("sumLowStock").textContent = totalLow;

    // Most given out
    const medCounts = {};
    allOrders.filter(o => o.status === 'dispensed').forEach(o => {
      medCounts[o.medicine_name] = (medCounts[o.medicine_name] || 0) + 1;
    });
    
    const sortedMeds = Object.entries(medCounts).sort((a,b) => b[1] - a[1]).slice(0, 5);
    const mostGivenList = document.getElementById("sumMostGivenList");
    if (sortedMeds.length === 0) {
      mostGivenList.innerHTML = `<p style="color: #64748b; font-size: 14px;">No medicines dispensed yet.</p>`;
    } else {
      mostGivenList.innerHTML = sortedMeds.map(([name, count]) => `
        <div style="display: flex; justify-content: space-between; padding: 12px 16px; background: #f8fafc; border-radius: 8px; margin-bottom: 8px;">
          <strong style="color: var(--navy-dark);">${escapeHtml(name)}</strong>
          <span style="color: #64748b; font-size: 13px;">${count} given</span>
        </div>
      `).join("");
    }

    // Expired stock
    const now = new Date();
    const expiredStock = allStock.filter(s => new Date(s.expiry_date) < now);
    const expiredList = document.getElementById("sumExpiredList");
    if (expiredStock.length === 0) {
      expiredList.innerHTML = `<p style="color: #64748b; font-size: 14px;">Nothing expired right now.</p>`;
    } else {
      expiredList.innerHTML = expiredStock.map(s => `
        <div style="display: flex; justify-content: space-between; padding: 12px 16px; background: #fef2f2; border-radius: 8px; margin-bottom: 8px; border: 1px solid #fca5a5;">
          <strong style="color: #b91c1c;">${escapeHtml(s.medicine_name)} (Batch: ${escapeHtml(s.batch_number)})</strong>
          <span style="color: #b91c1c; font-size: 13px;">Expired ${s.expiry_date.split('T')[0]}</span>
        </div>
      `).join("");
    }
  }

  async function init() {
    const user = await guardSession();
    if (!user) return;
    wireLogout();
    loadPharmacyOrders();
    
    // Wire Sub Tabs (Pending vs History)
    const tabPending = document.getElementById("tabPending");
    const tabHistory = document.getElementById("tabHistory");
    
    tabPending.addEventListener("click", () => {
      currentTab = "pending";
      tabPending.classList.add("active");
      tabHistory.classList.remove("active");
      renderTable();
    });
    
    tabHistory.addEventListener("click", () => {
      currentTab = "history";
      tabHistory.classList.add("active");
      tabPending.classList.remove("active");
      renderTable();
    });

    document.getElementById("searchInput").addEventListener("input", (e) => {
      searchQuery = e.target.value.trim();
      renderTable();
    });

    // Wire Main Nav Tabs
    const navPrescriptions = document.getElementById("navPrescriptions");
    const navStock = document.getElementById("navStock");
    const navSummary = document.getElementById("navSummary");
    const navReorder = document.getElementById("navReorder");
    const navBilling = document.getElementById("navBilling");
    const navPatients = document.getElementById("navPatients");
    
    const sectionPrescriptions = document.getElementById("sectionPrescriptions");
    const sectionStock = document.getElementById("sectionStock");
    const sectionSummary = document.getElementById("sectionSummary");
    const sectionReorder = document.getElementById("sectionReorder");
    const sectionBilling = document.getElementById("sectionBilling");
    const sectionPatients = document.getElementById("sectionPatients");
    
    function hideAllSections() {
      if (sectionPrescriptions) sectionPrescriptions.hidden = true;
      if (sectionStock) sectionStock.hidden = true;
      if (sectionSummary) sectionSummary.hidden = true;
      if (sectionReorder) sectionReorder.hidden = true;
      if (sectionBilling) sectionBilling.hidden = true;
      if (sectionPatients) sectionPatients.hidden = true;
      document.querySelectorAll('.pill-tab').forEach(t => t.classList.remove('active'));
    }

    if (navPrescriptions) {
      navPrescriptions.addEventListener("click", () => {
        hideAllSections();
        navPrescriptions.classList.add("active");
        if (sectionPrescriptions) sectionPrescriptions.hidden = false;
      });
    }
    
    if (navStock) {
      navStock.addEventListener("click", () => {
        hideAllSections();
        navStock.classList.add("active");
        if (sectionStock) sectionStock.hidden = false;
        loadPharmacyStock();
      });
    }
    
    if (navSummary) {
      navSummary.addEventListener("click", () => {
        hideAllSections();
        navSummary.classList.add("active");
        if (sectionSummary) sectionSummary.hidden = false;
        updateSummary();
      });
    }

  // --- REORDER & PURCHASE ORDERS ---
  async function loadReorderSection() {
    try {
      // 1. Fetch latest stock
      const stockRes = await fetch("/api/pharmacy-stock", { credentials: "same-origin" });
      const stockData = await stockRes.json();
      if (stockData.success) {
        allStock = stockData.stock;
        renderReorderTable();
      }

      // 2. Fetch purchase orders
      const poRes = await fetch("/api/pharmacy-purchase-orders", { credentials: "same-origin" });
      const poData = await poRes.json();
      if (poData.success) {
        renderPOTable(poData.orders);
      }
    } catch (err) {
      console.error("Error loading reorder section:", err);
    }
  }

  function renderReorderTable() {
    const tbody = document.getElementById("reorderTableBody");
    const emptyState = document.getElementById("reorderEmptyState");
    const lowStock = allStock.filter(s => s.stock_quantity <= s.min_stock_level);

    if (!tbody || !emptyState) return;

    if (lowStock.length === 0) {
      tbody.innerHTML = "";
      emptyState.style.display = "block";
      return;
    }

    emptyState.style.display = "none";
    tbody.innerHTML = lowStock.map(item => {
      const suggestedQty = Math.max(item.min_stock_level * 5, 100);
      return `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 14px 16px; font-weight: 600; color: #0f172a;">${escapeHtml(item.medicine_name)}</td>
          <td style="padding: 14px 16px; color: #b91c1c; font-weight: 700;">${item.stock_quantity} units</td>
          <td style="padding: 14px 16px; color: #64748b;">${item.min_stock_level} units</td>
          <td style="padding: 14px 16px; font-weight: 600; color: var(--navy);">${suggestedQty} units</td>
        </tr>
      `;
    }).join("");
  }

  function renderPOTable(orders) {
    const tbody = document.getElementById("poTableBody");
    const emptyState = document.getElementById("poEmptyState");

    if (!tbody || !emptyState) return;

    if (!orders || orders.length === 0) {
      tbody.innerHTML = "";
      emptyState.style.display = "block";
      return;
    }

    emptyState.style.display = "none";
    tbody.innerHTML = orders.map(po => {
      const dateStr = po.created_at ? new Date(po.created_at).toLocaleDateString() : 'N/A';
      return `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 14px 16px; font-weight: 700; color: var(--navy-dark);">${escapeHtml(po.po_number)}</td>
          <td style="padding: 14px 16px; color: #334155;">${escapeHtml(po.supplier_name)}</td>
          <td style="padding: 14px 16px; color: #64748b;">${escapeHtml(po.items_summary)}</td>
          <td style="padding: 14px 16px; color: #64748b;">${dateStr}</td>
          <td style="padding: 14px 16px;">
            <span style="background: #ecfdf5; color: #047857; padding: 4px 10px; border-radius: 6px; font-weight: 600; font-size: 12px;">${escapeHtml(po.status)}</span>
          </td>
        </tr>
      `;
    }).join("");
  }

  if (navReorder) {
    navReorder.addEventListener("click", () => {
      hideAllSections();
      navReorder.classList.add("active");
      if (sectionReorder) sectionReorder.hidden = false;
      loadReorderSection();
    });
  }

  const btnGeneratePO = document.getElementById("btnGeneratePO");
  if (btnGeneratePO) {
    btnGeneratePO.addEventListener("click", async () => {
      try {
        const res = await fetch("/api/pharmacy-purchase-orders/auto-generate", {
          method: "POST",
          credentials: "same-origin"
        });
        const data = await res.json();
        if (data.success) {
          alert(data.message);
          loadReorderSection();
        } else {
          alert(data.message);
        }
      } catch (err) {
        console.error("Generate PO error:", err);
        alert("Server error");
      }
    });
  }

  // --- BILLING & INVOICES ---
  let allInvoices = [];
  let billingSearchQuery = "";
  let billingFilterStatus = "all";

  async function loadBillingSection() {
    try {
      const res = await fetch("/api/pharmacy-invoices", { credentials: "same-origin" });
      const data = await res.json();
      if (data.success) {
        allInvoices = data.invoices || [];
        
        // Update Stats
        const stats = data.stats || {};
        document.getElementById("billingTotalBilled").textContent = "₹" + (stats.totalBilled || 0).toFixed(2);
        document.getElementById("billingCollected").textContent = "₹" + (stats.collected || 0).toFixed(2);
        document.getElementById("billingPendingCount").textContent = stats.pendingCount || 0;

        applyBillingFilters();
      }
    } catch (err) {
      console.error("Error loading billing section:", err);
    }
  }

  function applyBillingFilters() {
    let filtered = allInvoices;

    // Filter status
    if (billingFilterStatus === 'paid') {
      filtered = filtered.filter(i => i.payment_status === 'Paid');
    } else if (billingFilterStatus === 'pending') {
      filtered = filtered.filter(i => i.payment_status !== 'Paid');
    }

    // Search query
    if (billingSearchQuery) {
      const q = billingSearchQuery.toLowerCase();
      filtered = filtered.filter(i => 
        (i.invoice_number && i.invoice_number.toLowerCase().includes(q)) ||
        (i.patient_name && i.patient_name.toLowerCase().includes(q)) ||
        (i.patient_uhid && i.patient_uhid.toLowerCase().includes(q))
      );
    }

    renderBillingTable(filtered);
  }

  function renderBillingTable(invoices) {
    const tbody = document.getElementById("billingTableBody");
    const emptyState = document.getElementById("billingEmptyState");

    if (!tbody || !emptyState) return;

    if (!invoices || invoices.length === 0) {
      tbody.innerHTML = "";
      emptyState.style.display = "block";
      return;
    }

    emptyState.style.display = "none";
    tbody.innerHTML = invoices.map(inv => {
      const isPaid = inv.payment_status === 'Paid';
      const statusBadge = isPaid
        ? `<span style="background: #ecfdf5; color: #047857; padding: 4px 12px; border-radius: 999px; font-weight: 600; font-size: 12px;">Paid</span>`
        : `<span style="background: #fef3c7; color: #b45309; padding: 4px 12px; border-radius: 999px; font-weight: 600; font-size: 12px;">Pending</span>`;

      const actionBtn = isPaid
        ? `<button onclick="window.__printInvoiceSlip(${inv.id})" style="display: inline-flex; align-items: center; gap: 5px; margin-left: 8px; padding: 6px 12px; background: white; border: 1px solid #cbd5e1; color: #334155; border-radius: 8px; font-weight: 500; font-size: 12px; cursor: pointer;">
             <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> Receipt
           </button>`
        : `<button onclick="window.__markInvoicePaidModal(${inv.id})" style="margin-left: 8px; padding: 6px 14px; background: #0f766e; color: white; border: none; border-radius: 8px; font-weight: 600; font-size: 12px; cursor: pointer;">Mark Paid</button>
           <button onclick="window.__printInvoiceSlip(${inv.id})" style="display: inline-flex; align-items: center; gap: 5px; margin-left: 6px; padding: 6px 10px; background: white; border: 1px solid #cbd5e1; color: #334155; border-radius: 8px; font-weight: 500; font-size: 12px; cursor: pointer;">
             <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> Print
           </button>`;

      const pMethod = inv.payment_type || 'Cash';
      const methodBadge = `<span style="background: #f1f5f9; color: #475569; padding: 3px 10px; border-radius: 6px; font-weight: 600; font-size: 12px; border: 1px solid #e2e8f0;">${escapeHtml(pMethod)}</span>`;

      return `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 14px 16px; font-weight: 700; color: #0f172a;">${escapeHtml(inv.invoice_number)}</td>
          <td style="padding: 14px 16px; color: #334155; font-weight: 500;">${escapeHtml(inv.patient_name)}</td>
          <td style="padding: 14px 16px; color: #64748b;">${inv.item_count} item(s)</td>
          <td style="padding: 14px 16px; font-weight: 600; color: #0f172a;">₹${(parseFloat(inv.total_amount) || 0).toFixed(2)}</td>
          <td style="padding: 14px 16px;">${statusBadge}</td>
          <td style="padding: 14px 16px;">${methodBadge}</td>
          <td style="padding: 14px 16px;">${actionBtn}</td>
        </tr>
      `;
    }).join("");
  }

  // --- CSV EXPORT FOR SALES REPORT ---
  function exportBillingCSV() {
    if (allInvoices.length === 0) return showToast("No invoices available to export.", "info");

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Invoice Number,Patient Name,UHID,Payment Type,Items Count,Total Amount,Status,Date\n";

    allInvoices.forEach(inv => {
      const dateStr = inv.created_at ? new Date(inv.created_at).toLocaleString() : 'N/A';
      const row = [
        `"${inv.invoice_number || ''}"`,
        `"${inv.patient_name || ''}"`,
        `"${inv.patient_uhid || ''}"`,
        `"${inv.payment_type || 'Cash'}"`,
        inv.item_count || 1,
        (parseFloat(inv.total_amount) || 0).toFixed(2),
        `"${inv.payment_status || 'Pending'}"`,
        `"${dateStr}"`
      ].join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const today = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `pharmacy_sales_report_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const btnExportBilling = document.getElementById("btnExportBillingReport");
  if (btnExportBilling) btnExportBilling.addEventListener("click", exportBillingCSV);

  // Billing Search & Filter Event Listeners
  const billingSearchInput = document.getElementById("billingSearchInput");
  if (billingSearchInput) {
    billingSearchInput.addEventListener("input", (e) => {
      billingSearchQuery = e.target.value.trim();
      applyBillingFilters();
    });
  }

  const filterBillAll = document.getElementById("filterBillAll");
  const filterBillPaid = document.getElementById("filterBillPaid");
  const filterBillPending = document.getElementById("filterBillPending");

  if (filterBillAll && filterBillPaid && filterBillPending) {
    filterBillAll.addEventListener("click", () => {
      billingFilterStatus = "all";
      filterBillAll.classList.add("active");
      filterBillPaid.classList.remove("active");
      filterBillPending.classList.remove("active");
      applyBillingFilters();
    });

    filterBillPaid.addEventListener("click", () => {
      billingFilterStatus = "paid";
      filterBillPaid.classList.add("active");
      filterBillAll.classList.remove("active");
      filterBillPending.classList.remove("active");
      applyBillingFilters();
    });

    filterBillPending.addEventListener("click", () => {
      billingFilterStatus = "pending";
      filterBillPending.classList.add("active");
      filterBillAll.classList.remove("active");
      filterBillPaid.classList.remove("active");
      applyBillingFilters();
    });
  }

  window.__markInvoicePaidModal = function(invoiceId) {
    const inv = allInvoices.find(i => String(i.id) === String(invoiceId));
    if (!inv) {
      console.warn("Invoice not found in list for ID:", invoiceId);
      return;
    }

    const modal = document.getElementById("payModal");
    if (!modal) {
      console.warn("payModal element not found");
      return;
    }

    document.getElementById("payInvoiceId").value = invoiceId;
    document.getElementById("payModalInvoiceNum").textContent = `Invoice #${inv.invoice_number}`;
    document.getElementById("payModalAmount").textContent = `₹${(parseFloat(inv.total_amount) || 0).toFixed(2)}`;

    modal.classList.add("show");
    modal.style.display = "flex";
  };

  function setupPayModal() {
    const modal = document.getElementById("payModal");
    const closeBtn = document.getElementById("closePayModal");
    const closeBtn2 = document.getElementById("closePayModal2");
    const payForm = document.getElementById("payForm");

    if (!modal) return;

    function hidePayModal() {
      modal.classList.remove("show");
      modal.style.display = "none";
    }

    if (closeBtn) closeBtn.addEventListener("click", hidePayModal);
    if (closeBtn2) closeBtn2.addEventListener("click", hidePayModal);

    modal.addEventListener("click", (e) => {
      if (e.target === modal) hidePayModal();
    });

    // Toggle active state on pay tiles
    const payTiles = modal.querySelectorAll(".pay-tile");
    payTiles.forEach(tile => {
      tile.addEventListener("click", () => {
        payTiles.forEach(t => t.classList.remove("active"));
        tile.classList.add("active");
        const radio = tile.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
      });
    });

    if (payForm) {
      payForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const invoiceId = document.getElementById("payInvoiceId").value;
        const selectedRadio = document.querySelector('input[name="payMethod"]:checked');
        const method = selectedRadio ? selectedRadio.value : "Cash";

        hidePayModal();
        if (invoiceId) {
          await window.__markInvoicePaid(invoiceId, method);
        }
      });
    }
  }

  // --- PRINT SLIP UTILITIES ---
  window.__printPrescriptionSlip = function(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return alert("Order details not found.");
    
    const now = new Date();
    const dateStr = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

    openPrintWindow({
      title: "PHARMACY DISPENSING SLIP",
      slipNo: `SLIP-${order.id}`,
      dateStr: dateStr,
      patientName: order.patient_name || 'Patient (' + order.patient_uhid + ')',
      uhid: order.patient_uhid,
      doctor: order.doctor_user_id,
      medName: order.medicine_name,
      dosage: order.dosage,
      duration: order.duration + " Days",
      amount: order.amount ? `₹${parseFloat(order.amount).toFixed(2)}` : '₹15.00',
      status: 'DISPENSED'
    });
  };

  window.__printInvoiceSlip = async function(invoiceId) {
    try {
      const res = await fetch("/api/pharmacy-invoices", { credentials: "same-origin" });
      const data = await res.json();
      if (!data.success) return alert("Error fetching invoice.");
      
      const inv = data.invoices.find(i => i.id === invoiceId);
      if (!inv) return alert("Invoice not found.");

      const dateStr = inv.created_at ? new Date(inv.created_at).toLocaleString() : new Date().toLocaleString();

      openPrintWindow({
        title: "PHARMACY INVOICE & RECEIPT",
        slipNo: inv.invoice_number,
        dateStr: dateStr,
        patientName: inv.patient_name,
        uhid: inv.patient_uhid,
        doctor: "N/A",
        medName: `Prescription Medicine (${inv.item_count} item)`,
        dosage: "As Prescribed",
        duration: "N/A",
        amount: `₹${(parseFloat(inv.total_amount) || 0).toFixed(2)}`,
        status: inv.payment_status.toUpperCase()
      });
    } catch (err) {
      console.error(err);
      alert("Print error.");
    }
  };

  function openPrintWindow(info) {
    const hospName = (sessionUser && sessionUser.hospitalName) ? sessionUser.hospitalName.toUpperCase() : 'CORE5 MEDISYS HOSPITAL';
    const pharmacistName = (sessionUser && (sessionUser.fullName || sessionUser.userId)) ? sessionUser.fullName || sessionUser.userId : 'Staff';

    const printWin = window.open('', '_blank', 'width=650,height=700');
    if (!printWin) return alert("Please allow popups to print the receipt.");

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${info.title} - ${info.slipNo}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1e293b; line-height: 1.5; }
          .header { text-align: center; border-bottom: 2px solid #0f2f6e; padding-bottom: 15px; margin-bottom: 20px; }
          .header h1 { font-size: 22px; margin: 0; color: #0f2f6e; letter-spacing: 0.5px; text-transform: uppercase; }
          .header p { font-size: 13px; color: #64748b; margin: 4px 0 0 0; }
          .meta-grid { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 13px; background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #e2e8f0; }
          .table { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 13px; }
          .table th { background: #0f2f6e; color: white; text-align: left; padding: 10px 12px; border-radius: 4px; }
          .table td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
          .total-box { text-align: right; font-size: 16px; font-weight: bold; margin-bottom: 30px; }
          .footer { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 12px; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 20px; }
          .stamp { font-weight: 600; color: #0f2f6e; }
          @media print {
            body { padding: 10px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${escapeHtml(hospName)}</h1>
          <p>Pharmacy Department &bull; Tax Invoice / Dispensing Slip</p>
        </div>
        
        <div class="meta-grid">
          <div>
            <strong>Receipt No:</strong> ${info.slipNo}<br/>
            <strong>Patient Name:</strong> ${escapeHtml(info.patientName)}<br/>
            <strong>UHID:</strong> ${escapeHtml(info.uhid)}
          </div>
          <div style="text-align: right;">
            <strong>Date &amp; Time:</strong> ${info.dateStr}<br/>
            <strong>Prescribed By:</strong> Dr. ${escapeHtml(info.doctor)}<br/>
            <strong>Status:</strong> <span class="stamp">${info.status}</span>
          </div>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>Item / Medicine</th>
              <th>Dosage</th>
              <th>Duration</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>${escapeHtml(info.medName)}</strong></td>
              <td>${escapeHtml(info.dosage)}</td>
              <td>${escapeHtml(info.duration)}</td>
              <td style="text-align: right;">${info.amount}</td>
            </tr>
          </tbody>
        </table>

        <div class="total-box">
          Total Amount: <span style="color: #0f2f6e;">${info.amount}</span>
        </div>

        <div class="footer">
          <div>
            Thank you for visiting! Wish you good health.<br/>
            <em>* Computer generated slip. Signature not mandatory.</em>
          </div>
          <div style="text-align: right;">
            <br/><br/>
            ________________________<br/>
            Pharmacist: <strong>${escapeHtml(pharmacistName)}</strong>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  };

  window.__markInvoicePaid = async function(invoiceId, paymentType = "Cash") {
    try {
      const res = await fetch(`/api/pharmacy-invoices/${invoiceId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentType }),
        credentials: "same-origin"
      });
      const data = await res.json();
      if (data.success) {
        showToast("Payment collected! Invoice marked as Paid.", "success");
        loadBillingSection();
      } else {
        showToast("Failed to mark as paid: " + data.message, "error");
      }
    } catch (err) {
      console.error("Mark paid error:", err);
      showToast("Server error. Please try again.", "error");
    }
  };

  const navInteraction = document.getElementById("navInteraction");
  const sectionInteraction = document.getElementById("sectionInteraction");

  const originalHideAllSections = hideAllSections;
  hideAllSections = function() {
    originalHideAllSections();
    if (sectionInteraction) sectionInteraction.hidden = true;
  };

  if (navBilling) {
    navBilling.addEventListener("click", () => {
      hideAllSections();
      navBilling.classList.add("active");
      if (sectionBilling) sectionBilling.hidden = false;
      loadBillingSection();
    });
  }

  if (navInteraction) {
    navInteraction.addEventListener("click", async () => {
      hideAllSections();
      navInteraction.classList.add("active");
      if (sectionInteraction) sectionInteraction.hidden = false;

      // Load stock items for direct sale dropdown
      try {
        const stockRes = await fetch("/api/pharmacy-stock", { credentials: "same-origin" });
        const stockData = await stockRes.json();
        if (stockData.success) {
          allStock = stockData.stock;
          populateDirectSaleStockSelect();
        }
      } catch (err) {
        console.error("Error loading stock for direct sale:", err);
      }
    });
  }

  // --- DIRECT COUNTER SALE (OTC / AUTO DEDUCT) ---
  function populateDirectSaleStockSelect() {
    const select = document.getElementById("dsStockSelect");
    if (!select) return;

    if (allStock.length === 0) {
      select.innerHTML = `<option value="">-- No stock available --</option>`;
      return;
    }

    const availableStock = allStock.filter(s => s.stock_quantity > 0);
    if (availableStock.length === 0) {
      select.innerHTML = `<option value="">-- All stock items out of stock --</option>`;
      return;
    }

    select.innerHTML = `<option value="">-- Select Medicine --</option>` + availableStock.map(s => {
      return `<option value="${s.id}" data-stock="${s.stock_quantity}">${escapeHtml(s.medicine_name)} (Batch: ${escapeHtml(s.batch_number)}) - Qty: ${s.stock_quantity} left</option>`;
    }).join("");
  }

  const directSaleForm = document.getElementById("directSaleForm");
  if (directSaleForm) {
    directSaleForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const stockId = document.getElementById("dsStockSelect").value;
      const quantity = parseInt(document.getElementById("dsQuantity").value, 10);
      const patientName = document.getElementById("dsPatientName").value;
      const phone = document.getElementById("dsPhone").value;

      if (!stockId) return showToast("Please select a medicine from stock.", "error");
      if (!quantity || quantity <= 0) return showToast("Please enter a valid quantity.", "error");

      try {
        const res = await fetch("/api/pharmacy-direct-sale", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stockId, quantity, patientName, phone }),
          credentials: "same-origin"
        });
        const data = await res.json();
        if (data.success) {
          showToast(data.message + " Bill sent to Billing tab.", "success");
          
          directSaleForm.reset();
          
          // Refresh stock & billing in real-time
          await loadPharmacyStock();
          populateDirectSaleStockSelect();
          loadBillingSection();
        } else {
          showToast("Failed: " + data.message, "error");
        }
      } catch (err) {
        console.error("Direct sale error:", err);
        showToast("Server error. Please try again.", "error");
      }
    });
  }

  if (navInteraction) {
    navInteraction.addEventListener("click", async () => {
      hideAllSections();
      navInteraction.classList.add("active");
      if (sectionInteraction) sectionInteraction.hidden = false;
      
      // Load latest stock and populate dropdown
      const stockRes = await fetch("/api/pharmacy-stock", { credentials: "same-origin" });
      const stockData = await stockRes.json();
      if (stockData.success) {
        allStock = stockData.stock;
        populateDirectSaleStockSelect();
      }
    });
  }

  // --- PATIENTS DIRECTORY & HISTORY ---
  let allPatients = [];
  let selectedPatient = null;

  async function loadPatientsSection(query = '') {
    try {
      const res = await fetch(`/api/pharmacy-patients?search=${encodeURIComponent(query)}`, { credentials: "same-origin" });
      const data = await res.json();
      if (data.success) {
        allPatients = data.patients || [];
        renderPatientsList();
      }
    } catch (err) {
      console.error("Error loading pharmacy patients:", err);
    }
  }

  function renderPatientsList() {
    const container = document.getElementById("patientsListContainer");
    if (!container) return;

    if (allPatients.length === 0) {
      container.innerHTML = `<p style="padding: 20px; text-align: center; color: #94a3b8; font-size: 13.5px; margin: 0;">No patients found.</p>`;
      return;
    }

    container.innerHTML = allPatients.map(p => {
      const isSelected = selectedPatient && selectedPatient.uhid === p.uhid;
      const borderStyle = isSelected ? 'border-color: var(--navy); background: #f0f3ff;' : 'border-color: #e2e8f0; background: white;';
      const lastDate = p.last_dispensed_at ? new Date(p.last_dispensed_at).toLocaleDateString() : 'No history';

      return `
        <div onclick="window.__selectPatient('${escapeHtml(p.uhid)}')" style="padding: 12px 14px; border-radius: 10px; border: 1px solid; ${borderStyle} cursor: pointer; transition: all 0.15s ease;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
            <strong style="font-size: 14px; color: #0f172a;">${escapeHtml(p.full_name || 'Patient')}</strong>
            <span style="font-size: 11px; font-weight: 700; background: #e2e8f0; color: #475569; padding: 2px 7px; border-radius: 999px;">${p.total_prescriptions || 0} Rx</span>
          </div>
          <div style="font-size: 12.5px; color: #64748b; display: flex; justify-content: space-between;">
            <span>${escapeHtml(p.uhid)}</span>
            <span>Last: ${lastDate}</span>
          </div>
        </div>
      `;
    }).join("");
  }

  window.__selectPatient = async function(uhid) {
    selectedPatient = allPatients.find(p => p.uhid === uhid);
    renderPatientsList();

    if (!selectedPatient) return;

    // Render patient header
    const header = document.getElementById("patientDetailHeader");
    if (header) {
      header.style.display = "block";
      document.getElementById("pdName").textContent = selectedPatient.full_name || 'Patient';
      document.getElementById("pdUhid").textContent = selectedPatient.uhid;
      document.getElementById("pdGender").textContent = selectedPatient.gender || 'N/A';
      document.getElementById("pdDob").textContent = selectedPatient.dob ? selectedPatient.dob.split('T')[0] : 'N/A';
      document.getElementById("pdPrescriptionCount").textContent = `${selectedPatient.total_prescriptions || 0} Prescriptions`;
    }

    // Fetch history
    try {
      const res = await fetch(`/api/pharmacy-patients/${encodeURIComponent(uhid)}/history`, { credentials: "same-origin" });
      const data = await res.json();
      if (data.success) {
        renderPatientTimeline(data.orders || []);
      }
    } catch (err) {
      console.error("Error fetching patient history:", err);
    }
  };

  function renderPatientTimeline(history) {
    const container = document.getElementById("patientTimelineContainer");
    if (!container) return;

    if (history.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: #94a3b8;">
          <p style="margin: 0; font-size: 14px;">No pharmacy history found for this patient.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = history.map(item => {
      const dateStr = item.created_at ? new Date(item.created_at).toLocaleString() : 'N/A';
      const isDispensed = item.status === 'dispensed';
      const statusBadge = isDispensed 
        ? `<span style="background: #ecfdf5; color: #047857; padding: 3px 10px; border-radius: 6px; font-weight: 700; font-size: 11.5px;">Dispensed</span>`
        : `<span style="background: #fef3c7; color: #b45309; padding: 3px 10px; border-radius: 6px; font-weight: 700; font-size: 11.5px;">Pending</span>`;

      return `
        <div style="display: flex; gap: 16px; margin-bottom: 20px; position: relative;">
          <div style="width: 12px; height: 12px; border-radius: 50%; background: var(--navy); margin-top: 6px; flex-shrink: 0; position: relative; z-index: 2;"></div>
          <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
              <div>
                <strong style="font-size: 15px; color: #0f172a;">${escapeHtml(item.medicine_name)}</strong>
                <div style="font-size: 13px; color: #64748b; margin-top: 2px;">
                  Dose: ${escapeHtml(item.dosage)} &bull; Duration: ${escapeHtml(item.duration)} Days &bull; Dr. ${escapeHtml(item.doctor_name || item.doctor_user_id)}
                </div>
              </div>
              <div style="text-align: right;">
                ${statusBadge}
                <div style="font-size: 11.5px; color: #94a3b8; margin-top: 4px;">${dateStr}</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  const patientSearchInput = document.getElementById("patientSearchInput");
  if (patientSearchInput) {
    let timeoutId = null;
    patientSearchInput.addEventListener("input", (e) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        loadPatientsSection(e.target.value.trim());
      }, 300);
    });
  }

  if (navPatients) {
    navPatients.addEventListener("click", () => {
      hideAllSections();
      navPatients.classList.add("active");
      if (sectionPatients) sectionPatients.hidden = false;
      loadPatientsSection();
    });
  }

  setupStockModal();
  setupPayModal();

  setInterval(loadPharmacyOrders, 15000);
}

  document.addEventListener("DOMContentLoaded", init);
})();
