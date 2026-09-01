// CSV/XLSX data import pipeline — hospital admin only. Mounted at /api/import
// in server.js (`app.use("/api/import", require("./importRoutes"))`) plus one
// sibling route server.js defines directly (GET /api/hospitals/:id/custom-fields,
// since that's also read by the login-time /api/me-adjacent screens, not just
// this pipeline).
//
// Flow: upload -> stage every row untouched (import_staging_rows) -> fuzzy-match
// headers against schemaRegistry.js with Fuse.js -> admin confirms/edits the
// mapping (or a saved mapping from a prior upload of the same source_name is
// reused automatically) -> commit applies it inside one DB transaction, with
// Ajv validating each row first. Anything that doesn't match a real column
// becomes a hospital-scoped custom field (hospital_custom_fields) and its
// value goes into that row's extra_fields JSON column — never dropped, unless
// an admin explicitly marks a field "ignored" at the mapping step.
const express = require("express");
const crypto = require("crypto");
const multer = require("multer");
const Papa = require("papaparse");
const XLSX = require("xlsx");
const Fuse = require("fuse.js");
const Ajv = require("ajv");
const pool = require("./db");
const bcrypt = require("bcrypt");
const { getEntity, listEntities } = require("./schemaRegistry");
const { applyTransform, looksLikeDate, looksLikeNumber, looksLikeBoolean } = require("./importTransforms");
const { generateUhid, generateTempPassword, generateStaffUserId } = require("./credentials");
const { ROLE_PREFIXES, ROLE_LABELS, DESIGNATION_PREFIXES } = require("./roles");
const { detectRoleColumn, classifyRow, CLASSIFIABLE_ENTITIES } = require("./roleClassifier");

const router = express.Router();
const ajv = new Ajv({ allErrors: true, strict: false });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

function requireHospitalAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === "hospital_admin") return next();
  return res.status(401).json({ success: false, message: "Hospital admin session required." });
}

// GET /field-usage/:entity below is a cross-hospital view (by design — its
// whole purpose is spotting a custom field common across many hospitals, to
// decide if it should graduate into schemaRegistry.js), so it's a platform-
// owner concern, not a hospital admin one — same superadmin-only bar as
// GET /api/hospitals in server.js, not requireHospitalAdmin like everything
// else in this file.
function requireSuperadmin(req, res, next) {
  if (req.session.user && req.session.user.role === "superadmin") return next();
  return res.status(401).json({ success: false, message: "Superadmin session required." });
}

// ---------- File parsing ----------

function parseUploadedFile(buffer, originalName) {
  const ext = (originalName.split(".").pop() || "").toLowerCase();
  if (ext === "csv" || ext === "txt") {
    const result = Papa.parse(buffer.toString("utf8"), {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    });
    return { rows: result.data, headers: result.meta.fields || [] };
  }
  // xlsx/xls — first sheet only; a multi-sheet workbook is out of scope for v1.
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false }).map((row) => {
    const trimmed = {};
    Object.keys(row).forEach((k) => (trimmed[k.trim()] = row[k]));
    return trimmed;
  });
  const headers = rows.length ? Object.keys(rows[0]) : [];
  return { rows, headers };
}

// ---------- Fuzzy header matching (Fuse.js) ----------

function buildFuseIndex(entityDef) {
  const items = entityDef.fields.map((f) => ({
    key: f.key,
    label: f.label,
    haystack: [f.key, f.label, ...(f.aliases || [])].join(" "),
  }));
  return new Fuse(items, { keys: ["haystack"], includeScore: true, threshold: 0.45, ignoreLocation: true });
}

// Returns one of "matched" (high confidence), "suggested" (plausible, wants
// admin eyes), or "unmatched" (no real-column guess at all — this is the
// default-safe bucket that becomes a hospital custom field).
function matchHeader(fuseIndex, header) {
  const results = fuseIndex.search(header.trim());
  if (results.length === 0) return { matchType: "unmatched", targetField: null, targetLabel: null, score: null };
  const best = results[0];
  const matchType = best.score <= 0.15 ? "matched" : "suggested";
  return { matchType, targetField: best.item.key, targetLabel: best.item.label, score: best.score };
}

function inferFieldType(sampleValues) {
  const nonEmpty = sampleValues.filter((v) => v !== null && v !== undefined && String(v).trim() !== "");
  if (nonEmpty.length === 0) return "string";
  if (nonEmpty.every(looksLikeBoolean)) return "boolean";
  if (nonEmpty.every(looksLikeNumber)) return "number";
  if (nonEmpty.every(looksLikeDate)) return "date";
  return "string";
}

// Where a field's value ends up at commit time. Explicit on a field when it
// matters ("column" for the three real `users` columns on a staff entity,
// "department" for the doctor-only department lookup); everything else
// defaults by entity: patients/hospitals fields are all real table columns,
// while a staff entity's role-specific fields (specialization, shift, ...)
// have nowhere to live but the shared `details` JSON blob.
function fieldStorage(entityDef, fieldDef) {
  return fieldDef.storage || (entityDef.table === "users" ? "details" : "column");
}

// ---------- Ajv validation ----------
//
// Only "column"-storage fields are validated — those are the ones with a
// real DB constraint (NOT NULL, a fixed VARCHAR width) that can actually
// fail. A "details"-storage field (e.g. a doctor's specialization) has
// nowhere to violate a constraint — it's freeform JSON — so requiring it
// here would just be validation theater.
const ajvSchemaCache = {};
function getAjvValidator(entityName, entityDef) {
  if (ajvSchemaCache[entityName]) return ajvSchemaCache[entityName];
  const properties = {};
  const required = [];
  entityDef.fields.forEach((f) => {
    if (fieldStorage(entityDef, f) !== "column") return;
    if (f.type === "number") properties[f.key] = { type: ["number", "null"] };
    else if (f.type === "boolean") properties[f.key] = { type: ["boolean", "null"] };
    else if (f.required) properties[f.key] = { type: "string", minLength: 1 };
    else properties[f.key] = { type: ["string", "null"] };
    if (f.required) required.push(f.key);
  });
  const validate = ajv.compile({ type: "object", properties, required, additionalProperties: true });
  ajvSchemaCache[entityName] = validate;
  return validate;
}

// Builds the field-mapping report for ONE entity against a set of rows: for
// every header, either reuse a mapping saved from a prior upload with the
// same source_name (so a recurring feed doesn't ask twice), or fuzzy-match
// it against the entity's schema with Fuse.js. Shared by the plain
// single-entity upload, each auto-detected bucket, and POST /:batchId/reclassify.
async function buildFieldReport(hospitalId, sourceName, targetEntity, entityDef, headers, rows) {
  const [savedMappings] = await pool.query(
    `SELECT source_field, target_field, target_type, transform_fn FROM import_field_mappings
     WHERE hospital_id = ? AND source_name = ? AND target_entity = ?`,
    [hospitalId, sourceName, targetEntity]
  );
  const savedByField = new Map(savedMappings.map((m) => [m.source_field, m]));

  const fuseIndex = buildFuseIndex(entityDef);
  const fields = headers.map((header) => {
    const samples = rows.slice(0, 5).map((r) => r[header]);
    const saved = savedByField.get(header);
    if (saved) {
      return {
        sourceHeader: header,
        matchType: "saved",
        targetField: saved.target_field,
        targetLabel: saved.target_field ? (entityDef.fields.find((f) => f.key === saved.target_field)?.label || saved.target_field) : null,
        targetType: saved.target_type,
        sampleValues: samples,
      };
    }
    const match = matchHeader(fuseIndex, header);
    return {
      sourceHeader: header,
      matchType: match.matchType,
      targetField: match.targetField,
      targetLabel: match.targetLabel,
      targetType: match.matchType === "unmatched" ? "extra_field" : "column",
      sampleValues: samples,
    };
  });

  const allSavedFromHistory = headers.length > 0 && headers.every((h) => savedByField.has(h));
  return {
    fields,
    allSavedFromHistory,
    knownFields: entityDef.fields.map((f) => ({ key: f.key, label: f.label, type: f.type, required: !!f.required })),
  };
}

// ---------- POST /api/import/upload ----------

router.post("/upload", requireHospitalAdmin, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded." });

  const targetEntity = req.body.entity;
  const isAuto = targetEntity === "auto";
  const entityDef = isAuto ? null : getEntity(targetEntity);
  if (!isAuto && !entityDef) {
    return res.status(400).json({ success: false, message: `Unknown entity. Supported: auto, ${listEntities().join(", ")}.` });
  }
  const sourceName = (req.body.sourceName || req.file.originalname).trim();

  let parsed;
  try {
    parsed = parseUploadedFile(req.file.buffer, req.file.originalname);
  } catch (err) {
    return res.status(400).json({ success: false, message: "Could not read this file — is it a valid CSV/XLSX?" });
  }
  if (parsed.rows.length === 0) {
    return res.status(400).json({ success: false, message: "The file has no data rows." });
  }

  const { hospitalId, userId } = req.session.user;
  const batchUid = crypto.randomUUID();

  try {
    const [batchResult] = await pool.query(
      `INSERT INTO import_batches (batch_uid, hospital_id, source_name, original_filename, target_entity, uploaded_by, status, total_rows)
       VALUES (?, ?, ?, ?, ?, ?, 'uploaded', ?)`,
      [batchUid, hospitalId, sourceName, req.file.originalname, targetEntity, userId, parsed.rows.length]
    );
    const batchId = batchResult.insertId;

    // ---------- Auto-detect (mixed dataset): sort rows into buckets first ----------
    if (isAuto) {
      const roleColumn = detectRoleColumn(parsed.headers);
      if (!roleColumn) {
        await pool.query(`UPDATE import_batches SET status = 'failed' WHERE id = ?`, [batchId]);
        return res.status(400).json({
          success: false,
          message:
            "Couldn't find a column that says what kind of record each row is (e.g. \"Role\", \"Type\", \"Designation\"). Add one, or pick a specific record type instead of Auto-detect.",
        });
      }

      // Classify every row up front, then stage each one with its detected
      // bucket already attached — this is the "sort it out" step, and it's
      // what a real dataset of "all types of users" needs before anything
      // can be imported into the right place.
      const classified = parsed.rows.map((row, i) => {
        const result = classifyRow(row[roleColumn]);
        return { rowNum: i + 1, row, entity: result.entity, label: result.rawLabel };
      });

      const stagingValues = classified.map((c) => [batchId, c.rowNum, JSON.stringify(c.row), "pending", c.entity, c.label || null]);
      await pool.query(
        `INSERT INTO import_staging_rows (batch_id, row_num, raw_data, status, detected_entity, detection_label) VALUES ?`,
        [stagingValues]
      );

      const roleBreakdown = {};
      CLASSIFIABLE_ENTITIES.forEach((e) => (roleBreakdown[e] = 0));
      roleBreakdown.unclassified = 0;
      classified.forEach((c) => {
        if (c.entity) roleBreakdown[c.entity]++;
        else roleBreakdown.unclassified++;
      });

      const buckets = [];
      for (const entity of CLASSIFIABLE_ENTITIES) {
        const rowsForEntity = classified.filter((c) => c.entity === entity).map((c) => c.row);
        if (rowsForEntity.length === 0) continue;
        const def = getEntity(entity);
        const report = await buildFieldReport(hospitalId, sourceName, entity, def, parsed.headers, rowsForEntity);
        buckets.push({
          entity,
          entityLabel: def.role ? ROLE_LABELS[entity] || entity : entity === "patients" ? "Patient records" : entity,
          rowCount: rowsForEntity.length,
          status: report.allSavedFromHistory ? "ready" : "mapping",
          fields: report.fields,
          sampleRows: rowsForEntity.slice(0, 5),
          knownFields: report.knownFields,
        });
      }

      const unclassifiedRows = classified.filter((c) => !c.entity);
      if (unclassifiedRows.length > 0) {
        buckets.push({
          entity: null,
          entityLabel: "Unclassified",
          rowCount: unclassifiedRows.length,
          status: "needs_entity",
          needsReclassification: true,
          detectionLabels: [...new Set(unclassifiedRows.map((c) => c.label).filter(Boolean))].slice(0, 10),
          sampleRows: unclassifiedRows.slice(0, 5).map((c) => c.row),
        });
      }

      const allReady = buckets.every((b) => b.status === "ready");
      await pool.query(`UPDATE import_batches SET status = ? WHERE id = ?`, [allReady ? "ready" : "mapping", batchId]);

      return res.json({
        success: true,
        batchId,
        batchUid,
        targetEntity: "auto",
        sourceName,
        status: allReady ? "ready" : "mapping",
        totalRows: parsed.rows.length,
        roleColumn,
        roleBreakdown,
        buckets,
      });
    }

    // ---------- Single explicit entity (existing behavior, unchanged) ----------
    const stagingValues = parsed.rows.map((row, i) => [batchId, i + 1, JSON.stringify(row), "pending"]);
    await pool.query(`INSERT INTO import_staging_rows (batch_id, row_num, raw_data, status) VALUES ?`, [stagingValues]);

    const report = await buildFieldReport(hospitalId, sourceName, targetEntity, entityDef, parsed.headers, parsed.rows);
    await pool.query(`UPDATE import_batches SET status = ? WHERE id = ?`, [report.allSavedFromHistory ? "ready" : "mapping", batchId]);

    res.json({
      success: true,
      batchId,
      batchUid,
      targetEntity,
      sourceName,
      status: report.allSavedFromHistory ? "ready" : "mapping",
      totalRows: parsed.rows.length,
      fields: report.fields,
      sampleRows: parsed.rows.slice(0, 5),
      knownFields: report.knownFields,
      // "hospitals" is a singleton — your hospital's own one facility record.
      // A file with more than one row targeting it doesn't add more rows, it
      // just overwrites that same record once per row, so only the LAST row
      // survives. Almost always means the wrong entity was picked (this is
      // exactly what happened with a 74-row "dummy user dataset" that
      // silently collapsed into one row). Flagged here so the UI can warn
      // before commit instead of after.
      singleRowEntityWarning: targetEntity === "hospitals" && parsed.rows.length > 1,
    });
  } catch (err) {
    console.error("Import upload error:", err.message);
    res.status(500).json({ success: false, message: "Server error while staging the file. Please try again." });
  }
});

// ---------- POST /api/import/:batchId/reclassify ----------
//
// For the "Unclassified" bucket an auto-detect upload can produce: rather
// than ever silently dropping rows the classifier wasn't confident about,
// the admin explicitly picks what they actually are, and this computes that
// bucket's field-mapping report on demand (same as a normal bucket gets at
// upload time) so it can be reviewed and confirmed the same way.
router.post("/:batchId/reclassify", requireHospitalAdmin, async (req, res) => {
  const { targetEntity, skip } = req.body || {};

  try {
    const { hospitalId } = req.session.user;
    const [[batch]] = await pool.query(`SELECT * FROM import_batches WHERE id = ? AND hospital_id = ? LIMIT 1`, [
      req.params.batchId,
      hospitalId,
    ]);
    if (!batch) return res.status(404).json({ success: false, message: "Import batch not found." });
    if (batch.target_entity !== "auto") {
      return res.status(400).json({ success: false, message: "This action only applies to an auto-detected import." });
    }

    const [rows] = await pool.query(
      `SELECT id, raw_data FROM import_staging_rows WHERE batch_id = ? AND detected_entity IS NULL`,
      [batch.id]
    );
    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: "There are no unclassified rows left in this import." });
    }

    // Explicitly discarding the unclassified rows — still the admin's
    // deliberate choice (never a default), matching the same rule as
    // "Ignore this column" at the per-field mapping step. The raw data stays
    // in import_staging_rows either way, just marked as never going anywhere.
    if (skip) {
      await pool.query(`UPDATE import_staging_rows SET status = 'skipped', detected_entity = 'skipped' WHERE batch_id = ? AND detected_entity IS NULL`, [
        batch.id,
      ]);
      return res.json({ success: true, skipped: true, rowCount: rows.length });
    }

    const entityDef = getEntity(targetEntity);
    if (!entityDef) {
      return res.status(400).json({ success: false, message: `Unknown entity. Supported: ${listEntities().join(", ")}.` });
    }

    await pool.query(`UPDATE import_staging_rows SET detected_entity = ? WHERE batch_id = ? AND detected_entity IS NULL`, [
      targetEntity,
      batch.id,
    ]);

    const headers = Object.keys(rows[0].raw_data);
    const report = await buildFieldReport(hospitalId, batch.source_name, targetEntity, entityDef, headers, rows.map((r) => r.raw_data));

    res.json({
      success: true,
      entity: targetEntity,
      rowCount: rows.length,
      status: report.allSavedFromHistory ? "ready" : "mapping",
      fields: report.fields,
      sampleRows: rows.slice(0, 5).map((r) => r.raw_data),
      knownFields: report.knownFields,
    });
  } catch (err) {
    console.error("Import reclassify error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

// ---------- POST /api/import/:batchId/mapping ----------

router.post("/:batchId/mapping", requireHospitalAdmin, async (req, res) => {
  const { mappings } = req.body || {};
  if (!Array.isArray(mappings) || mappings.length === 0) {
    return res.status(400).json({ success: false, message: "No mapping provided." });
  }

  try {
    const { hospitalId, userId } = req.session.user;
    const [[batch]] = await pool.query(`SELECT * FROM import_batches WHERE id = ? AND hospital_id = ? LIMIT 1`, [
      req.params.batchId,
      hospitalId,
    ]);
    if (!batch) return res.status(404).json({ success: false, message: "Import batch not found." });

    // An auto-detected batch mixes several destinations in one file, so the
    // mapping being confirmed here is scoped to ONE bucket at a time — the
    // request says which. A plain single-entity batch has only ever had one
    // possible target, so it keeps working exactly as before with no body change.
    const targetEntity = batch.target_entity === "auto" ? req.body.targetEntity : batch.target_entity;
    const entityDef = getEntity(targetEntity);
    if (!entityDef) {
      return res.status(400).json({ success: false, message: "A valid targetEntity is required for this batch." });
    }

    // Catch a mapping that can never produce a valid row BEFORE committing —
    // e.g. no column mapped to Full Name means every single patient row will
    // fail at commit (the "349 rows uploaded, 0 imported" failure mode). Far
    // better to reject here with one clear, actionable message than to let
    // the admin discover it as a wall of identical per-row errors afterward.
    const requiredFields = entityDef.fields.filter((f) => f.required);
    const mappedColumnTargets = new Set(mappings.filter((m) => m.targetType === "column" && m.targetField).map((m) => m.targetField));
    const missingRequired = requiredFields.filter((f) => !mappedColumnTargets.has(f.key));
    if (missingRequired.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Map a column to ${missingRequired.map((f) => f.label).join(", ")} before importing — every row needs it and none will import without it.`,
      });
    }

    for (const m of mappings) {
      if (!m.sourceField) continue;
      // Default is always a real mapping (column or extra_field) — 'ignored'
      // only ever comes from an explicit choice in the request body, per the
      // "never silently drop data" rule; there's no code path that defaults
      // a field to 'ignored' on its own.
      const targetType = ["column", "extra_field", "ignored"].includes(m.targetType) ? m.targetType : "extra_field";
      await pool.query(
        `INSERT INTO import_field_mappings (hospital_id, source_name, target_entity, source_field, target_field, target_type, transform_fn, confirmed_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE target_field = VALUES(target_field), target_type = VALUES(target_type),
           transform_fn = VALUES(transform_fn), confirmed_by = VALUES(confirmed_by)`,
        [hospitalId, batch.source_name, targetEntity, m.sourceField, m.targetField || null, targetType, m.transformFn || null, userId]
      );
    }

    if (batch.target_entity !== "auto") {
      await pool.query(`UPDATE import_batches SET status = 'ready' WHERE id = ?`, [batch.id]);
      return res.json({ success: true });
    }

    // Auto mode: only flip to "ready" once every detected bucket has a
    // confirmed mapping AND no row is still sitting unclassified — an
    // unresolved "Unclassified" group must be explicitly reclassified or
    // explicitly skipped (see POST /:batchId/reclassify) before commit is
    // allowed, so nothing gets left behind without a deliberate decision.
    const [distinctEntities] = await pool.query(
      `SELECT DISTINCT detected_entity FROM import_staging_rows WHERE batch_id = ?`,
      [batch.id]
    );
    const stillUnclassified = distinctEntities.some((r) => r.detected_entity === null);
    let allMapped = !stillUnclassified;
    if (allMapped) {
      for (const { detected_entity } of distinctEntities) {
        if (detected_entity === null || detected_entity === "skipped") continue;
        const [[existing]] = await pool.query(
          `SELECT id FROM import_field_mappings WHERE hospital_id = ? AND source_name = ? AND target_entity = ? LIMIT 1`,
          [hospitalId, batch.source_name, detected_entity]
        );
        if (!existing) {
          allMapped = false;
          break;
        }
      }
    }
    await pool.query(`UPDATE import_batches SET status = ? WHERE id = ?`, [allMapped ? "ready" : "mapping", batch.id]);
    res.json({ success: true, allMapped });
  } catch (err) {
    console.error("Import mapping error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

// A 400-worthy problem (bad request state), as opposed to an unexpected
// server error — lets the route handler pick the right status code without
// commitEntityRows needing to know about Express at all.
class ImportUserError extends Error {}

// Commits every staged row for ONE entity bucket inside its own transaction —
// shared by the plain single-entity commit and each per-bucket commit an
// auto-detected import makes. Handles custom-field auto-registration, the
// overflow-redirect safety net, Ajv validation, and per-row dispatch to the
// right commit function for this entity, exactly as the single-entity path
// always has; entityName is what decides "the right function" now instead of
// it always being batch.target_entity.
async function commitEntityRows(hospitalId, userId, batch, entityName, entityDef, stagingRows) {
  const [mappingRows] = await pool.query(
    `SELECT source_field, target_field, target_type, transform_fn FROM import_field_mappings
     WHERE hospital_id = ? AND source_name = ? AND target_entity = ?`,
    [hospitalId, batch.source_name, entityName]
  );
  if (mappingRows.length === 0) {
    throw new ImportUserError("No field mapping found for this batch — confirm the mapping first.");
  }
  const mappingByField = new Map(mappingRows.map((m) => [m.source_field, m]));

  // Auto-register hospital-scoped custom fields for every extra_field-mapped
  // header BEFORE touching any row, inferring type from up to 50 sample
  // values across the whole file — this is the "no admin approval step"
  // auto-creation the feature is built around.
  const extraFieldHeaders = [...mappingByField.values()].filter((m) => m.target_type === "extra_field").map((m) => m.source_field);
  const customFieldsCreated = [];
  for (const header of extraFieldHeaders) {
    const samples = stagingRows.slice(0, 50).map((r) => r.raw_data[header]);
    const fieldType = inferFieldType(samples);
    await pool.query(
      `INSERT INTO hospital_custom_fields (hospital_id, entity, field_key, field_label, field_type, auto_created, created_from_batch)
       VALUES (?, ?, ?, ?, ?, TRUE, ?)
       ON DUPLICATE KEY UPDATE field_label = field_label`,
      [hospitalId, entityName, header, header, fieldType, batch.id]
    );
    customFieldsCreated.push({ fieldKey: header, fieldType });
  }

  // A mapped column whose value would overflow the real DB column's width
  // must never crash the whole row — that's the "half the batch fails" bug
  // (e.g. a long value mapped onto a VARCHAR(20) column throws "Data too
  // long for column" and takes every other valid field in that row down
  // with it). Only applies to "column"-storage fields (a "details"-storage
  // field has no fixed width to overflow — it's freeform JSON). Scan every
  // row's value for each column-mapped header up front and, if ANY row
  // would overflow, treat that header as an extra_field for this whole
  // commit instead (auto-registering a custom field for it).
  const fieldsAutoRedirected = [];
  for (const [header, mapping] of mappingByField.entries()) {
    if (mapping.target_type !== "column" || !mapping.target_field) continue;
    const fieldDef = entityDef.fields.find((f) => f.key === mapping.target_field);
    if (!fieldDef || !fieldDef.maxLength || fieldStorage(entityDef, fieldDef) !== "column") continue;
    const transformName = mapping.transform_fn || fieldDef.transform;
    const overflows = stagingRows.some((r) => {
      const raw = r.raw_data[header];
      const value = transformName ? applyTransform(transformName, raw) : raw;
      return value !== null && value !== undefined && String(value).length > fieldDef.maxLength;
    });
    if (!overflows) continue;

    mappingByField.set(header, { ...mapping, target_type: "extra_field", target_field: null });
    const samples = stagingRows.slice(0, 50).map((r) => r.raw_data[header]);
    const fieldType = inferFieldType(samples);
    await pool.query(
      `INSERT INTO hospital_custom_fields (hospital_id, entity, field_key, field_label, field_type, auto_created, created_from_batch)
       VALUES (?, ?, ?, ?, ?, TRUE, ?)
       ON DUPLICATE KEY UPDATE field_label = field_label`,
      [hospitalId, entityName, header, header, fieldType, batch.id]
    );
    customFieldsCreated.push({ fieldKey: header, fieldType });
    fieldsAutoRedirected.push({ fieldKey: header, targetField: fieldDef.key, targetLabel: fieldDef.label, maxLength: fieldDef.maxLength });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(`UPDATE import_batches SET status = 'committing' WHERE id = ?`, [batch.id]);

    // For "hospitals" (a singleton row that gets UPDATEd, never inserted),
    // capture exactly what the row looked like right before this batch
    // touches it, so DELETE /api/import/:batchId can restore it exactly
    // instead of just guessing which fields this batch changed.
    if (entityName === "hospitals") {
      const [[beforeRow]] = await connection.query(`SELECT * FROM hospitals WHERE id = ? LIMIT 1`, [hospitalId]);
      await connection.query(`UPDATE import_batches SET pre_commit_snapshot = ? WHERE id = ?`, [
        JSON.stringify(beforeRow || {}),
        batch.id,
      ]);
    }

    // Staff rows resolve a doctor's department name to a real department_id
    // once per distinct name, not once per row — auto-creating it for this
    // hospital the same way POST /api/departments does if it doesn't exist yet.
    const departmentCache = new Map();
    let hospitalShortCode = null;
    if (entityDef.table === "users") {
      const [[hospitalRow]] = await connection.query(`SELECT short_code FROM hospitals WHERE id = ? LIMIT 1`, [hospitalId]);
      hospitalShortCode = hospitalRow?.short_code || "HOSP";
    }

    // Patient rows resolve an "Assigned Doctor" name/email against this
    // hospital's real doctor accounts once up front, not per row — see
    // resolveDoctorLink below. Unlike a department, a doctor is never
    // auto-created here: a name that doesn't confidently match an existing
    // account is kept as a custom field instead (see commitPatientRow).
    let doctorLookup = null;
    if (entityName === "patients") {
      const [doctorRows] = await connection.query(`SELECT user_id, full_name, email FROM users WHERE hospital_id = ? AND role = 'doctor'`, [
        hospitalId,
      ]);
      const fuseIndex = new Fuse(doctorRows, { keys: ["full_name"], includeScore: true, threshold: 0.3, ignoreLocation: true });
      doctorLookup = { doctors: doctorRows, fuseIndex, cache: new Map() };
    }

    const validate = getAjvValidator(entityName, entityDef);
    let committedCount = 0;
    let failedCount = 0;
    let uhidCollisionsResolved = 0;
    let doctorLinksCreated = 0;
    let doctorLinksUnresolved = 0;
    // A handful of distinct failure reasons, surfaced back to the admin —
    // without this, "62 rows failed" gives no clue why, and the only place
    // the real reason lived was import_staging_rows.error_message, which the
    // UI never showed.
    const sampleErrors = [];
    function recordError(message) {
      if (sampleErrors.length < 5 && !sampleErrors.includes(message)) sampleErrors.push(message);
    }

    // The "hospitals" entity is a singleton per admin — every row updates the
    // same record, so real-column values from later rows win on conflict and
    // extra_fields accumulate across rows via JSON_MERGE_PATCH.
    for (const stagingRow of stagingRows) {
      const rawData = stagingRow.raw_data;
      const columnValues = {};
      const detailsValues = {};
      const specialValues = {};
      const opdMetaValues = {};
      const extraFieldValues = {};

      for (const header of Object.keys(rawData)) {
        const mapping = mappingByField.get(header);
        // Ultimate safety net for a header the admin never mapped at all —
        // still never dropped, just parked in extra_fields under its own name.
        if (!mapping) {
          extraFieldValues[header] = rawData[header];
          continue;
        }
        if (mapping.target_type === "ignored") continue;
        if (mapping.target_type === "extra_field") {
          extraFieldValues[header] = rawData[header];
          continue;
        }
        const fieldDef = entityDef.fields.find((f) => f.key === mapping.target_field);
        const transformName = mapping.transform_fn || fieldDef?.transform;
        const value = transformName ? applyTransform(transformName, rawData[header]) : rawData[header];
        const storage = fieldDef ? fieldStorage(entityDef, fieldDef) : "column";
        if (storage === "details") detailsValues[mapping.target_field] = value;
        else if (storage === "department") specialValues[mapping.target_field] = value;
        else if (storage === "doctor_link" || storage === "opd_meta") opdMetaValues[mapping.target_field] = value;
        else columnValues[mapping.target_field] = value;
      }

      const isValid = validate(columnValues);
      if (!isValid) {
        const message = ajv.errorsText(validate.errors, { separator: "; " });
        await connection.query(`UPDATE import_staging_rows SET status = 'error', error_message = ? WHERE id = ?`, [
          message.slice(0, 500),
          stagingRow.id,
        ]);
        recordError(message);
        failedCount++;
        continue;
      }

      try {
        if (entityName === "patients") {
          const { uhidCollisionResolved, doctorLinkResult } = await commitPatientRow(
            connection,
            hospitalId,
            userId,
            batch.id,
            columnValues,
            extraFieldValues,
            opdMetaValues,
            doctorLookup
          );
          if (uhidCollisionResolved) uhidCollisionsResolved++;
          if (doctorLinkResult === "created") doctorLinksCreated++;
          else if (doctorLinkResult === "unresolved") doctorLinksUnresolved++;
        } else if (entityName === "hospitals") {
          await commitHospitalRow(connection, hospitalId, columnValues, extraFieldValues);
        } else {
          await commitStaffRow(connection, hospitalId, batch.id, entityName, hospitalShortCode, columnValues, detailsValues, specialValues, extraFieldValues, departmentCache);
        }
        await connection.query(`UPDATE import_staging_rows SET status = 'committed' WHERE id = ?`, [stagingRow.id]);
        committedCount++;
      } catch (rowErr) {
        await connection.query(`UPDATE import_staging_rows SET status = 'error', error_message = ? WHERE id = ?`, [
          String(rowErr.message).slice(0, 500),
          stagingRow.id,
        ]);
        recordError(String(rowErr.message));
        failedCount++;
      }
    }

    await connection.commit();
    return {
      committedCount,
      failedCount,
      customFieldsCreated,
      fieldsAutoRedirected,
      sampleErrors,
      uhidCollisionsResolved,
      doctorLinksCreated,
      doctorLinksUnresolved,
    };
  } catch (err) {
    try {
      await connection.rollback();
    } catch {
      /* connection may already be gone */
    }
    throw err;
  } finally {
    connection.release();
  }
}

// ---------- POST /api/import/:batchId/commit ----------
//
// A plain single-entity batch commits everything in one call, same as
// always. An auto-detected batch commits ONE bucket per call — the client
// loops over every detected bucket and calls this once each, which is what
// lets the import screen show real, granular progress ("Importing
// doctors… 2/4") instead of one opaque wait for the whole mixed file.
router.post("/:batchId/commit", requireHospitalAdmin, async (req, res) => {
  const { hospitalId } = req.session.user;

  try {
    const [[batch]] = await pool.query(`SELECT * FROM import_batches WHERE id = ? AND hospital_id = ? LIMIT 1`, [
      req.params.batchId,
      hospitalId,
    ]);
    if (!batch) return res.status(404).json({ success: false, message: "Import batch not found." });
    if (batch.status === "committed") return res.status(409).json({ success: false, message: "This batch is already committed." });

    if (batch.target_entity !== "auto") {
      const entityDef = getEntity(batch.target_entity);
      const [stagingRows] = await pool.query(`SELECT * FROM import_staging_rows WHERE batch_id = ? ORDER BY row_num ASC`, [batch.id]);
      const result = await commitEntityRows(hospitalId, req.session.user.userId, batch, batch.target_entity, entityDef, stagingRows);
      await pool.query(
        `UPDATE import_batches SET status = 'committed', committed_rows = ?, failed_rows = ?, committed_at = NOW() WHERE id = ?`,
        [result.committedCount, result.failedCount, batch.id]
      );
      return res.json({
        success: true,
        committedRows: result.committedCount,
        failedRows: result.failedCount,
        customFieldsCreated: result.customFieldsCreated,
        fieldsAutoRedirected: result.fieldsAutoRedirected,
        sampleErrors: result.sampleErrors,
        uhidCollisionsResolved: result.uhidCollisionsResolved,
        doctorLinksCreated: result.doctorLinksCreated,
        doctorLinksUnresolved: result.doctorLinksUnresolved,
      });
    }

    // ---------- Auto-detect: commit ONE bucket ----------
    const targetEntity = req.body?.targetEntity;
    const entityDef = getEntity(targetEntity);
    if (!entityDef) {
      return res.status(400).json({ success: false, message: "A valid targetEntity is required for this batch." });
    }
    const [pendingUnclassified] = await pool.query(
      `SELECT COUNT(*) AS c FROM import_staging_rows WHERE batch_id = ? AND detected_entity IS NULL`,
      [batch.id]
    );
    if (pendingUnclassified[0].c > 0) {
      return res.status(400).json({
        success: false,
        message: "Some rows are still unclassified — reclassify or skip them before importing.",
      });
    }

    const [stagingRows] = await pool.query(
      `SELECT * FROM import_staging_rows WHERE batch_id = ? AND detected_entity = ? AND status IN ('pending','mapped') ORDER BY row_num ASC`,
      [batch.id, targetEntity]
    );
    if (stagingRows.length === 0) {
      return res.status(400).json({ success: false, message: "This group has already been imported." });
    }

    const result = await commitEntityRows(hospitalId, req.session.user.userId, batch, targetEntity, entityDef, stagingRows);

    // Running totals across every bucket committed so far this batch, not
    // just this call — an auto-detect batch is only "done" once every
    // bucket (patients, doctors, nurses, ...) has had its turn.
    const [[counts]] = await pool.query(
      `SELECT
         SUM(status = 'committed') AS committed,
         SUM(status = 'error') AS failed,
         SUM(status IN ('pending','mapped')) AS remaining
       FROM import_staging_rows WHERE batch_id = ?`,
      [batch.id]
    );
    const batchComplete = Number(counts.remaining) === 0;
    await pool.query(
      `UPDATE import_batches SET status = ?, committed_rows = ?, failed_rows = ?, committed_at = ? WHERE id = ?`,
      [batchComplete ? "committed" : "committing", Number(counts.committed) || 0, Number(counts.failed) || 0, batchComplete ? new Date() : null, batch.id]
    );

    res.json({
      success: true,
      entity: targetEntity,
      committedRows: result.committedCount,
      failedRows: result.failedCount,
      customFieldsCreated: result.customFieldsCreated,
      fieldsAutoRedirected: result.fieldsAutoRedirected,
      sampleErrors: result.sampleErrors,
      uhidCollisionsResolved: result.uhidCollisionsResolved,
      doctorLinksCreated: result.doctorLinksCreated,
      doctorLinksUnresolved: result.doctorLinksUnresolved,
      batchComplete,
      totalCommittedSoFar: Number(counts.committed) || 0,
      totalFailedSoFar: Number(counts.failed) || 0,
    });
  } catch (err) {
    console.error("Import commit error:", err.message);
    try {
      await pool.query(`UPDATE import_batches SET status = 'failed' WHERE id = ?`, [req.params.batchId]);
    } catch {
      /* best-effort status update */
    }
    const status = err instanceof ImportUserError ? 400 : 500;
    const prefix = status === 500 ? "Commit failed — no rows were changed. " : "";
    res.status(status).json({ success: false, message: prefix + err.message });
  }
});

// "Dr. Ramesh Gupta" / "Dr Ramesh Gupta" / "Doctor Ramesh Gupta" are all the
// exact same doctor as "Ramesh Gupta" — a title prefix, not a name
// difference — so it's stripped before any comparison. Deliberately handled
// as its own normalization step rather than left to fuzzy edit-distance,
// since it's a specific, extremely common pattern worth matching exactly
// rather than by chance.
function normalizeDoctorName(name) {
  return String(name).trim().replace(/^(dr\.?|prof\.?|doctor)\s+/i, "").trim().toLowerCase();
}

// Matches an "Assigned Doctor" cell (a name or email) against this
// hospital's real doctor accounts — exact email, then exact name (title
// prefix ignored), then a tight fuzzy match (score <= 0.2, deliberately
// stricter than the 0.45 used for header matching, since a wrong doctor
// link is worse than a wrong column guess an admin will see in the mapping
// table). Cached per distinct value so a batch of hundreds of patients
// doesn't repeat the same search.
function resolveDoctorLink(doctorLookup, rawValue) {
  if (!doctorLookup || !rawValue) return null;
  const value = String(rawValue).trim();
  if (!value) return null;
  const cacheKey = value.toLowerCase();
  if (doctorLookup.cache.has(cacheKey)) return doctorLookup.cache.get(cacheKey);

  let match = null;
  if (value.includes("@")) {
    match = doctorLookup.doctors.find((d) => d.email && d.email.toLowerCase() === cacheKey) || null;
  }
  if (!match) {
    const normalizedValue = normalizeDoctorName(value);
    match = doctorLookup.doctors.find((d) => d.full_name && normalizeDoctorName(d.full_name) === normalizedValue) || null;
  }
  if (!match) {
    const results = doctorLookup.fuseIndex.search(normalizeDoctorName(value));
    if (results.length > 0 && results[0].score <= 0.2) match = results[0].item;
  }
  doctorLookup.cache.set(cacheKey, match);
  return match;
}

async function commitPatientRow(connection, hospitalId, userId, batchId, columnValues, extraFieldValues, opdMetaValues = {}, doctorLookup = null) {
  let uhid = columnValues.uhid || null;
  const password = generateTempPassword();
  const passwordHash = await bcrypt.hash(password, 12);
  delete columnValues.uhid; // set after insert if not provided, same as POST /api/patients

  async function insertPatient(uhidValue, extras) {
    return connection.query(
      `INSERT INTO patients (hospital_id, uhid, password_hash, full_name, dob, gender, phone, address,
         emergency_contact_name, emergency_contact_phone, abha_id, abha_address, category, blood_group,
         registered_by, extra_fields, imported_from_batch)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        hospitalId,
        uhidValue,
        passwordHash,
        columnValues.full_name,
        columnValues.dob || null,
        columnValues.gender || null,
        columnValues.phone || null,
        columnValues.address || null,
        columnValues.emergency_contact_name || null,
        columnValues.emergency_contact_phone || null,
        columnValues.abha_id || null,
        columnValues.abha_address || null,
        columnValues.category || null,
        columnValues.blood_group || null,
        userId,
        Object.keys(extras).length ? JSON.stringify(extras) : null,
        batchId,
      ]
    );
  }

  let result;
  let uhidCollisionResolved = false;
  try {
    [result] = await insertPatient(uhid, extraFieldValues);
  } catch (err) {
    // A file-supplied UHID (e.g. a "patient_id" column mapped onto it) can
    // collide with one already in the database — a re-import of overlapping
    // data, or values that just happen to already be in use. That must never
    // fail the whole row: keep the file's value for reference, in extra_fields
    // (never dropped), and fall back to a freshly generated, guaranteed-unique
    // UHID instead of the one the file asked for.
    if (err.code === "ER_DUP_ENTRY" && uhid && err.message.includes("uhid")) {
      uhidCollisionResolved = true;
      extraFieldValues = { ...extraFieldValues, "uhid (from file)": uhid };
      uhid = null;
      [result] = await insertPatient(null, extraFieldValues);
    } else {
      throw err;
    }
  }

  if (!uhid) {
    const [[hospitalRow]] = await connection.query(`SELECT short_code FROM hospitals WHERE id = ? LIMIT 1`, [hospitalId]);
    uhid = generateUhid(hospitalRow?.short_code || "HOSP", result.insertId);
    await connection.query(`UPDATE patients SET uhid = ? WHERE id = ?`, [uhid, result.insertId]);
  }

  await connection.query(`INSERT INTO user_directory (user_id, hospital_id, account_type) VALUES (?, ?, 'patient')`, [uhid, hospitalId]);

  // Links this patient to a real doctor via a genuine opd_visits record —
  // the same relationship a real OPD booking creates, which is what makes
  // this patient show up on that doctor's own "My Patients" list (see
  // GET /api/doctor/patients in server.js). status is 'completed', not
  // 'waiting' — a bulk historical import must never land in today's live
  // queue as if the patient just walked in. source: 'import' distinguishes
  // it from a real walk-in/appointment/telemedicine booking.
  let doctorLinkResult = null;
  if (opdMetaValues.assigned_doctor) {
    const rawDoctorValue = String(opdMetaValues.assigned_doctor).trim();
    const matchedDoctor = resolveDoctorLink(doctorLookup, rawDoctorValue);
    if (matchedDoctor) {
      const visitDate = opdMetaValues.visit_date || new Date().toISOString().slice(0, 10);
      const [[countRow]] = await connection.query(`SELECT COUNT(*) AS cnt FROM opd_visits WHERE hospital_id = ? AND visit_date = ?`, [
        hospitalId,
        visitDate,
      ]);
      const tokenNumber = countRow.cnt + 1;
      await connection.query(
        `INSERT INTO opd_visits (hospital_id, token_number, patient_uhid, doctor_user_id, visit_date, source, status, created_by)
         VALUES (?, ?, ?, ?, ?, 'import', 'completed', ?)`,
        [hospitalId, tokenNumber, uhid, matchedDoctor.user_id, visitDate, userId]
      );
      doctorLinkResult = "created";
    } else {
      // Couldn't confidently match a real doctor — never silently dropped,
      // kept visible on the patient's own record instead.
      await connection.query(
        `UPDATE patients SET extra_fields = JSON_MERGE_PATCH(COALESCE(extra_fields, JSON_OBJECT()), ?) WHERE id = ?`,
        [JSON.stringify({ "assigned_doctor (unresolved)": rawDoctorValue }), result.insertId]
      );
      doctorLinkResult = "unresolved";
    }
  }

  return { uhidCollisionResolved, doctorLinkResult };
}

async function commitHospitalRow(connection, hospitalId, columnValues, extraFieldValues) {
  const setClauses = [];
  const params = [];
  Object.keys(columnValues).forEach((key) => {
    if (columnValues[key] === null || columnValues[key] === undefined) return;
    setClauses.push(`${key} = ?`);
    params.push(columnValues[key]);
  });

  if (Object.keys(extraFieldValues).length) {
    setClauses.push(`extra_fields = JSON_MERGE_PATCH(COALESCE(extra_fields, JSON_OBJECT()), ?)`);
    params.push(JSON.stringify(extraFieldValues));
  }
  if (setClauses.length === 0) return;

  params.push(hospitalId);
  await connection.query(`UPDATE hospitals SET ${setClauses.join(", ")} WHERE id = ?`, params);
}

// Mirrors POST /api/hospital/staff (the manual "Add Staff" form) exactly —
// an imported doctor/nurse/etc. ends up in the same `users` table, the same
// way, and shows up on the normal Existing Staff page with no separate
// import-only listing needed. columnValues holds full_name/email/phone (the
// three real `users` columns any staff role has); detailsValues holds every
// role-specific field (specialization, shift, ...); specialValues holds only
// a doctor's "department" name, resolved to a real department_id here
// (auto-creating the department for this hospital if it doesn't exist yet,
// same as POST /api/departments) rather than ever being stored as text.
async function commitStaffRow(connection, hospitalId, batchId, role, hospitalShortCode, columnValues, detailsValues, specialValues, extraFieldValues, departmentCache) {
  let departmentId = null;
  const departmentName = specialValues.department ? String(specialValues.department).trim() : "";
  if (role === "doctor" && departmentName) {
    const cacheKey = departmentName.toLowerCase();
    if (departmentCache.has(cacheKey)) {
      departmentId = departmentCache.get(cacheKey);
    } else {
      const [[existing]] = await connection.query(
        `SELECT id FROM departments WHERE hospital_id = ? AND LOWER(name) = LOWER(?) LIMIT 1`,
        [hospitalId, departmentName]
      );
      if (existing) {
        departmentId = existing.id;
      } else {
        const [inserted] = await connection.query(`INSERT INTO departments (hospital_id, name, created_by) VALUES (?, ?, 'data-import')`, [
          hospitalId,
          departmentName,
        ]);
        departmentId = inserted.insertId;
      }
      departmentCache.set(cacheKey, departmentId);
    }
  }

  // Same three-designation special case as the manual Add Staff form: a
  // Pathology-role row's User ID prefix comes from its chosen designation
  // (Pathologist/Lab Assistant/Radiologist), not a flat per-role prefix.
  const details = { ...detailsValues, ...extraFieldValues };
  const prefix = role === "pathology_staff" ? DESIGNATION_PREFIXES[details.designation] || ROLE_PREFIXES.pathology_staff : ROLE_PREFIXES[role];

  const password = generateTempPassword();
  const passwordHash = await bcrypt.hash(password, 12);

  // A random User ID (see generateStaffUserId) can collide on a large batch;
  // retry with a freshly generated one a few times rather than losing the
  // whole row to an ER_DUP_ENTRY on user_id.
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    const staffUserId = generateStaffUserId(prefix, hospitalShortCode);
    try {
      await connection.query(
        `INSERT INTO users (hospital_id, user_id, password_hash, full_name, role, email, phone, details, department_id, imported_from_batch)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          hospitalId,
          staffUserId,
          passwordHash,
          columnValues.full_name,
          role,
          columnValues.email,
          columnValues.phone || null,
          JSON.stringify(details),
          departmentId,
          batchId,
        ]
      );
      await connection.query(`INSERT INTO user_directory (user_id, hospital_id) VALUES (?, ?)`, [staffUserId, hospitalId]);
      return;
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY" && attempt < 2) {
        lastErr = err;
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

// ---------- GET /api/import/batches — history, for the hospital admin screen ----------

router.get("/batches", requireHospitalAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, batch_uid, source_name, original_filename, target_entity, status, total_rows, committed_rows, failed_rows, created_at, committed_at, reverted_at
       FROM import_batches WHERE hospital_id = ? ORDER BY created_at DESC LIMIT 50`,
      [req.session.user.hospitalId]
    );
    res.json({ success: true, batches: rows });
  } catch (err) {
    console.error("List import batches error:", err.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ---------- DELETE /api/import/:batchId — undo a bad import from the page itself ----------
//
// So a mismapped or garbled import doesn't need a support request to fix: the
// admin can delete everything that batch committed and re-upload with a
// corrected mapping. For "patients", that means removing exactly the rows
// this batch created (tracked via patients.imported_from_batch) plus their
// login entries — other batches' patients are never touched. For
// "hospitals" (a singleton row that only ever gets UPDATEd), there's no row
// to delete — instead the real columns + extra_fields are restored to
// exactly what they were right before this batch ran, from the snapshot
// captured at commit time (import_batches.pre_commit_snapshot).
router.delete("/:batchId", requireHospitalAdmin, async (req, res) => {
  const { hospitalId, userId } = req.session.user;
  let connection;

  try {
    const [[batch]] = await pool.query(`SELECT * FROM import_batches WHERE id = ? AND hospital_id = ? LIMIT 1`, [
      req.params.batchId,
      hospitalId,
    ]);
    if (!batch) return res.status(404).json({ success: false, message: "Import batch not found." });
    if (batch.status !== "committed") {
      return res.status(400).json({ success: false, message: "Only a committed import can be deleted." });
    }
    if (batch.reverted_at) {
      return res.status(409).json({ success: false, message: "This import was already deleted." });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    if (batch.target_entity === "patients") {
      const [rows] = await connection.query(`SELECT uhid FROM patients WHERE hospital_id = ? AND imported_from_batch = ?`, [
        hospitalId,
        batch.id,
      ]);
      const uhids = rows.map((r) => r.uhid).filter(Boolean);
      // A batch committed before the imported_from_batch column existed has
      // no way to identify which patients are "its" rows — silently
      // reporting success with 0 deletions would be a lie (the garbage data
      // is still there), so refuse instead of pretending it's handled.
      if (uhids.length === 0 && batch.committed_rows > 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "This import predates row-level tracking and can't be identified for automatic deletion. Contact support for manual cleanup.",
        });
      }
      if (uhids.length) {
        await connection.query(`DELETE FROM user_directory WHERE hospital_id = ? AND user_id IN (?)`, [hospitalId, uhids]);
      }
      await connection.query(`DELETE FROM patients WHERE hospital_id = ? AND imported_from_batch = ?`, [hospitalId, batch.id]);

      await connection.query(`UPDATE import_batches SET reverted_at = NOW(), reverted_by = ? WHERE id = ?`, [userId, batch.id]);
      await connection.commit();
      return res.json({ success: true, deletedRows: uhids.length });
    }

    if (batch.target_entity === "hospitals") {
      // Only the most recently committed hospitals-entity batch can be
      // safely undone: it's a single shared row, so if a later import has
      // since changed the same fields, restoring this batch's "before"
      // snapshot would also erase that later, unrelated change.
      // Ordered by id, not committed_at — two batches committed within the
      // same second would tie on a TIMESTAMP column (1-second resolution),
      // but id is a strictly increasing auto-increment, so it's unambiguous.
      const [[mostRecent]] = await pool.query(
        `SELECT id FROM import_batches WHERE hospital_id = ? AND target_entity = 'hospitals' AND status = 'committed' AND reverted_at IS NULL
         ORDER BY id DESC LIMIT 1`,
        [hospitalId]
      );
      if (!mostRecent || mostRecent.id !== batch.id) {
        await connection.rollback();
        return res.status(409).json({
          success: false,
          message: "A newer facility-data import has run since this one — only the most recent one can be undone.",
        });
      }
      if (!batch.pre_commit_snapshot) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: "This import predates the undo feature and can't be automatically reverted." });
      }

      const snapshot = batch.pre_commit_snapshot;
      const entityDef = getEntity("hospitals");
      const setClauses = [];
      const params = [];
      entityDef.fields.forEach((f) => {
        setClauses.push(`${f.key} = ?`);
        params.push(snapshot[f.key] ?? null);
      });
      setClauses.push("extra_fields = ?");
      params.push(snapshot.extra_fields ? JSON.stringify(snapshot.extra_fields) : null);
      params.push(hospitalId);
      await connection.query(`UPDATE hospitals SET ${setClauses.join(", ")} WHERE id = ?`, params);

      await connection.query(`UPDATE import_batches SET reverted_at = NOW(), reverted_by = ? WHERE id = ?`, [userId, batch.id]);
      await connection.commit();
      return res.json({ success: true, restored: true });
    }

    // Auto-detect batches only ever produce patients + staff rows (never a
    // "hospitals" singleton row — see roleClassifier.js), and every row they
    // create is tracked via imported_from_batch from day one (this entity
    // value didn't exist before that column did), so there's no legacy
    // "predates tracking" case to guard against here.
    if (batch.target_entity === "auto") {
      const [patientRows] = await connection.query(`SELECT uhid FROM patients WHERE hospital_id = ? AND imported_from_batch = ?`, [
        hospitalId,
        batch.id,
      ]);
      const uhids = patientRows.map((r) => r.uhid).filter(Boolean);
      if (uhids.length) {
        await connection.query(`DELETE FROM user_directory WHERE hospital_id = ? AND user_id IN (?)`, [hospitalId, uhids]);
      }
      await connection.query(`DELETE FROM patients WHERE hospital_id = ? AND imported_from_batch = ?`, [hospitalId, batch.id]);

      const [staffRows] = await connection.query(`SELECT user_id FROM users WHERE hospital_id = ? AND imported_from_batch = ?`, [
        hospitalId,
        batch.id,
      ]);
      const staffUserIds = staffRows.map((r) => r.user_id).filter(Boolean);
      if (staffUserIds.length) {
        await connection.query(`DELETE FROM user_directory WHERE hospital_id = ? AND user_id IN (?)`, [hospitalId, staffUserIds]);
      }
      await connection.query(`DELETE FROM users WHERE hospital_id = ? AND imported_from_batch = ?`, [hospitalId, batch.id]);

      await connection.query(`UPDATE import_batches SET reverted_at = NOW(), reverted_by = ? WHERE id = ?`, [userId, batch.id]);
      await connection.commit();
      return res.json({ success: true, deletedRows: uhids.length + staffUserIds.length, deletedPatients: uhids.length, deletedStaff: staffUserIds.length });
    }

    await connection.rollback();
    res.status(400).json({ success: false, message: "Unknown entity for this batch." });
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        /* connection may already be gone */
      }
    }
    console.error("Import delete error:", err.message);
    res.status(500).json({ success: false, message: "Server error while deleting this import. Please try again." });
  } finally {
    if (connection) connection.release();
  }
});

// ---------- GET /api/import/field-usage/:entity ----------

router.get("/field-usage/:entity", requireSuperadmin, async (req, res) => {
  if (!getEntity(req.params.entity)) {
    return res.status(400).json({ success: false, message: `Unknown entity. Supported: ${listEntities().join(", ")}.` });
  }
  try {
    // Deliberately not hospital-scoped — the whole point is seeing which
    // extra fields are common ACROSS hospitals, to decide if one should
    // graduate into a real schemaRegistry.js column. Only key/type/hospital
    // counts are returned, never any actual patient/hospital data.
    const [rows] = await pool.query(
      `SELECT field_key, field_type, COUNT(DISTINCT hospital_id) AS hospital_count
       FROM hospital_custom_fields WHERE entity = ? GROUP BY field_key, field_type ORDER BY hospital_count DESC`,
      [req.params.entity]
    );
    res.json({ success: true, fieldUsage: rows });
  } catch (err) {
    console.error("Field usage error:", err.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

module.exports = router;
