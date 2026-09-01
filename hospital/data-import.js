(function () {
  function t(key, fallback, params) {
    if (window.i18n && typeof window.i18n.t === "function") {
      const res = window.i18n.t(key, params);
      if (res && res !== key) return res;
    }
    const text = fallback || key;
    if (!params) return text;
    return String(text).replace(/\{(\w+)\}/g, (m, k) => (params[k] !== undefined ? params[k] : m));
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c]));
  }

  let sessionUser = null;
  let currentBatch = null; // { batchId, targetEntity, fields, knownFields }
  let currentAutoBatch = null; // { batchId, totalRows, roleColumn, roleBreakdown, buckets: [...] }

  // Every entity an auto-detected row can be sorted into — used to label the
  // Import History table and to populate the "Import these as" picker for a
  // row the classifier wasn't confident about. Mirrors server/roles.js.
  const ENTITY_OPTIONS = [
    { value: "patients", label: "Patient records" },
    { value: "doctor", label: "Doctor" },
    { value: "nurse", label: "Nurse" },
    { value: "pharmacist", label: "Pharmacist" },
    { value: "pathology_staff", label: "Pathologist / Lab Staff" },
    { value: "receptionist", label: "OPD / Receptionist" },
    { value: "billing_staff", label: "Billing Staff" },
    { value: "blood_bank_staff", label: "Blood Bank Staff" },
  ];

  function entityLabelFor(entity) {
    if (entity === "auto") return t("data_import.entity_auto_short", "Mixed dataset");
    if (entity === "unclassified") return t("data_import.unclassified_title", "Unclassified");
    const found = ENTITY_OPTIONS.find((e) => e.value === entity);
    return found ? found.label : entity;
  }

  async function guardSession() {
    const res = await fetch("/api/session", { credentials: "same-origin" });
    const data = await res.json();
    if (!data.user || data.user.role !== "hospital_admin") {
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

  // ---------- Step 1: upload ----------

  function wireUpload() {
    document.getElementById("uploadBtn").addEventListener("click", async () => {
      const errorEl = document.getElementById("uploadError");
      errorEl.textContent = "";

      const fileInput = document.getElementById("importFileInput");
      const file = fileInput.files[0];
      if (!file) {
        errorEl.textContent = t("data_import.choose_file_first", "Choose a file first.");
        return;
      }

      const entity = document.getElementById("importEntitySelect").value;
      const sourceName = document.getElementById("importSourceName").value.trim();

      const formData = new FormData();
      formData.append("file", file);
      formData.append("entity", entity);
      if (sourceName) formData.append("sourceName", sourceName);

      const btn = document.getElementById("uploadBtn");
      const progressWrap = document.getElementById("analyzeProgress");
      btn.disabled = true;
      progressWrap.hidden = false;
      try {
        const res = await fetch("/api/import/upload", { method: "POST", credentials: "same-origin", body: formData });
        const data = await res.json();
        if (!data.success) {
          errorEl.textContent = data.message || t("data_import.upload_failed", "Could not analyze this file.");
          return;
        }
        if (data.targetEntity === "auto") {
          renderAutoSummary(data);
        } else {
          currentBatch = data;
          renderMappingTable(data);
        }
      } catch (err) {
        errorEl.textContent = t("common.unable_to_reach_server", "Unable to reach the server. Please try again.");
      } finally {
        btn.disabled = false;
        progressWrap.hidden = true;
      }
    });
  }

  // ---------- Step 2: mapping review ----------

  const MATCH_BADGE = {
    matched: { cls: "completed", label: () => t("data_import.match_matched", "Matched") },
    saved: { cls: "completed", label: () => t("data_import.match_matched", "Matched") },
    suggested: { cls: "in-consultation", label: () => t("data_import.match_suggested", "Suggested") },
    unmatched: { cls: "waiting", label: () => t("data_import.match_new_field", "New field") },
  };

  function fieldSelectOptions(knownFields, selectedField, selectedIsCustom, selectedIsIgnored) {
    let html = `<option value="__custom__" ${selectedIsCustom ? "selected" : ""}>${escapeHtml(t("data_import.new_custom_field", "＋ New custom field (this hospital only)"))}</option>`;
    knownFields.forEach((f) => {
      html += `<option value="${escapeHtml(f.key)}" ${selectedField === f.key ? "selected" : ""}>${escapeHtml(f.label)}${f.required ? " *" : ""}</option>`;
    });
    html += `<option value="__ignore__" ${selectedIsIgnored ? "selected" : ""}>${escapeHtml(t("data_import.ignore_field", "Ignore — discard this column"))}</option>`;
    return html;
  }

  function renderMappingTable(batch) {
    document.getElementById("uploadSection").hidden = true;
    const section = document.getElementById("mappingSection");
    section.hidden = false;

    document.getElementById("mappingSummaryHint").textContent = t(
      "data_import.mapping_summary",
      "{count} rows found, {fieldCount} columns detected. Review the matches below, then confirm.",
      { count: batch.totalRows, fieldCount: batch.fields.length }
    );

    const warningEl = document.getElementById("singleRowEntityWarning");
    if (batch.singleRowEntityWarning) {
      warningEl.textContent = t(
        "data_import.single_row_entity_warning",
        "Your hospital only has ONE facility record — it isn't a list. This file has {count} rows, so importing it will overwrite that same record {count} times over, one after another, and only the LAST row will be kept; the other {countMinusOne} will be lost. If this file is really a list of many people or records, choose \"Patient records\" instead and re-upload.",
        { count: batch.totalRows, countMinusOne: batch.totalRows - 1 }
      );
      warningEl.hidden = false;
    } else {
      warningEl.hidden = true;
      warningEl.textContent = "";
    }

    const body = document.getElementById("mappingTableBody");
    body.innerHTML = batch.fields
      .map((f, i) => {
        const badge = MATCH_BADGE[f.matchType] || MATCH_BADGE.unmatched;
        const isCustom = f.targetType === "extra_field";
        const isIgnored = f.targetType === "ignored";
        const sample = (f.sampleValues || []).filter((v) => v !== null && v !== undefined && String(v).trim() !== "")[0];
        return `<tr>
          <td><strong>${escapeHtml(f.sourceHeader)}</strong></td>
          <td class="mono-cell" style="color:var(--ink-mute, #8891a0);">${escapeHtml(sample ?? "—")}</td>
          <td><span class="queue-status ${badge.cls}">${escapeHtml(badge.label())}</span></td>
          <td>
            <select data-row="${i}" data-source-field="${escapeHtml(f.sourceHeader)}">
              ${fieldSelectOptions(batch.knownFields, isCustom || isIgnored ? null : f.targetField, isCustom, isIgnored)}
            </select>
          </td>
        </tr>`;
      })
      .join("");

    // A fresh upload always starts in Manual Mapping — Auto Mapping is a
    // deliberate choice made per review, not a remembered preference.
    document.getElementById("mappingModeManual").checked = true;
    applyMappingMode("manual", body, document.getElementById("mappingModeHint"));
  }

  // "Manual Mapping" leaves every "Maps to" dropdown editable, exactly as
  // before. "Auto Mapping" locks them at whatever the system already
  // determined was the best match for each column (the dropdowns are
  // pre-selected to that match regardless of mode — this only decides
  // whether the admin can override it before importing).
  function applyMappingMode(mode, tbody, hintEl) {
    const isAuto = mode === "auto";
    tbody.querySelectorAll("select").forEach((select) => (select.disabled = isAuto));
    if (hintEl) {
      hintEl.textContent = isAuto
        ? t("data_import.auto_mapping_hint", "The system will use its best match for every column automatically — nothing to review.")
        : t("data_import.manual_mapping_hint", "Review and adjust each column's match before importing.");
    }
  }

  function wireMappingModeToggle() {
    const body = document.getElementById("mappingTableBody");
    const hint = document.getElementById("mappingModeHint");
    document.querySelectorAll('input[name="mappingMode"]').forEach((radio) => {
      radio.addEventListener("change", () => applyMappingMode(radio.value, body, hint));
    });
  }

  function wireMappingActions() {
    document.getElementById("cancelMappingBtn").addEventListener("click", () => {
      currentBatch = null;
      document.getElementById("mappingSection").hidden = true;
      document.getElementById("uploadSection").hidden = false;
      document.getElementById("importFileInput").value = "";
    });

    document.getElementById("confirmMappingBtn").addEventListener("click", async () => {
      if (!currentBatch) return;
      const errorEl = document.getElementById("mappingError");
      errorEl.textContent = "";

      if (currentBatch.singleRowEntityWarning) {
        const proceed = confirm(
          t(
            "data_import.confirm_single_row_entity",
            "This will overwrite your hospital's one facility record {count} times and keep only the last row. Are you sure this file isn't meant to be a list of many patients/records?",
            { count: currentBatch.totalRows }
          )
        );
        if (!proceed) return;
      }

      const mappings = [...document.querySelectorAll("#mappingTableBody select")].map((select) => {
        const sourceField = select.dataset.sourceField;
        const value = select.value;
        if (value === "__custom__") return { sourceField, targetType: "extra_field", targetField: null };
        if (value === "__ignore__") return { sourceField, targetType: "ignored", targetField: null };
        return { sourceField, targetType: "column", targetField: value };
      });

      const btn = document.getElementById("confirmMappingBtn");
      btn.disabled = true;
      try {
        const mapRes = await fetch(`/api/import/${currentBatch.batchId}/mapping`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ mappings }),
        });
        const mapData = await mapRes.json();
        if (!mapData.success) {
          errorEl.textContent = mapData.message || t("data_import.mapping_save_failed", "Could not save the mapping.");
          return;
        }

        const commitRes = await fetch(`/api/import/${currentBatch.batchId}/commit`, { method: "POST", credentials: "same-origin" });
        const commitData = await commitRes.json();
        if (!commitData.success) {
          errorEl.textContent = commitData.message || t("data_import.commit_failed", "Import failed.");
          return;
        }

        const newFieldsNote = commitData.customFieldsCreated.length
          ? " " + t("data_import.new_custom_fields_note", "{count} new custom field(s) registered: {fields}.", {
              count: commitData.customFieldsCreated.length,
              fields: commitData.customFieldsCreated.map((f) => f.fieldKey).join(", "),
            })
          : "";
        const redirectedNote = commitData.fieldsAutoRedirected && commitData.fieldsAutoRedirected.length
          ? " " + t("data_import.fields_redirected_note", "{count} column(s) didn't fit the field they were mapped to and were saved as custom fields instead: {fields}.", {
              count: commitData.fieldsAutoRedirected.length,
              fields: commitData.fieldsAutoRedirected.map((f) => `"${f.fieldKey}" → ${f.targetLabel}`).join(", "),
            })
          : "";
        const errorReasonsNote = commitData.failedRows && commitData.sampleErrors && commitData.sampleErrors.length
          ? " " + t("data_import.sample_errors_note", "Reason(s): {reasons}", { reasons: commitData.sampleErrors.join(" | ") })
          : "";
        const uhidNote = commitData.uhidCollisionsResolved
          ? " " + t("data_import.uhid_collisions_note", "{count} row(s) had a UHID/patient ID that was already in use — a new one was generated automatically and the file's original value was kept as a custom field.", { count: commitData.uhidCollisionsResolved })
          : "";
        const doctorLinkNote = commitData.doctorLinksCreated
          ? " " + t("data_import.doctor_links_created_note", "{count} patient(s) linked to their doctor.", { count: commitData.doctorLinksCreated })
          : "";
        const doctorUnresolvedNote = commitData.doctorLinksUnresolved
          ? " " + t("data_import.doctor_links_unresolved_note", "{count} patient(s) had a doctor name that didn't match any of your doctors — kept as a custom field instead of linking to the wrong one.", { count: commitData.doctorLinksUnresolved })
          : "";
        document.getElementById("commitConfirmation").textContent =
          t("data_import.commit_success", "Imported {committed} row(s).", { committed: commitData.committedRows }) +
          (commitData.failedRows ? " " + t("data_import.commit_failures", "{failed} row(s) failed and were skipped.", { failed: commitData.failedRows }) : "") +
          redirectedNote + uhidNote + doctorLinkNote + doctorUnresolvedNote + errorReasonsNote + newFieldsNote;
        if (window.showToast) showToast(t("data_import.import_complete_toast", "Import complete."), "success");

        currentBatch = null;
        setTimeout(() => {
          document.getElementById("mappingSection").hidden = true;
          document.getElementById("uploadSection").hidden = false;
          document.getElementById("importFileInput").value = "";
          document.getElementById("commitConfirmation").textContent = "";
        }, 4000);

        loadBatches();
        loadCustomFields();
        loadPatients();
      } catch (err) {
        errorEl.textContent = t("common.unable_to_reach_server", "Unable to reach the server. Please try again.");
      } finally {
        btn.disabled = false;
      }
    });
  }

  // ---------- Auto-detect (mixed dataset): sort, review, import each bucket ----------

  function bucketMappingBodyId(entity) {
    return `bucket-mapping-${entity}`;
  }

  function renderBucketMappingRows(bucket) {
    return bucket.fields
      .map((f) => {
        const badge = MATCH_BADGE[f.matchType] || MATCH_BADGE.unmatched;
        const isCustom = f.targetType === "extra_field";
        const isIgnored = f.targetType === "ignored";
        const sample = (f.sampleValues || []).filter((v) => v !== null && v !== undefined && String(v).trim() !== "")[0];
        return `<tr>
          <td><strong>${escapeHtml(f.sourceHeader)}</strong></td>
          <td class="mono-cell" style="color:var(--ink-mute, #8891a0);">${escapeHtml(sample ?? "—")}</td>
          <td><span class="queue-status ${badge.cls}">${escapeHtml(badge.label())}</span></td>
          <td>
            <select data-source-field="${escapeHtml(f.sourceHeader)}">
              ${fieldSelectOptions(bucket.knownFields, isCustom || isIgnored ? null : f.targetField, isCustom, isIgnored)}
            </select>
          </td>
        </tr>`;
      })
      .join("");
  }

  function renderAutoBuckets() {
    const container = document.getElementById("autoBucketsContainer");
    container.innerHTML = currentAutoBatch.buckets
      .map((bucket, idx) => {
        if (bucket.needsReclassification) {
          const valuesSeenNote = bucket.detectionLabels && bucket.detectionLabels.length
            ? " " + t("data_import.unclassified_values_seen", "Values seen: {values}", { values: bucket.detectionLabels.join(", ") })
            : "";
          return `<div class="bucket-panel" data-bucket-index="${idx}">
            <div class="bucket-panel-header">
              <span class="bucket-panel-title">${escapeHtml(t("data_import.unclassified_title", "Unclassified"))}</span>
              <span class="bucket-panel-count">${bucket.rowCount} ${escapeHtml(t("data_import.rows_label", "rows"))}</span>
            </div>
            <p class="wizard-hint">${escapeHtml(t("data_import.unclassified_hint", "Couldn't confidently tell what these rows are."))}${escapeHtml(valuesSeenNote)}</p>
            <div class="wizard-grid">
              <div>
                <label>${escapeHtml(t("data_import.assign_as", "Import these as"))}</label>
                <select class="unclassified-entity-select">
                  <option value="">${escapeHtml(t("data_import.choose_one", "Choose one…"))}</option>
                  ${ENTITY_OPTIONS.map((e) => `<option value="${e.value}">${escapeHtml(e.label)}</option>`).join("")}
                </select>
              </div>
            </div>
            <div class="wizard-nav">
              <button type="button" class="wizard-back-btn skip-unclassified-btn">${escapeHtml(t("data_import.skip_rows", "Skip these rows"))}</button>
              <button type="button" class="login-btn wizard-next-btn assign-unclassified-btn">${escapeHtml(t("data_import.assign_btn", "Assign"))}</button>
            </div>
          </div>`;
        }

        const isReady = bucket.status === "ready";
        return `<div class="bucket-panel" data-bucket-index="${idx}">
          <div class="bucket-panel-header">
            <span class="bucket-panel-title">${escapeHtml(bucket.entityLabel)}</span>
            <span class="bucket-panel-count">${bucket.rowCount} ${escapeHtml(t("data_import.rows_label", "rows"))} · <span class="queue-status bucket-status-pill ${isReady ? "completed" : "in-consultation"}">${escapeHtml(isReady ? t("data_import.match_matched", "Matched") : t("data_import.needs_review", "Needs review"))}</span></span>
          </div>
          <div class="mapping-mode-toggle" role="radiogroup" aria-label="Mapping mode">
            <input type="radio" name="mappingMode_${idx}" id="mappingModeManual_${idx}" value="manual" checked />
            <label for="mappingModeManual_${idx}">${escapeHtml(t("data_import.manual_mapping", "Manual Mapping"))}</label>
            <input type="radio" name="mappingMode_${idx}" id="mappingModeAuto_${idx}" value="auto" />
            <label for="mappingModeAuto_${idx}">${escapeHtml(t("data_import.auto_mapping", "Auto Mapping"))}</label>
          </div>
          <span class="mapping-mode-hint" id="mappingModeHint_${idx}">${escapeHtml(t("data_import.manual_mapping_hint", "Review and adjust each column's match before importing."))}</span>
          <div class="portal-table-wrap" style="overflow-x:auto;">
            <table class="portal-table">
              <thead>
                <tr>
                  <th>${escapeHtml(t("data_import.col_file_header", "File column"))}</th>
                  <th>${escapeHtml(t("data_import.col_sample", "Sample value"))}</th>
                  <th>${escapeHtml(t("data_import.col_match", "Match"))}</th>
                  <th>${escapeHtml(t("data_import.col_maps_to", "Maps to"))}</th>
                </tr>
              </thead>
              <tbody id="${bucketMappingBodyId(bucket.entity)}">${renderBucketMappingRows(bucket)}</tbody>
            </table>
          </div>
        </div>`;
      })
      .join("");

    container.querySelectorAll(".assign-unclassified-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const panel = btn.closest(".bucket-panel");
        const idx = Number(panel.dataset.bucketIndex);
        const select = panel.querySelector(".unclassified-entity-select");
        if (!select.value) return;
        reclassifyBucket(idx, select.value, false);
      });
    });
    container.querySelectorAll(".skip-unclassified-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const panel = btn.closest(".bucket-panel");
        const idx = Number(panel.dataset.bucketIndex);
        if (!confirm(t("data_import.confirm_skip_unclassified", "Skip these rows? They will not be imported anywhere."))) return;
        reclassifyBucket(idx, null, true);
      });
    });

    container.querySelectorAll('.bucket-panel input[type="radio"][name^="mappingMode_"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        const panel = radio.closest(".bucket-panel");
        const idx = Number(panel.dataset.bucketIndex);
        // Already imported — its mapping is locked in regardless of what the
        // toggle says now, so don't let switching it back to Manual re-enable
        // dropdowns for a bucket there's nothing left to change.
        if (currentAutoBatch?.buckets[idx]?.committed) return;
        const tbody = panel.querySelector("tbody[id^='bucket-mapping-']");
        if (!tbody) return;
        const hint = panel.querySelector(".mapping-mode-hint");
        applyMappingMode(radio.value, tbody, hint);
      });
    });
  }

  async function reclassifyBucket(idx, targetEntity, skip) {
    const errorEl = document.getElementById("autoError");
    errorEl.textContent = "";
    try {
      const res = await fetch(`/api/import/${currentAutoBatch.batchId}/reclassify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(skip ? { skip: true } : { targetEntity }),
      });
      const data = await res.json();
      if (!data.success) {
        errorEl.textContent = data.message || t("data_import.reclassify_failed", "Could not update these rows.");
        return;
      }

      currentAutoBatch.buckets.splice(idx, 1);
      if (!skip) {
        const existing = currentAutoBatch.buckets.find((b) => b.entity === data.entity);
        if (existing) {
          existing.rowCount += data.rowCount;
          existing.sampleRows = (existing.sampleRows || []).concat(data.sampleRows || []).slice(0, 5);
          existing.fields = data.fields;
          existing.knownFields = data.knownFields;
          existing.status = data.status;
        } else {
          currentAutoBatch.buckets.push({
            entity: data.entity,
            entityLabel: entityLabelFor(data.entity),
            rowCount: data.rowCount,
            status: data.status,
            fields: data.fields,
            sampleRows: data.sampleRows,
            knownFields: data.knownFields,
          });
        }
      }
      renderAutoBuckets();
    } catch (err) {
      errorEl.textContent = t("common.unable_to_reach_server", "Unable to reach the server. Please try again.");
    }
  }

  function renderAutoSummary(data) {
    document.getElementById("uploadSection").hidden = true;
    document.getElementById("autoSection").hidden = false;
    currentAutoBatch = data;

    const parts = Object.entries(data.roleBreakdown)
      .filter(([, count]) => count > 0)
      .map(([entity, count]) => `${count} ${entityLabelFor(entity)}`);
    document.getElementById("autoSummaryText").textContent = t(
      "data_import.auto_summary",
      'Sorted {total} rows using the "{roleColumn}" column: {breakdown}.',
      { total: data.totalRows, roleColumn: data.roleColumn, breakdown: parts.join(", ") }
    );

    document.getElementById("autoImportSummary").textContent = "";
    document.getElementById("autoProgress").hidden = true;
    document.getElementById("autoError").textContent = "";
    renderAutoBuckets();
  }

  function wireAutoActions() {
    document.getElementById("cancelAutoBtn").addEventListener("click", () => {
      currentAutoBatch = null;
      document.getElementById("autoSection").hidden = true;
      document.getElementById("uploadSection").hidden = false;
      document.getElementById("importFileInput").value = "";
    });

    document.getElementById("confirmAutoBtn").addEventListener("click", async () => {
      if (!currentAutoBatch) return;
      const errorEl = document.getElementById("autoError");
      errorEl.textContent = "";

      if (currentAutoBatch.buckets.some((b) => b.needsReclassification)) {
        errorEl.textContent = t("data_import.resolve_unclassified_first", "Resolve the Unclassified group first — assign it to a record type or skip it.");
        return;
      }
      const realBuckets = currentAutoBatch.buckets;
      if (realBuckets.length === 0) {
        errorEl.textContent = t("data_import.nothing_to_import", "There's nothing to import.");
        return;
      }

      const btn = document.getElementById("confirmAutoBtn");
      btn.disabled = true;
      const progressWrap = document.getElementById("autoProgress");
      const progressFill = document.getElementById("autoProgressFill");
      const progressLabel = document.getElementById("autoProgressLabel");
      progressWrap.hidden = false;
      progressFill.classList.remove("indeterminate", "stopped");
      progressFill.style.width = "0%";

      // A failed bucket must never just look frozen mid-progress: say plainly
      // that it stopped and why, turn the bar red instead of leaving it at
      // whatever % it happened to be at, and jump straight to the panel that
      // needs fixing — it can be far below the sticky action bar in a long,
      // many-bucket import.
      function stopAt(bucketIndex, bucket, message) {
        progressFill.classList.add("stopped");
        progressLabel.textContent = t("data_import.import_stopped", "Stopped — fix the issue below, then click Import All again.");
        errorEl.textContent = `${bucket.entityLabel}: ` + message;
        const panel = document.querySelector(`.bucket-panel[data-bucket-index="${bucketIndex}"]`);
        if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      try {
        for (let i = 0; i < realBuckets.length; i++) {
          const bucket = realBuckets[i];

          // Retrying after fixing one bucket's mapping (see stopAt above)
          // re-runs this whole loop from the start — a bucket that already
          // committed successfully on the previous attempt must be skipped,
          // not re-submitted (the server would correctly refuse it as
          // already-imported, which would look like a brand new failure).
          if (bucket.committed) {
            progressFill.style.width = `${Math.round(((i + 1) / realBuckets.length) * 100)}%`;
            continue;
          }

          progressLabel.textContent = t(
            "data_import.importing_bucket",
            "Importing {label}… ({current} of {total})",
            { label: bucket.entityLabel, current: i + 1, total: realBuckets.length }
          );

          const mappings = [...document.querySelectorAll(`#${bucketMappingBodyId(bucket.entity)} select`)].map((select) => {
            const sourceField = select.dataset.sourceField;
            const value = select.value;
            if (value === "__custom__") return { sourceField, targetType: "extra_field", targetField: null };
            if (value === "__ignore__") return { sourceField, targetType: "ignored", targetField: null };
            return { sourceField, targetType: "column", targetField: value };
          });

          const mapRes = await fetch(`/api/import/${currentAutoBatch.batchId}/mapping`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ targetEntity: bucket.entity, mappings }),
          });
          const mapData = await mapRes.json();
          if (!mapData.success) {
            stopAt(i, bucket, mapData.message || t("data_import.mapping_save_failed", "Could not save the mapping."));
            return;
          }

          const commitRes = await fetch(`/api/import/${currentAutoBatch.batchId}/commit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ targetEntity: bucket.entity }),
          });
          const commitData = await commitRes.json();
          if (!commitData.success) {
            stopAt(i, bucket, commitData.message || t("data_import.commit_failed", "Import failed."));
            return;
          }
          // Stored on the bucket itself, not a running total — a retry after
          // fixing another bucket re-enters this loop from the start, and
          // the final summary below must count every bucket's own result
          // (from whichever attempt actually committed it), not just the
          // ones this particular call touched.
          bucket.committed = true;
          bucket.committedRows = commitData.committedRows;
          bucket.failedRows = commitData.failedRows;
          bucket.customFieldsCreated = commitData.customFieldsCreated || [];
          bucket.fieldsAutoRedirected = commitData.fieldsAutoRedirected || [];
          bucket.sampleErrors = commitData.sampleErrors || [];
          bucket.uhidCollisionsResolved = commitData.uhidCollisionsResolved || 0;
          bucket.doctorLinksCreated = commitData.doctorLinksCreated || 0;
          bucket.doctorLinksUnresolved = commitData.doctorLinksUnresolved || 0;

          const donePanel = document.querySelector(`.bucket-panel[data-bucket-index="${i}"]`);
          if (donePanel) {
            const pill = donePanel.querySelector(".bucket-status-pill");
            if (pill) {
              pill.textContent = t("data_import.imported_label", "Imported");
              pill.classList.remove("in-consultation");
              pill.classList.add("completed");
            }
            donePanel.querySelectorAll("select").forEach((s) => (s.disabled = true));
          }

          progressFill.style.width = `${Math.round(((i + 1) / realBuckets.length) * 100)}%`;
        }

        progressLabel.textContent = t("data_import.import_all_done", "Done.");

        // Every bucket is committed now (this call finished the loop without
        // stopping) — aggregate from every bucket's own stored result, not
        // just whichever ones this specific call happened to process.
        let totalCommitted = 0;
        let totalFailed = 0;
        let totalUhidCollisions = 0;
        let totalDoctorLinksCreated = 0;
        let totalDoctorLinksUnresolved = 0;
        const allCustomFields = [];
        const allRedirected = [];
        const allErrors = [];
        realBuckets.forEach((bucket) => {
          totalCommitted += bucket.committedRows || 0;
          totalFailed += bucket.failedRows || 0;
          totalUhidCollisions += bucket.uhidCollisionsResolved || 0;
          totalDoctorLinksCreated += bucket.doctorLinksCreated || 0;
          totalDoctorLinksUnresolved += bucket.doctorLinksUnresolved || 0;
          allCustomFields.push(...(bucket.customFieldsCreated || []));
          allRedirected.push(...(bucket.fieldsAutoRedirected || []));
          allErrors.push(...(bucket.sampleErrors || []).map((e) => `${bucket.entityLabel}: ${e}`));
        });

        const newFieldsNote = allCustomFields.length
          ? " " + t("data_import.new_custom_fields_note", "{count} new custom field(s) registered: {fields}.", {
              count: allCustomFields.length,
              fields: allCustomFields.map((f) => f.fieldKey).join(", "),
            })
          : "";
        const redirectedNote = allRedirected.length
          ? " " + t("data_import.fields_redirected_note", "{count} column(s) didn't fit the field they were mapped to and were saved as custom fields instead: {fields}.", {
              count: allRedirected.length,
              fields: allRedirected.map((f) => `"${f.fieldKey}" → ${f.targetLabel}`).join(", "),
            })
          : "";
        const uhidNote = totalUhidCollisions
          ? " " + t("data_import.uhid_collisions_note", "{count} row(s) had a UHID/patient ID that was already in use — a new one was generated automatically and the file's original value was kept as a custom field.", { count: totalUhidCollisions })
          : "";
        const doctorLinkNote = totalDoctorLinksCreated
          ? " " + t("data_import.doctor_links_created_note", "{count} patient(s) linked to their doctor.", { count: totalDoctorLinksCreated })
          : "";
        const doctorUnresolvedNote = totalDoctorLinksUnresolved
          ? " " + t("data_import.doctor_links_unresolved_note", "{count} patient(s) had a doctor name that didn't match any of your doctors — kept as a custom field instead of linking to the wrong one.", { count: totalDoctorLinksUnresolved })
          : "";
        const errorNote = allErrors.length
          ? " " + t("data_import.sample_errors_note", "Reason(s): {reasons}", { reasons: allErrors.slice(0, 5).join(" | ") })
          : "";
        document.getElementById("autoImportSummary").textContent =
          t("data_import.commit_success", "Imported {committed} row(s).", { committed: totalCommitted }) +
          (totalFailed ? " " + t("data_import.commit_failures", "{failed} row(s) failed and were skipped.", { failed: totalFailed }) : "") +
          redirectedNote + uhidNote + doctorLinkNote + doctorUnresolvedNote + errorNote + newFieldsNote +
          " " + t("data_import.staff_visible_note", "Any doctors, nurses, or other staff imported are now visible on the Existing Staff page.");

        if (window.showToast) showToast(t("data_import.import_complete_toast", "Import complete."), "success");

        currentAutoBatch = null;
        setTimeout(() => {
          document.getElementById("autoSection").hidden = true;
          document.getElementById("uploadSection").hidden = false;
          document.getElementById("importFileInput").value = "";
          document.getElementById("autoImportSummary").textContent = "";
          document.getElementById("autoProgress").hidden = true;
        }, 7000);

        loadBatches();
        loadCustomFields();
        loadPatients();
      } catch (err) {
        errorEl.textContent = t("common.unable_to_reach_server", "Unable to reach the server. Please try again.");
      } finally {
        btn.disabled = false;
      }
    });
  }

  // ---------- Custom fields registry ----------

  let customFieldsCache = { patients: [], hospitals: [] };

  async function loadCustomFields() {
    const entity = document.getElementById("customFieldsEntitySelect").value;
    const res = await fetch(`/api/hospitals/${sessionUser.hospitalId}/custom-fields?entity=${encodeURIComponent(entity)}`, {
      credentials: "same-origin",
    });
    const data = await res.json();
    const body = document.getElementById("customFieldsTableBody");
    const emptyState = document.getElementById("customFieldsEmptyState");
    if (!data.success || data.customFields.length === 0) {
      body.innerHTML = "";
      emptyState.hidden = false;
      customFieldsCache[entity] = [];
      return;
    }
    emptyState.hidden = true;
    customFieldsCache[entity] = data.customFields;
    body.innerHTML = data.customFields
      .map((f) => `<tr><td>${escapeHtml(f.field_label)}</td><td>${escapeHtml(f.field_type)}</td></tr>`)
      .join("");

    if (entity === "patients") renderPatientsTableHead();
  }

  // ---------- Patients (with dynamic custom-field columns) ----------

  function renderPatientsTableHead() {
    const extraCols = customFieldsCache.patients || [];
    const head = document.getElementById("patientsTableHead");
    head.innerHTML = `<tr>
      <th data-i18n="common.patient">Patient</th>
      <th>UHID</th>
      <th data-i18n="common.phone">Phone</th>
      <th>${escapeHtml(t("data_import.col_blood_group", "Blood Group"))}</th>
      ${extraCols.map((f) => `<th>${escapeHtml(f.field_label)}</th>`).join("")}
    </tr>`;
  }

  async function loadPatients() {
    const q = document.getElementById("patientSearchInput").value.trim();
    const res = await fetch(`/api/hospital/patients${q ? "?q=" + encodeURIComponent(q) : ""}`, { credentials: "same-origin" });
    const data = await res.json();
    const body = document.getElementById("patientsTableBody");
    const emptyState = document.getElementById("patientsEmptyState");
    if (!data.success || data.patients.length === 0) {
      body.innerHTML = "";
      emptyState.hidden = false;
      return;
    }
    emptyState.hidden = true;

    const extraCols = customFieldsCache.patients || [];
    body.innerHTML = data.patients
      .map((p) => {
        const extra = (() => {
          if (!p.extra_fields) return {};
          try {
            return typeof p.extra_fields === "string" ? JSON.parse(p.extra_fields) : p.extra_fields;
          } catch {
            return {};
          }
        })();
        const extraCells = extraCols.map((f) => `<td>${escapeHtml(extra[f.field_key] ?? "—")}</td>`).join("");
        return `<tr>
          <td>${escapeHtml(p.full_name)}</td>
          <td class="mono-cell">${escapeHtml(p.uhid)}</td>
          <td>${escapeHtml(p.phone || "—")}</td>
          <td>${escapeHtml(p.blood_group || "—")}</td>
          ${extraCells}
        </tr>`;
      })
      .join("");
  }

  // ---------- Import history ----------

  const STATUS_LABEL = {
    uploaded: "Uploaded",
    mapping: "Needs mapping",
    ready: "Ready",
    committing: "Importing…",
    committed: "Committed",
    failed: "Failed",
  };

  async function loadBatches() {
    const res = await fetch("/api/import/batches", { credentials: "same-origin" });
    const data = await res.json();
    const body = document.getElementById("batchesTableBody");
    const emptyState = document.getElementById("batchesEmptyState");
    if (!data.success || data.batches.length === 0) {
      body.innerHTML = "";
      emptyState.hidden = false;
      return;
    }
    emptyState.hidden = true;
    body.innerHTML = data.batches
      .map((b) => {
        const rowsLabel = b.status === "committed" ? `${b.committed_rows} / ${b.total_rows}` : `${b.total_rows}`;
        const reverted = !!b.reverted_at;
        const statusCls = reverted ? "waiting" : b.status === "committed" ? "completed" : b.status === "failed" ? "waiting" : "in-consultation";
        const statusLabel = reverted ? t("data_import.status_reverted", "Deleted") : STATUS_LABEL[b.status] || b.status;
        const canDelete = b.status === "committed" && !reverted;
        return `<tr>
          <td>${escapeHtml(b.original_filename)}</td>
          <td>${escapeHtml(entityLabelFor(b.target_entity))}</td>
          <td><span class="queue-status ${statusCls}">${escapeHtml(statusLabel)}</span></td>
          <td>${escapeHtml(rowsLabel)}</td>
          <td>${escapeHtml(new Date(b.created_at).toLocaleString())}</td>
          <td>${canDelete ? `<button type="button" class="icon-btn-delete" data-batch-id="${b.id}" data-entity="${escapeHtml(b.target_entity)}">${escapeHtml(t("data_import.delete_batch_btn", "Delete"))}</button>` : "—"}</td>
        </tr>`;
      })
      .join("");

    body.querySelectorAll("[data-batch-id]").forEach((btn) => {
      btn.addEventListener("click", () => deleteBatch(btn.dataset.batchId, btn.dataset.entity));
    });
  }

  async function deleteBatch(batchId, entity) {
    const confirmMsg = entity === "hospitals"
      ? t("data_import.confirm_delete_hospital_batch", "Undo this import? Your hospital's facility record will be restored to what it was right before this import ran.")
      : entity === "auto"
      ? t("data_import.confirm_delete_auto_batch", "Delete every record this import created (patients, doctors, nurses, or any other staff)? This can't be undone — you'll need to re-upload the file to get this data back.")
      : t("data_import.confirm_delete_patients_batch", "Delete every patient this import created? This can't be undone — you'll need to re-upload the file to get this data back.");
    if (!confirm(confirmMsg)) return;

    const messageEl = document.getElementById("batchDeleteMessage");
    messageEl.textContent = "";
    try {
      const res = await fetch(`/api/import/${batchId}`, { method: "DELETE", credentials: "same-origin" });
      const data = await res.json();
      if (!data.success) {
        messageEl.textContent = data.message || t("data_import.delete_failed", "Could not delete this import.");
        return;
      }
      messageEl.textContent = entity === "hospitals"
        ? t("data_import.delete_success_hospital", "Facility record restored.")
        : entity === "auto"
        ? t("data_import.delete_success_auto", "{count} record(s) deleted ({patients} patient(s), {staff} staff).", {
            count: data.deletedRows,
            patients: data.deletedPatients,
            staff: data.deletedStaff,
          })
        : t("data_import.delete_success_patients", "{count} patient(s) deleted.", { count: data.deletedRows });
      if (window.showToast) showToast(t("data_import.delete_success_toast", "Import deleted."), "success");

      loadBatches();
      loadCustomFields();
      loadPatients();
    } catch (err) {
      messageEl.textContent = t("common.unable_to_reach_server", "Unable to reach the server. Please try again.");
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const user = await guardSession();
    if (!user) return;
    wireLogout();
    wireUpload();
    wireMappingActions();
    wireMappingModeToggle();
    wireAutoActions();

    document.getElementById("customFieldsEntitySelect").addEventListener("change", loadCustomFields);
    let searchDebounce;
    document.getElementById("patientSearchInput").addEventListener("input", () => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(loadPatients, 250);
    });

    await loadCustomFields();
    loadPatients();
    loadBatches();

    window.addEventListener("i18n:languageChanged", () => {
      loadBatches();
      loadCustomFields();
    });
  });
})();
