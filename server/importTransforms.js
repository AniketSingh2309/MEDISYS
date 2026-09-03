// Named transform functions referenced by key from schemaRegistry.js fields
// (field.transform) and applied to every staged value for that field right
// before it's written into a real column during commit (see
// server/importRoutes.js). Kept separate from schemaRegistry.js so the
// registry itself stays a plain declarative field list.

function trimString(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

function toInt(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = parseInt(String(value).replace(/[,\s]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

function toFloat(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = parseFloat(String(value).replace(/[,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

const MONTH_NAMES = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

// Accepts YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, and "14 May 1990"/"May 14, 1990"
// style textual dates (best-effort — Indian hospital exports are overwhelmingly
// DD-MM-YYYY, so that wins ties over MM/DD when a date could be read either
// way, e.g. "05/06/2020"). Deliberately an explicit allowlist rather than
// handing the raw string to `new Date()` — that constructor is far too lenient
// (e.g. `new Date("POLICY-TEST-001")` silently returns a real date) and would
// misclassify plain identifier/code strings as dates.
function parseDate(value) {
  if (value === null || value === undefined || value === "") return null;
  const raw = String(value).trim();

  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) return toIsoIfValid(+isoMatch[1], +isoMatch[2], +isoMatch[3]);

  const dmyMatch = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const day = +dmyMatch[1];
    const month = +dmyMatch[2];
    const year = +dmyMatch[3];
    // If the "day" slot is > 12 it can only be DD/MM; otherwise assume
    // DD/MM/YYYY (the common convention in Indian hospital data exports).
    return toIsoIfValid(year, month, day);
  }

  const dMonYMatch = raw.match(/^(\d{1,2})[-\s]([A-Za-z]{3,9})[-\s](\d{4})$/);
  if (dMonYMatch) {
    const month = MONTH_NAMES[dMonYMatch[2].slice(0, 3).toLowerCase()];
    if (month) return toIsoIfValid(+dMonYMatch[3], month, +dMonYMatch[1]);
  }

  const monDYMatch = raw.match(/^([A-Za-z]{3,9})[-\s](\d{1,2}),?[-\s](\d{4})$/);
  if (monDYMatch) {
    const month = MONTH_NAMES[monDYMatch[1].slice(0, 3).toLowerCase()];
    if (month) return toIsoIfValid(+monDYMatch[3], month, +monDYMatch[2]);
  }

  return null;
}

function toIsoIfValid(year, month, day) {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function normalizeBoolean(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim().toLowerCase();
  if (["yes", "true", "y", "1"].includes(s)) return true;
  if (["no", "false", "n", "0"].includes(s)) return false;
  return null;
}

// Derives a day-of-week integer (0=Sunday..6=Saturday, matching Date.getDay()
// — the exact convention DAY_LABELS in hospital/hospital.js already indexes
// by) from a calendar date. Used by a field.deriveFrom transform (see
// schemaRegistry.js nurse_shift_roster.day_of_week) when a file tracks shifts
// by specific date rather than a recurring weekday — real gap found
// 2026-09-02: a genuine export used a "shift_date" column instead of
// "day_of_week", data the file already fully contains, just not in the
// exact shape the target column expects. UTC-anchored so the result never
// shifts by a day depending on the server's local timezone.
function dateToDayOfWeek(value) {
  const iso = parseDate(value);
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00Z");
  return Number.isNaN(d.getTime()) ? null : d.getUTCDay();
}

const TRANSFORMS = { trimString, toInt, toFloat, parseDate, normalizeBoolean, dateToDayOfWeek };

function applyTransform(name, value) {
  const fn = TRANSFORMS[name];
  return fn ? fn(value) : value;
}

// Same date/number/boolean detection used to decide a transform for a known
// field is reused to infer hospital_custom_fields.field_type for an unmatched
// one — see inferFieldType in importRoutes.js.
function looksLikeDate(value) {
  return parseDate(value) !== null;
}
function looksLikeNumber(value) {
  return value !== "" && value !== null && !Number.isNaN(Number(String(value).replace(/[,\s]/g, "")));
}
function looksLikeBoolean(value) {
  return normalizeBoolean(value) !== null;
}

module.exports = { TRANSFORMS, applyTransform, looksLikeDate, looksLikeNumber, looksLikeBoolean, parseDate, toInt, toFloat, normalizeBoolean, trimString, dateToDayOfWeek };
