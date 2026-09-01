// Single source of truth for "known" columns per importable entity — this is
// what incoming CSV/XLSX headers get fuzzy-matched against (see
// server/importRoutes.js). Adding a column here later (once enough hospitals
// have sent the same custom field — see GET /api/import/field-usage/:entity)
// is how a hospital-scoped custom field eventually "graduates" into a real,
// global schema column; until then it stays scoped to whichever hospital(s)
// actually use it, in hospital_custom_fields + patients/hospitals.extra_fields.
//
// field.key must be the real column name in server/schema.js. `aliases` are
// extra header spellings fed to Fuse.js alongside the key/label so a header
// like "Mobile No." still matches `phone` without needing an exact label match.
// `transform` (optional) names a function in server/importTransforms.js run
// on every staged value for that field before it's written to the real column.

const patients = {
  table: "patients",
  // Every patient row belongs to exactly one hospital — set from the
  // importing admin's own session, never read from the file.
  hospitalScopedColumn: "hospital_id",
  fields: [
    // maxLength mirrors the real VARCHAR width in server/schema.js — used to
    // catch a value that would overflow the real column BEFORE the INSERT/
    // UPDATE runs (see redirectOverflowingFields in importRoutes.js). A value
    // that's too long is never dropped, just diverted to extra_fields instead
    // of crashing the whole row the way a raw "Data too long for column"
    // MySQL error used to.
    { key: "full_name", label: "Full Name", type: "string", required: true, maxLength: 150, aliases: ["name", "patient name", "patient full name"] },
    { key: "uhid", label: "UHID", type: "string", maxLength: 30, aliases: ["patient id", "mrn", "hospital id no", "unique health id"] },
    { key: "dob", label: "Date of Birth", type: "date", transform: "parseDate", aliases: ["date of birth", "birth date", "dob"] },
    { key: "gender", label: "Gender", type: "string", maxLength: 10, aliases: ["sex"] },
    { key: "phone", label: "Phone", type: "string", transform: "trimString", maxLength: 20, aliases: ["mobile", "contact number", "phone number", "mobile number", "contact no"] },
    { key: "address", label: "Address", type: "string", maxLength: 255, aliases: ["addr", "residential address"] },
    { key: "emergency_contact_name", label: "Emergency Contact Name", type: "string", maxLength: 150, aliases: ["emergency contact", "next of kin"] },
    { key: "emergency_contact_phone", label: "Emergency Contact Phone", type: "string", maxLength: 20, aliases: ["emergency phone", "emergency number"] },
    { key: "abha_id", label: "ABHA ID", type: "string", maxLength: 50, aliases: ["abha number", "abha"] },
    { key: "abha_address", label: "ABHA Address", type: "string", maxLength: 100, aliases: ["abha id address", "health id address"] },
    { key: "category", label: "Category", type: "string", maxLength: 20, aliases: ["patient category", "type"] },
    { key: "blood_group", label: "Blood Group", type: "string", maxLength: 4, aliases: ["blood type", "bloodgroup"] },
    // Not a patients column at all — resolved against your existing doctor
    // accounts (by name or email) at commit time and turned into a real
    // opd_visits record linking the two, the same relationship a real OPD
    // booking creates. See requireOrLinkDoctor in server/importRoutes.js. A
    // name that can't be confidently matched to a real doctor is never
    // silently dropped — it's kept as a custom field instead.
    { key: "assigned_doctor", label: "Assigned Doctor", type: "string", storage: "doctor_link", aliases: ["doctor", "assigned doctor", "treating doctor", "doctor name", "consulting doctor", "physician", "primary doctor"] },
    // Optional — the date of that visit. Defaults to today if omitted or
    // unparseable, since a linked visit record needs a date regardless.
    { key: "visit_date", label: "Visit / Consultation Date", type: "date", storage: "opd_meta", transform: "parseDate", aliases: ["visit date", "consultation date", "admission date", "appointment date"] },
  ],
};

const hospitals = {
  table: "hospitals",
  // A hospital admin only ever has one hospital row — its id, never a value
  // read from the file. Import for this entity always targets exactly one
  // existing row (an UPDATE, matched on the admin's own hospitalId), never
  // an INSERT — a hospital admin can't create other hospitals.
  hospitalScopedColumn: "id",
  fields: [
    { key: "license_number", label: "License Number", type: "string", maxLength: 100, aliases: ["licence number", "license no"] },
    { key: "pan", label: "PAN", type: "string", maxLength: 20 },
    { key: "hfr_id", label: "HFR ID", type: "string", maxLength: 50, aliases: ["health facility registry id"] },
    { key: "address", label: "Address", type: "string", maxLength: 255 },
    { key: "city", label: "City", type: "string", maxLength: 100 },
    { key: "state", label: "State", type: "string", maxLength: 100 },
    { key: "pincode", label: "Pincode", type: "string", maxLength: 12, aliases: ["pin code", "zip"] },
    { key: "bed_count", label: "Bed Count", type: "number", transform: "toInt", aliases: ["number of beds", "beds"] },
    { key: "opd_volume", label: "Avg. OPD Volume / day", type: "number", transform: "toInt", aliases: ["opd volume", "daily opd"] },
    { key: "admin_name", label: "Admin Name", type: "string", maxLength: 150 },
  ],
};

// ---------- Staff roles (doctor, nurse, pharmacist, ...) ----------
//
// Unlike patients/hospitals, a staff row lives in the shared `users` table
// with a `role` column, plus a `details` JSON blob for everything role-
// specific (mirrors hospital/hospital.js's ROLE_FIELDS, which is what the
// manual "Add Staff" form uses — importing a doctor ends up in the exact
// same place a manually-added one would, so it shows up on the normal
// Existing Staff page with no separate import-only listing needed).
//
// `storage` on a field says where its value goes at commit time:
//   "column"     — a real column on `users` (full_name, email, phone)
//   "details"    — merged into the `users.details` JSON blob under this key
//   "department" — doctor-only: resolved to a real `departments` row (looked
//                  up by name for this hospital, auto-created if missing)
//                  and written to users.department_id, never into `details`.
// Fields with no `storage` default to "details".
function staffRole(role, extraFields) {
  return {
    table: "users",
    role,
    hospitalScopedColumn: "hospital_id",
    fields: [
      { key: "full_name", label: "Full Name", type: "string", required: true, maxLength: 150, storage: "column", aliases: ["name", "staff name", "full name"] },
      { key: "email", label: "Email", type: "string", required: true, maxLength: 150, storage: "column", aliases: ["email id", "email address", "e-mail"] },
      { key: "phone", label: "Phone", type: "string", maxLength: 20, storage: "column", transform: "trimString", aliases: ["mobile", "contact number", "phone number", "mobile number"] },
      ...extraFields,
    ],
  };
}

const doctor = staffRole("doctor", [
  { key: "department", label: "Department", type: "string", storage: "department", aliases: ["dept", "specialty department"] },
  { key: "specialization", label: "Specialization", type: "string", aliases: ["specialty"] },
  { key: "qualification", label: "Qualification", type: "string", aliases: ["degree"] },
  { key: "licenseNumber", label: "Medical License No.", type: "string", aliases: ["license number", "registration number", "medical license"] },
  { key: "consultationFee", label: "Telemedicine Consultation Fee", type: "number", transform: "toFloat", aliases: ["consultation fee", "fee"] },
]);

const nurse = staffRole("nurse", [
  { key: "qualification", label: "Qualification", type: "string", aliases: ["degree"] },
  { key: "shift", label: "Shift", type: "string", aliases: ["work shift"] },
  { key: "ward", label: "Ward", type: "string", aliases: ["assigned ward"] },
]);

const pharmacist = staffRole("pharmacist", [
  { key: "licenseNumber", label: "License No.", type: "string", aliases: ["license number", "registration number"] },
  { key: "qualification", label: "Qualification", type: "string", aliases: ["degree"] },
]);

const pathology_staff = staffRole("pathology_staff", [
  { key: "designation", label: "Designation", type: "string", aliases: ["title"] },
  { key: "certification", label: "Certification", type: "string" },
  { key: "licenseNumber", label: "License No.", type: "string", aliases: ["license number", "registration number"] },
]);

const receptionist = staffRole("receptionist", [
  { key: "shift", label: "Shift", type: "string", aliases: ["work shift"] },
]);

const billing_staff = staffRole("billing_staff", [
  { key: "department", label: "Department", type: "string", aliases: ["section"] },
]);

const blood_bank_staff = staffRole("blood_bank_staff", [
  { key: "certification", label: "Certification", type: "string" },
  { key: "licenseNumber", label: "License No.", type: "string", aliases: ["license number", "registration number"] },
]);

const ENTITIES = {
  patients,
  hospitals,
  doctor,
  nurse,
  pharmacist,
  pathology_staff,
  receptionist,
  billing_staff,
  blood_bank_staff,
};

function getEntity(name) {
  return ENTITIES[name] || null;
}

function listEntities() {
  return Object.keys(ENTITIES);
}

module.exports = { ENTITIES, getEntity, listEntities };
