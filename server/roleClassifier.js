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
  const fuse = new Fuse(
    ROLE_COLUMN_ALIASES.map((alias) => ({ alias })),
    { keys: ["alias"], includeScore: true, threshold: 0.35, ignoreLocation: true }
  );
  let best = null;
  for (const header of headers) {
    const results = fuse.search(header.trim());
    if (results.length > 0 && (!best || results[0].score < best.score)) {
      best = { header, score: results[0].score };
    }
  }
  return best ? best.header : null;
}

// Classifies one row's raw role-column value. A blank value defaults to
// "patients" — real-world hospital data overwhelmingly labels STAFF with a
// job title/designation and simply leaves this blank for patients, who don't
// have one. Returns { entity, confidence: "high"|"low", rawLabel } or
// { entity: null, confidence: null, rawLabel } when no confident match at
// all — those rows are surfaced to the admin as "Unclassified" rather than
// silently guessed at.
function classifyRow(rawValue) {
  const rawLabel = rawValue === null || rawValue === undefined ? "" : String(rawValue).trim();
  if (rawLabel === "") return { entity: "patients", confidence: "high", rawLabel: "" };

  const results = getRoleValueFuseIndex().search(rawLabel);
  if (results.length === 0) return { entity: null, confidence: null, rawLabel };

  const best = results[0];
  const confidence = best.score <= 0.15 ? "high" : "low";
  return { entity: best.item.role, confidence, rawLabel };
}

module.exports = { CLASSIFIABLE_ENTITIES, ROLE_ALIASES, ROLE_COLUMN_ALIASES, detectRoleColumn, classifyRow };
