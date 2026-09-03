// Row-level classifier for the "Auto-detect (mixed dataset)" import mode —
// see server/importRoutes.js. Given a single unsorted file that mixes
// patients, doctors, nurses, and other staff in one table, this decides which
// bucket each ROW belongs to, based on a "role/type" column the file must
// contain (e.g. "Role", "Type", "Designation"). Deliberately does NOT try to
// guess a row's identity purely from which other columns happen to be filled
// in — that's a heuristic, not a fact, and this feature is explicitly
// required to be accurate. An explicit role/type value per row is the one
// reliable signal a flat CSV/XLSX can carry, since every row shares the same
// header set.
const Fuse = require("fuse.js");
const { STAFF_ROLES } = require("./roles");

// The classification target is "patients" (an entity, not a STAFF_ROLE) plus
// every staff role. Aliases are extra phrasings likely to appear as a raw
// cell value in a "role"/"type" column, fed to Fuse.js alongside the
// canonical key itself.
const ROLE_ALIASES = {
  patients: ["patient", "patients", "opd patient", "ipd patient", "outpatient", "inpatient", "attendee"],
  doctor: ["doctor", "doctors", "physician", "consultant", "surgeon", "dr", "medical officer", "specialist"],
  nurse: ["nurse", "nurses", "staff nurse", "nursing staff", "nursing officer", "ward nurse"],
  pharmacist: ["pharmacist", "pharmacy staff", "pharmacy", "druggist"],
  pathology_staff: ["pathologist", "lab technician", "lab assistant", "radiologist", "pathology staff", "lab staff", "technician", "radiology staff"],
  receptionist: ["receptionist", "front desk", "opd staff", "reception", "front office"],
  billing_staff: ["billing staff", "billing", "cashier", "accounts staff", "accountant", "accounts"],
  blood_bank_staff: ["blood bank staff", "blood bank", "transfusion staff", "transfusion"],
};

// Every classifiable entity key, in a stable display order (patients first,
// then staff roles alphabetically-ish by how they're introduced above).
const CLASSIFIABLE_ENTITIES = ["patients", ...STAFF_ROLES];

// Header names likely to hold each row's role/type — this is what tells the
// upload step "this file mixes multiple kinds of people" in the first place.
const ROLE_COLUMN_ALIASES = [
  "role", "type", "user type", "user role", "designation", "position",
  "staff type", "category", "job title", "occupation", "person type", "record type",
];

let roleValueFuseIndex = null;
function getRoleValueFuseIndex() {
  if (roleValueFuseIndex) return roleValueFuseIndex;
  const items = [];
  Object.entries(ROLE_ALIASES).forEach(([role, aliases]) => {
    aliases.forEach((alias) => items.push({ role, alias }));
  });
  roleValueFuseIndex = new Fuse(items, { keys: ["alias"], includeScore: true, threshold: 0.4, ignoreLocation: true });
  return roleValueFuseIndex;
}

// Looks at the file's headers and returns the one most likely to be a
// role/type indicator, or null if none looks like one. Fuse.js against a
// short alias list, same pattern as header-to-schema-field matching.
function detectRoleColumn(headers) {
  if (!headers || headers.length === 0) return null;
  const candidates = detectRoleColumnCandidates(headers);
  return candidates.length > 0 ? candidates[0].header : null;
}

// Same alias matching as detectRoleColumn, but returns EVERY header that
// plausibly looks like a role/type column (sorted best-first by score), not
// just the single winner — detectBestRoleColumnForRows below needs multiple
// candidates to choose between using actual row data, not just the name.
function detectRoleColumnCandidates(headers) {
  if (!headers || headers.length === 0) return [];
  const fuse = new Fuse(
    ROLE_COLUMN_ALIASES.map((alias) => ({ alias })),
    { keys: ["alias"], includeScore: true, threshold: 0.35, ignoreLocation: true }
  );
  const candidates = [];
  for (const header of headers) {
    const results = fuse.search(header.trim());
    if (results.length > 0) candidates.push({ header, score: results[0].score });
  }
  candidates.sort((a, b) => a.score - b.score);
  return candidates;
}

// Several DIFFERENT headers can equally "look like" a role/type column by
// name alone — role/category/type/designation/position are ALL in
// ROLE_COLUMN_ALIASES, but in a wide multi-table export (see
// detectMultiEntityBatch in server/importRoutes.js) only ONE of them is
// actually THIS row group's real role indicator; the others are just as
// likely to be an unrelated column belonging to a completely different
// table that happens to share a common name (e.g. a billing_tariff row's
// "category", a doctor's "designation"). Real bug found 2026-09-03: plain
// name-based matching (detectRoleColumn) picked whichever candidate scored
// best/appeared first — pure column-order luck — and picked a column that
// was blank for every "users" row in a real ~130-column export, silently
// sending 99 staff records (every one with a perfectly valid role value,
// just in a DIFFERENT column) to Unclassified. This instead tries every
// plausible candidate against the ACTUAL rows and picks whichever one
// produces the most successful classifications — a data-driven choice,
// not a name-only guess that depends on where the column happens to sit.
function detectBestRoleColumnForRows(rows, headers) {
  const candidates = detectRoleColumnCandidates(headers);
  if (candidates.length === 0) return null;
  if (candidates.length === 1 || rows.length === 0) return candidates[0].header;

  let best = null;
  for (const candidate of candidates) {
    const successCount = rows.reduce((count, row) => (classifyRow(row[candidate.header]).entity ? count + 1 : count), 0);
    if (!best || successCount > best.successCount || (successCount === best.successCount && candidate.score < best.score)) {
      best = { header: candidate.header, score: candidate.score, successCount };
    }
  }
  // Nothing actually classified anything against any candidate — fall back
  // to the plain best NAME match rather than giving up on a column entirely,
  // same as detectRoleColumn's own behavior for this edge case.
  return best.successCount > 0 ? best.header : candidates[0].header;
}

// Classifies one row's raw role-column value. Returns { entity, confidence:
// "high"|"low", rawLabel } or { entity: null, confidence: null, rawLabel }
// when no confident match at all — those rows are surfaced to the admin as
// "Unclassified" rather than silently guessed at.
//
// A blank value used to default straight to "patients" ("real-world hospital
// data overwhelmingly labels STAFF with a job title and leaves this blank for
// patients"). That assumption breaks badly on a file that isn't a clean
// patient+staff list — verified against a real import where the uploaded CSV
// was actually a full multi-table database export (patients, beds, bills,
// consultations, lab orders, vitals, wards, ~30 tables total unioned into one
// file), where almost every non-patient row ALSO has a blank category. The
// blank-defaults-to-patients rule swept ~9,900 unrelated rows into the
// Patient bucket, and a handful with a coincidentally-matching column even
// committed as garbage patient records (e.g. a department's name landing in
// a patient's full_name field). Blank now goes to Unclassified like any other
// unrecognized value — for a genuinely clean patient file this costs one
// extra "classify these as Patients" confirmation; the failure mode it
// prevents (silently importing unrelated table rows as patients) is far
// worse than that one extra click.
function classifyRow(rawValue) {
  const rawLabel = rawValue === null || rawValue === undefined ? "" : String(rawValue).trim();
  // Fuse.js doesn't treat an empty query as "no results" — verified it
  // actually matches an arbitrary item with an empty pattern, which would
  // silently reintroduce a blank-defaults-to-something bug. Blank must be
  // handled before ever reaching Fuse, not assumed to fall through safely.
  if (rawLabel === "") return { entity: null, confidence: null, rawLabel: "" };

  const results = getRoleValueFuseIndex().search(rawLabel);
  if (results.length === 0) return { entity: null, confidence: null, rawLabel };

  const best = results[0];
  const confidence = best.score <= 0.15 ? "high" : "low";
  return { entity: best.item.role, confidence, rawLabel };
}

module.exports = {
  CLASSIFIABLE_ENTITIES,
  ROLE_ALIASES,
  ROLE_COLUMN_ALIASES,
  detectRoleColumn,
  detectRoleColumnCandidates,
  detectBestRoleColumnForRows,
  classifyRow,
};
