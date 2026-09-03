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
    { key: "name", label: "Hospital Name", type: "string", maxLength: 200, aliases: ["hospital name", "facility name"] },
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
    // Real gap found 2026-09-03: these are genuine columns on the real
    // `hospitals` table (see server/schema.js) that were simply never added
    // here when this entity was first written, so a file with these exact
    // headers fell into "New field" (a custom field) instead of the real
    // column, even though the file was never about anything BUT this table.
    { key: "admin_email", label: "Admin Email", type: "string", maxLength: 150, aliases: ["email", "email id", "admin email id", "hospital admin email"] },
    { key: "dpdp_consent", label: "DPDP Consent", type: "boolean", transform: "normalizeBoolean", aliases: ["dpdp", "consent", "data protection consent"] },
    { key: "status", label: "Status", type: "string", maxLength: 20, enum: ["pending_activation", "active"], aliases: ["hospital status", "activation status"] },
    { key: "nurse_assignment_mode", label: "Nurse Assignment Mode", type: "string", enum: ["ward_based", "doctor_team"], aliases: ["nurse assignment", "nurse mode", "assignment mode"] },
    // Deliberately NOT added, even though they're real columns:
    //  - modules: a JSON array (which enabled OPD/pharmacy/etc. modules this
    //    hospital has), not a plain scalar a CSV cell can represent safely.
    //  - invite_token, invite_sent_at, admin_user_id, short_code, created_by:
    //    internal/system-managed state. short_code in particular drives
    //    every UHID/staff-ID prefix already generated for this hospital —
    //    silently changing it via import would desync new IDs from every
    //    existing one. admin_user_id is literally the admin's own login —
    //    overwriting it could disconnect their account. None of these
    //    should ever be settable by re-uploading a spreadsheet.
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

// ---------- Generic entities (multi-entity single-file import) ----------
//
// Everything below backs the "upload one file with a table_name column
// spanning every MEDISYS table" feature (see server/importRoutes.js,
// detectMultiEntityBatch / commitGenericRow). Unlike patients/hospitals/staff
// above, none of these have bespoke business logic (no password/UHID
// generation, no doctor-name resolution) — a plain INSERT built straight from
// the field list below, which is why `kind: "generic"` fields skip the
// column/details/department "storage" distinction entirely (every field is a
// real column on `table`).
//
// `ref: "<entityKey>"` marks a column that holds another table's surrogate
// (AUTO_INCREMENT) primary key rather than a natural business key. Natural
// keys (patient_uhid, doctor_user_id, ward/department NAMEs) are looked up or
// passed straight through and never need `ref` — only a column whose value is
// only meaningful as "row N's real id, once inserted" needs it. See
// commitGenericRow/collectCsvLocalIds in importRoutes.js for how `ref` values
// get resolved against the cross-tier id map built as earlier tiers commit.
function genericEntity(table, label, fields) {
  return { table, label, kind: "generic", hospitalScopedColumn: "hospital_id", fields };
}

const departments = genericEntity("departments", "Departments", [
  { key: "name", label: "Department Name", type: "string", required: true, maxLength: 100, aliases: ["department name", "dept name", "department"] },
  { key: "created_by", label: "Created By", type: "string", maxLength: 50 },
]);

const wards = genericEntity("wards", "Wards", [
  { key: "name", label: "Ward Name", type: "string", required: true, maxLength: 100, aliases: ["ward name", "ward"] },
  { key: "department_id", label: "Department", type: "string", ref: "departments", aliases: ["department", "department id", "dept"] },
  { key: "created_by", label: "Created By", type: "string", maxLength: 50 },
]);

const test_catalog = genericEntity("test_catalog", "Test Catalog", [
  { key: "name", label: "Test Name", type: "string", required: true, maxLength: 150, aliases: ["test name"] },
  // Real gap found 2026-09-03: a genuine export had "department" populated
  // (e.g. "pathology") but its own "category" column genuinely blank for
  // every row — the file just doesn't carry that finer-grained distinction
  // (Hematology/Biochemistry/... vs. the broader Pathology/Radiology
  // department), only the broader one. category is a real NOT NULL column
  // (server/schema.js), so it can't just be skipped — deriving it from
  // department when nothing mapped to category directly is a reasonable,
  // non-fabricated fallback (no `transform` in deriveFrom means a plain
  // copy — see applyTransform in server/importTransforms.js, which returns
  // the value unchanged when no named transform is given).
  { key: "category", label: "Category", type: "string", required: true, maxLength: 30, deriveFrom: { siblingField: "department" } },
  { key: "department", label: "Department", type: "string", maxLength: 50 },
  { key: "sample_type", label: "Sample Type", type: "string", maxLength: 50, aliases: ["sample"] },
  { key: "price", label: "Price", type: "number", transform: "toFloat" },
  { key: "turnaround_hours", label: "Turnaround (hours)", type: "number", transform: "toInt", aliases: ["turnaround"] },
  { key: "is_panel", label: "Is Panel", type: "boolean", transform: "normalizeBoolean", aliases: ["panel"] },
]);

const billing_tariff = genericEntity("billing_tariff", "Billing Tariff", [
  { key: "charge_head", label: "Charge Head", type: "string", required: true, maxLength: 150, aliases: ["charge head", "tariff name", "service name", "service_name", "item name", "item_name", "charge name"] },
  { key: "department", label: "Department", type: "string", required: true, maxLength: 30, aliases: ["dept", "section", "service category", "service_category"] },
  { key: "default_rate", label: "Default Rate", type: "number", transform: "toFloat", aliases: ["rate", "default rate", "price"] },
]);

// Cross-database — pharmacy tables live in medisys_pharmacy, not the main
// hospital DB (see CREATE DATABASE IF NOT EXISTS medisys_pharmacy in
// server/schema.js). `table` is schema-qualified; commitGenericRow backtick-
// quotes each dot-separated segment separately.
const pharmacy_stock = genericEntity("medisys_pharmacy.pharmacy_stock", "Pharmacy Stock", [
  { key: "medicine_name", label: "Medicine Name", type: "string", required: true, maxLength: 150, aliases: ["medicine", "drug name"] },
  { key: "category", label: "Category", type: "string", required: true, maxLength: 50 },
  { key: "batch_number", label: "Batch Number", type: "string", required: true, maxLength: 50, aliases: ["batch no", "batch"] },
  { key: "expiry_date", label: "Expiry Date", type: "date", required: true, transform: "parseDate", aliases: ["expiry"] },
  { key: "stock_quantity", label: "Stock Quantity", type: "number", transform: "toInt", aliases: ["quantity", "stock qty"] },
  { key: "min_stock_level", label: "Min Stock Level", type: "number", transform: "toInt", aliases: ["reorder level", "min stock"] },
  { key: "unit_price", label: "Unit Price", type: "number", transform: "toFloat", aliases: ["price"] },
  { key: "added_by", label: "Added By", type: "string", maxLength: 50 },
  { key: "supplier_name", label: "Supplier", type: "string", maxLength: 150 },
  { key: "received_quantity", label: "Received Quantity", type: "number", transform: "toInt" },
]);

const blood_donors = genericEntity("blood_donors", "Blood Donors", [
  { key: "full_name", label: "Full Name", type: "string", required: true, maxLength: 150 },
  { key: "patient_uhid", label: "Patient UHID", type: "string", maxLength: 30, aliases: ["uhid"] },
  { key: "blood_group", label: "Blood Group", type: "string", required: true, maxLength: 4, aliases: ["blood type"] },
  { key: "phone", label: "Phone", type: "string", maxLength: 20, transform: "trimString" },
  { key: "last_donation_date", label: "Last Donation Date", type: "date", transform: "parseDate" },
  { key: "total_donations", label: "Total Donations", type: "number", transform: "toInt" },
  { key: "created_by", label: "Created By", type: "string", maxLength: 50 },
]);

const beds = genericEntity("beds", "Beds", [
  { key: "ward_id", label: "Ward", type: "string", required: true, ref: "wards", aliases: ["ward"] },
  { key: "bed_number", label: "Bed Number", type: "string", required: true, maxLength: 20, aliases: ["bed no", "bed"] },
  { key: "status", label: "Status", type: "string", maxLength: 20 },
]);

const doctor_schedules = genericEntity("doctor_schedules", "Doctor Schedules", [
  // `refKind: "business"` (vs. the plain numeric-surrogate `ref` used for
  // ward_id/bed_id/etc. below) means: if this value matches a "users" row
  // created EARLIER IN THIS SAME FILE (registered by its own CSV id column —
  // see registerCrossTierId in importRoutes.js), resolve to that row's real
  // generated user_id; otherwise assume the raw value is already a real,
  // pre-existing user_id (e.g. a doctor onboarded before this import ran) and
  // pass it straight through — never forced to a bare number or nulled out
  // the way an unresolved surrogate ref would be.
  { key: "doctor_user_id", label: "Doctor User ID", type: "string", required: true, maxLength: 50, ref: "users", refKind: "business", aliases: ["doctor id"] },
  { key: "day_of_week", label: "Day of Week", type: "number", required: true, transform: "toInt", aliases: ["day"] },
  { key: "start_time", label: "Start Time", type: "string", required: true, maxLength: 10, aliases: ["start"] },
  { key: "end_time", label: "End Time", type: "string", required: true, maxLength: 10, aliases: ["end"] },
  { key: "slot_minutes", label: "Slot Minutes", type: "number", transform: "toInt", aliases: ["slot"] },
]);

// The CURRENT active table doctor availability actually lives in — see
// schema.js's own comment on doctor_schedules ("Superseded by
// doctor_calendar_availability... the app no longer reads or writes it").
// Both are importable; a real export may use either one.
const doctor_calendar_availability = genericEntity("doctor_calendar_availability", "Doctor Calendar Availability", [
  { key: "doctor_user_id", label: "Doctor User ID", type: "string", required: true, maxLength: 50, ref: "users", refKind: "business", aliases: ["doctor id"] },
  { key: "avail_date", label: "Available Date", type: "date", required: true, transform: "parseDate", aliases: ["date", "availability date"] },
  { key: "start_time", label: "Start Time", type: "string", required: true, maxLength: 10, aliases: ["start"] },
  { key: "end_time", label: "End Time", type: "string", required: true, maxLength: 10, aliases: ["end"] },
  { key: "slot_minutes", label: "Slot Minutes", type: "number", transform: "toInt", aliases: ["slot"] },
]);

const nurse_shift_roster = genericEntity("nurse_shift_roster", "Nurse Shift Roster", [
  { key: "nurse_user_id", label: "Nurse User ID", type: "string", required: true, maxLength: 50, ref: "users", refKind: "business", aliases: ["nurse id"] },
  { key: "ward_id", label: "Ward", type: "string", required: true, ref: "wards", aliases: ["ward"] },
  { key: "shift", label: "Shift", type: "string", required: true, maxLength: 20, aliases: ["shift type"] },
  // A real export tracked shifts by specific calendar date (shift_date)
  // rather than a recurring weekday — day_of_week can be derived perfectly
  // from it, so it's tried automatically when no column maps to day_of_week
  // directly (see deriveFrom handling in commitEntityRows,
  // server/importRoutes.js). shift_date itself is `virtual: true` — it only
  // exists to receive that column mapping and feed the derivation; the real
  // nurse_shift_roster table has no such column, so it's never part of the
  // actual INSERT (see commitGenericRow).
  { key: "day_of_week", label: "Day of Week", type: "number", required: true, transform: "toInt", aliases: ["day"], deriveFrom: { siblingField: "shift_date", transform: "dateToDayOfWeek" } },
  { key: "shift_date", label: "Shift Date", type: "date", virtual: true, transform: "parseDate", aliases: ["shift date"] },
]);

const doctor_nurse_teams = genericEntity("doctor_nurse_teams", "Doctor-Nurse Teams", [
  { key: "doctor_user_id", label: "Doctor User ID", type: "string", required: true, maxLength: 50, ref: "users", refKind: "business", aliases: ["doctor id"] },
  { key: "nurse_user_id", label: "Nurse User ID", type: "string", required: true, maxLength: 50, ref: "users", refKind: "business", aliases: ["nurse id"] },
]);

const opd_visits = genericEntity("opd_visits", "OPD Visits", [
  { key: "token_number", label: "Token Number", type: "number", required: true, transform: "toInt", aliases: ["token"] },
  { key: "patient_uhid", label: "Patient UHID", type: "string", required: true, maxLength: 30, aliases: ["uhid", "patient id"] },
  { key: "doctor_user_id", label: "Doctor User ID", type: "string", required: true, maxLength: 50, ref: "users", refKind: "business" },
  { key: "visit_date", label: "Visit Date", type: "date", required: true, transform: "parseDate" },
  { key: "slot_time", label: "Slot Time", type: "string", maxLength: 10 },
  { key: "source", label: "Source", type: "string", required: true, maxLength: 20 },
  { key: "status", label: "Status", type: "string", maxLength: 20 },
  { key: "created_by", label: "Created By", type: "string", maxLength: 50 },
]);

const blood_inventory_units = genericEntity("blood_inventory_units", "Blood Inventory Units", [
  { key: "unit_code", label: "Unit Code", type: "string", required: true, maxLength: 30, aliases: ["unit code", "unit no"] },
  { key: "blood_group", label: "Blood Group", type: "string", required: true, maxLength: 4 },
  { key: "component", label: "Component", type: "string", required: true, maxLength: 30 },
  { key: "donor_id", label: "Donor", type: "string", ref: "blood_donors", aliases: ["donor id"] },
  { key: "collected_at", label: "Collected At", type: "date", required: true, transform: "parseDate", aliases: ["collected date"] },
  { key: "expiry_at", label: "Expiry At", type: "date", required: true, transform: "parseDate", aliases: ["expiry date"] },
  { key: "status", label: "Status", type: "string", maxLength: 20 },
  { key: "issued_to_request_id", label: "Issued To Request", type: "string", ref: "blood_requests" },
]);

const consultations = genericEntity("consultations", "Consultations", [
  { key: "opd_visit_id", label: "OPD Visit", type: "string", required: true, ref: "opd_visits", aliases: ["visit id"] },
  // Real gap found 2026-09-03: a genuine export had no patient_uhid column
  // on its consultation rows at all — only opd_visit_id, which already
  // carries the patient (a consultation only ever happens as part of one
  // real OPD visit). Derived via a cross-table lookup: resolve opd_visit_id
  // to the real opd_visits row this batch (or an earlier tier of this same
  // batch) already committed, then read ITS patient_uhid — see the
  // deriveFrom pass in commitEntityRows, server/importRoutes.js.
  { key: "patient_uhid", label: "Patient UHID", type: "string", required: true, maxLength: 30, deriveFrom: { siblingField: "opd_visit_id", lookupTable: "opd_visits", lookupField: "patient_uhid" } },
  { key: "doctor_user_id", label: "Doctor User ID", type: "string", required: true, maxLength: 50, ref: "users", refKind: "business", aliases: ["doctor id"] },
  { key: "symptoms", label: "Symptoms", type: "string" },
  { key: "notes", label: "Notes", type: "string" },
  { key: "decision", label: "Decision", type: "string", required: true, maxLength: 60 },
  { key: "diagnosis", label: "Diagnosis", type: "string", maxLength: 100 },
]);

const ipd_admissions = genericEntity("ipd_admissions", "IPD Admissions", [
  // Same cross-table-lookup gap as consultations.patient_uhid above — an
  // admission created from an OPD visit often doesn't repeat the patient
  // separately, since its opd_visit_id already implies who it's for.
  { key: "patient_uhid", label: "Patient UHID", type: "string", required: true, maxLength: 30, deriveFrom: { siblingField: "opd_visit_id", lookupTable: "opd_visits", lookupField: "patient_uhid" } },
  { key: "admitting_doctor_user_id", label: "Admitting Doctor", type: "string", maxLength: 50, ref: "users", refKind: "business" },
  { key: "ward_id", label: "Ward", type: "string", ref: "wards" },
  { key: "bed_id", label: "Bed", type: "string", ref: "beds" },
  { key: "consent_obtained", label: "Consent Obtained", type: "boolean", transform: "normalizeBoolean" },
  { key: "id_proof_note", label: "ID Proof Note", type: "string", maxLength: 150 },
  // "admission reason" is a real, common export column, but the real
  // ipd_admissions table has no dedicated column for it — admission_notes
  // (free text) is the closest genuine home for it, so it's included as an
  // alias here rather than left to become an orphaned custom field.
  { key: "admission_notes", label: "Admission Notes", type: "string", aliases: ["admission reason", "reason for admission"] },
  { key: "status", label: "Status", type: "string", maxLength: 20 },
  { key: "opd_visit_id", label: "OPD Visit", type: "string", ref: "opd_visits" },
  { key: "assigned_nurse_id", label: "Assigned Nurse", type: "string", maxLength: 50, ref: "users", refKind: "business" },
  // Real gaps found 2026-09-03: all three are genuine columns on the real
  // ipd_admissions table (server/schema.js) that were never added here.
  // No `transform` on admitted_at/discharged_at deliberately — a real
  // export's value ("2026-08-06 11:00:00") is a full datetime, and
  // importTransforms.js's parseDate only recognizes a bare date (it would
  // return null and silently blank a populated column); MySQL accepts that
  // exact "YYYY-MM-DD HH:MM:SS" string natively for a TIMESTAMP column, so
  // passing it through unchanged is both simpler and more correct.
  { key: "admitted_at", label: "Admitted At", type: "string", aliases: ["admission date", "admitted date", "admission_date"] },
  { key: "discharged_at", label: "Discharged At", type: "string", aliases: ["discharge date", "discharged date", "discharge_date"] },
  { key: "discharged_by", label: "Discharged By", type: "string", maxLength: 50, ref: "users", refKind: "business" },
  { key: "created_by", label: "Created By", type: "string", maxLength: 50 },
]);

const lab_orders = genericEntity("lab_orders", "Lab Orders", [
  { key: "opd_visit_id", label: "OPD Visit", type: "string", ref: "opd_visits" },
  { key: "ipd_admission_id", label: "IPD Admission", type: "string", ref: "ipd_admissions" },
  // Same cross-table-lookup gap as consultations.patient_uhid — tried via
  // whichever of opd_visit_id/ipd_admission_id this row actually has,
  // in that order (an array of fallback attempts — see the deriveFrom pass
  // in commitEntityRows).
  {
    key: "patient_uhid",
    label: "Patient UHID",
    type: "string",
    required: true,
    maxLength: 30,
    deriveFrom: [
      { siblingField: "opd_visit_id", lookupTable: "opd_visits", lookupField: "patient_uhid" },
      { siblingField: "ipd_admission_id", lookupTable: "ipd_admissions", lookupField: "patient_uhid" },
    ],
  },
  { key: "test_id", label: "Test", type: "string", required: true, ref: "test_catalog" },
  { key: "doctor_user_id", label: "Doctor User ID", type: "string", required: true, maxLength: 50, ref: "users", refKind: "business" },
  { key: "status", label: "Status", type: "string", maxLength: 20 },
  { key: "priority", label: "Priority", type: "string", maxLength: 10 },
  { key: "assigned_to", label: "Assigned To", type: "string", maxLength: 50 },
  // Real gap found 2026-09-03: a genuine column on lab_orders, never added.
  { key: "verified_by", label: "Verified By", type: "string", maxLength: 50, ref: "users", refKind: "business" },
]);

const blood_patient_donations = genericEntity("blood_patient_donations", "Blood Patient Donations", [
  { key: "patient_uhid", label: "Patient UHID", type: "string", required: true, maxLength: 30 },
  { key: "donor_name", label: "Donor Name", type: "string", required: true, maxLength: 150 },
  { key: "blood_group", label: "Blood Group", type: "string", required: true, maxLength: 4 },
  { key: "component", label: "Component", type: "string", required: true, maxLength: 30 },
  { key: "units", label: "Units", type: "number", transform: "toInt" },
  // Real gaps found 2026-09-03: all six are genuine columns on the real
  // blood_patient_donations table (the pre-donation health screen), never
  // added here. Note: the real DB has no column at all for donation volume
  // (ml) or a separate donation date — those genuinely have nowhere to go
  // and correctly become custom fields, not a naming gap to fix.
  { key: "weight", label: "Weight (kg)", type: "number", transform: "toFloat" },
  { key: "hb", label: "Hemoglobin (Hb)", type: "number", transform: "toFloat", aliases: ["hemoglobin"] },
  { key: "systolic", label: "Systolic BP", type: "number", transform: "toInt", aliases: ["bp systolic", "systolic bp"] },
  { key: "diastolic", label: "Diastolic BP", type: "number", transform: "toInt", aliases: ["bp diastolic", "diastolic bp"] },
  { key: "pulse", label: "Pulse", type: "number", transform: "toInt" },
  { key: "temperature", label: "Temperature", type: "number", transform: "toFloat" },
  { key: "eligible", label: "Eligible", type: "boolean", required: true, transform: "normalizeBoolean", aliases: ["eligibility status", "eligibility_status"] },
  { key: "consent", label: "Consent", type: "boolean", transform: "normalizeBoolean" },
  { key: "recorded_by", label: "Recorded By", type: "string", maxLength: 50 },
]);

const blood_requests = genericEntity("blood_requests", "Blood Requests", [
  { key: "request_code", label: "Request Code", type: "string", required: true, maxLength: 30, aliases: ["request code", "request id"] },
  { key: "patient_uhid", label: "Patient UHID", type: "string", maxLength: 30 },
  { key: "patient_name", label: "Patient Name", type: "string", required: true, maxLength: 150 },
  { key: "age", label: "Age", type: "number", transform: "toInt" },
  { key: "sex", label: "Sex", type: "string", maxLength: 4 },
  { key: "blood_group", label: "Blood Group", type: "string", required: true, maxLength: 4 },
  { key: "component", label: "Component", type: "string", required: true, maxLength: 30 },
  { key: "units_required", label: "Units Required", type: "number", transform: "toInt" },
  { key: "priority", label: "Priority", type: "string", maxLength: 20 },
  // Real gap found 2026-09-03: a genuine column on blood_requests, never
  // added. Note: the real DB column is assigned_staff_id — a file column
  // literally named "assigned_unit_id" (a different concept — which BLOOD
  // unit was issued, not which STAFF member is handling the request) has
  // nowhere real to go and correctly becomes a custom field.
  { key: "assigned_staff_id", label: "Assigned Staff", type: "string", maxLength: 50, ref: "users", refKind: "business", aliases: ["assigned staff", "assigned to"] },
  { key: "created_by", label: "Created By", type: "string", maxLength: 50 },
]);

// Backs both "prescriptions" and "pharmacy_dispenses" table_name values — both
// are really just rows in medisys_pharmacy.pharmacy_orders at different
// stages (created vs. already dispensed), and that table has no separate
// "prescription" vs "dispense" record, so there's nowhere else for either to go.
const pharmacy_orders = genericEntity("medisys_pharmacy.pharmacy_orders", "Prescriptions / Pharmacy Orders", [
  { key: "opd_visit_id", label: "OPD Visit", type: "string", ref: "opd_visits" },
  { key: "ipd_admission_id", label: "IPD Admission", type: "string", ref: "ipd_admissions" },
  // Same cross-table-lookup gap as lab_orders.patient_uhid above.
  {
    key: "patient_uhid",
    label: "Patient UHID",
    type: "string",
    required: true,
    maxLength: 30,
    deriveFrom: [
      { siblingField: "opd_visit_id", lookupTable: "opd_visits", lookupField: "patient_uhid" },
      { siblingField: "ipd_admission_id", lookupTable: "ipd_admissions", lookupField: "patient_uhid" },
    ],
  },
  { key: "doctor_user_id", label: "Doctor User ID", type: "string", required: true, maxLength: 50, ref: "users", refKind: "business" },
  { key: "medicine_name", label: "Medicine Name", type: "string", required: true, maxLength: 150 },
  { key: "dosage", label: "Dosage", type: "string", required: true, maxLength: 100 },
  { key: "duration", label: "Duration", type: "string", required: true, maxLength: 50 },
  { key: "urgency", label: "Urgency", type: "string", maxLength: 10 },
  { key: "status", label: "Status", type: "string", maxLength: 20 },
  { key: "dispensed_by", label: "Dispensed By", type: "string", maxLength: 50 },
  { key: "amount", label: "Amount", type: "number", transform: "toFloat" },
  { key: "payment_mode", label: "Payment Mode", type: "string", maxLength: 20 },
]);

const ipd_notes = genericEntity("ipd_notes", "IPD Notes", [
  { key: "ipd_admission_id", label: "IPD Admission", type: "string", required: true, ref: "ipd_admissions" },
  { key: "note_type", label: "Note Type", type: "string", required: true, maxLength: 20 },
  // Real wrong-mapping bug found 2026-09-03: "note_text" fuzzy-matched
  // "note_type" instead (both contain "note", and message had no alias at
  // all to compete with it), silently routing real note content into a
  // 20-char category column. Explicit alias makes "note_text" win outright.
  { key: "message", label: "Message", type: "string", required: true, aliases: ["note text", "note_text", "note"] },
  { key: "flagged_by", label: "Flagged By", type: "string", maxLength: 50 },
]);

const doctor_orders = genericEntity("doctor_orders", "Doctor Orders", [
  { key: "ipd_admission_id", label: "IPD Admission", type: "string", required: true, ref: "ipd_admissions" },
  { key: "order_type", label: "Order Type", type: "string", required: true, maxLength: 20 },
  { key: "description", label: "Description", type: "string", required: true },
  { key: "ordered_by", label: "Ordered By", type: "string", maxLength: 50 },
]);

const medication_administration = genericEntity("medication_administration", "Medication Administration", [
  { key: "ipd_admission_id", label: "IPD Admission", type: "string", required: true, ref: "ipd_admissions" },
  { key: "doctor_order_id", label: "Doctor Order", type: "string", ref: "doctor_orders" },
  { key: "medicine_name", label: "Medicine Name", type: "string", required: true, maxLength: 150 },
  { key: "dose", label: "Dose", type: "string", maxLength: 50 },
  { key: "administered_by", label: "Administered By", type: "string", maxLength: 50 },
  { key: "notes", label: "Notes", type: "string", maxLength: 255 },
]);

const lab_order_images = genericEntity("lab_order_images", "Lab Order Images", [
  { key: "lab_order_id", label: "Lab Order", type: "string", required: true, ref: "lab_orders" },
  { key: "file_path", label: "File Path", type: "string", required: true, maxLength: 255 },
  { key: "file_name", label: "File Name", type: "string", required: true, maxLength: 255 },
  { key: "uploaded_by", label: "Uploaded By", type: "string", maxLength: 50 },
]);

const bills = genericEntity("bills", "Bills", [
  { key: "bill_no", label: "Bill No.", type: "string", required: true, maxLength: 30, aliases: ["bill number", "invoice no"] },
  { key: "patient_uhid", label: "Patient UHID", type: "string", maxLength: 30 },
  { key: "patient_name", label: "Patient Name", type: "string", required: true, maxLength: 150 },
  { key: "department", label: "Department", type: "string", required: true, maxLength: 30 },
  { key: "doctor_user_id", label: "Doctor User ID", type: "string", maxLength: 50, ref: "users", refKind: "business" },
  { key: "bill_date", label: "Bill Date", type: "date", required: true, transform: "parseDate" },
  { key: "subtotal", label: "Subtotal", type: "number", transform: "toFloat" },
  { key: "discount_pct", label: "Discount %", type: "number", transform: "toFloat" },
  { key: "tax_pct", label: "Tax %", type: "number", transform: "toFloat" },
  { key: "total_amount", label: "Total Amount", type: "number", transform: "toFloat" },
  { key: "paid_amount", label: "Paid Amount", type: "number", transform: "toFloat" },
  { key: "status", label: "Status", type: "string", maxLength: 20 },
  // Real gap found 2026-09-03: a genuine column on bills, never added.
  { key: "claim_status", label: "Claim Status", type: "string", maxLength: 20, aliases: ["claim status"] },
  { key: "created_by", label: "Created By", type: "string", maxLength: 50 },
]);

const blood_billing = genericEntity("blood_billing", "Blood Billing", [
  { key: "request_id", label: "Blood Request", type: "string", required: true, ref: "blood_requests" },
  { key: "patient_uhid", label: "Patient UHID", type: "string", maxLength: 30 },
  { key: "patient_name", label: "Patient Name", type: "string", required: true, maxLength: 150 },
  { key: "component", label: "Component", type: "string", required: true, maxLength: 30 },
  { key: "units", label: "Units", type: "number", required: true, transform: "toInt" },
  { key: "amount", label: "Amount", type: "number", transform: "toFloat" },
  { key: "status", label: "Status", type: "string", maxLength: 20 },
  { key: "payment_type", label: "Payment Type", type: "string", maxLength: 30 },
  { key: "created_by", label: "Created By", type: "string", maxLength: 50 },
]);

const bill_items = genericEntity("bill_items", "Bill Items", [
  { key: "bill_id", label: "Bill", type: "string", required: true, ref: "bills" },
  { key: "description", label: "Description", type: "string", required: true, maxLength: 200 },
  { key: "department", label: "Department", type: "string", maxLength: 30 },
  { key: "qty", label: "Qty", type: "number", transform: "toFloat" },
  { key: "rate", label: "Rate", type: "number", transform: "toFloat" },
  { key: "amount", label: "Amount", type: "number", transform: "toFloat" },
]);

const bill_payments = genericEntity("bill_payments", "Bill Payments", [
  { key: "bill_id", label: "Bill", type: "string", required: true, ref: "bills" },
  { key: "amount", label: "Amount", type: "number", required: true, transform: "toFloat" },
  { key: "mode", label: "Mode", type: "string", required: true, maxLength: 30, aliases: ["payment mode", "payment_mode"] },
  { key: "reference", label: "Reference", type: "string", maxLength: 50 },
  { key: "created_by", label: "Created By", type: "string", maxLength: 50 },
]);

// Mirrors reconcilePatientCharges() in server.js exactly — those are the only
// four source_type values the real app ever writes to patient_charges, each
// pointing at a different table's surrogate id. Used both to constrain
// source_type to a real Ajv `enum` (an unrecognized value fails staging
// validation with a clear per-row error instead of writing a wrong/unjoinable
// id — see getAjvValidator in importRoutes.js) and to pick WHICH entity's
// cross-tier id map source_id resolves against (see the `dynamicRef` field
// below and commitGenericRow's handling of it).
const PATIENT_CHARGE_SOURCE_TYPES = {
  registration: "patients",
  opd_visit: "opd_visits",
  lab_order: "lab_orders",
  ipd_admission: "ipd_admissions",
};

const patient_charges = genericEntity("patient_charges", "Patient Charges", [
  { key: "patient_uhid", label: "Patient UHID", type: "string", required: true, maxLength: 30 },
  { key: "source_type", label: "Source Type", type: "string", required: true, maxLength: 20, enum: Object.keys(PATIENT_CHARGE_SOURCE_TYPES) },
  // Which table this points at depends on the SIBLING source_type field's
  // value on the same row (e.g. 'opd_visit' -> the opd_visits id map,
  // 'registration' -> the patients id map) — unlike a plain `ref`, which
  // always resolves against one fixed entity. commitGenericRow reads
  // dynamicRef.siblingField off the row's OWN values and looks up
  // dynamicRef.map to find which cross-tier id map to resolve source_id
  // against, then resolves it exactly like any other surrogate ref (CSV-local
  // id -> real id if this batch created that row, else assume it's already a
  // real id for a pre-existing row).
  { key: "source_id", label: "Source ID", type: "string", required: true, dynamicRef: { siblingField: "source_type", map: PATIENT_CHARGE_SOURCE_TYPES } },
  { key: "description", label: "Description", type: "string", required: true, maxLength: 200 },
  { key: "department", label: "Department", type: "string", required: true, maxLength: 30 },
  // "amount" is a genuine, common export header for this — real gap found
  // 2026-09-03. Not added as an alias on bill_items.rate/amount, which are
  // two DIFFERENT real columns on that table — no ambiguity there to fix.
  { key: "rate", label: "Rate", type: "number", transform: "toFloat", aliases: ["amount"] },
  { key: "bill_id", label: "Bill", type: "string", ref: "bills" },
]);

const vitals = genericEntity("vitals", "Vitals", [
  // Same cross-table-lookup gap as lab_orders.patient_uhid above.
  {
    key: "patient_uhid",
    label: "Patient UHID",
    type: "string",
    required: true,
    maxLength: 30,
    deriveFrom: [
      { siblingField: "opd_visit_id", lookupTable: "opd_visits", lookupField: "patient_uhid" },
      { siblingField: "ipd_admission_id", lookupTable: "ipd_admissions", lookupField: "patient_uhid" },
    ],
  },
  { key: "opd_visit_id", label: "OPD Visit", type: "string", ref: "opd_visits" },
  { key: "ipd_admission_id", label: "IPD Admission", type: "string", ref: "ipd_admissions" },
  { key: "bp", label: "BP", type: "string", maxLength: 20 },
  { key: "temperature", label: "Temperature", type: "string", maxLength: 10 },
  { key: "weight", label: "Weight", type: "string", maxLength: 10 },
  { key: "spo2", label: "SpO2", type: "string", maxLength: 10 },
  { key: "recorded_by", label: "Recorded By", type: "string", maxLength: 50 },
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
  departments,
  wards,
  test_catalog,
  billing_tariff,
  pharmacy_stock,
  blood_donors,
  beds,
  doctor_schedules,
  doctor_calendar_availability,
  nurse_shift_roster,
  doctor_nurse_teams,
  opd_visits,
  blood_inventory_units,
  consultations,
  ipd_admissions,
  lab_orders,
  blood_patient_donations,
  blood_requests,
  pharmacy_orders,
  ipd_notes,
  doctor_orders,
  medication_administration,
  lab_order_images,
  bills,
  blood_billing,
  bill_items,
  bill_payments,
  patient_charges,
  vitals,
};

function getEntity(name) {
  return ENTITIES[name] || null;
}

function listEntities() {
  return Object.keys(ENTITIES);
}

// ---------- Multi-entity single-file import metadata ----------
//
// Maps an exact (case-insensitive) table_name cell value to the registry
// entity key it commits as. "users" is deliberately NOT a key here — a
// table_name=users row still needs its own role/type column read to know
// WHICH staff entity (doctor, nurse, ...) it is; see splitMultiEntityRows in
// importRoutes.js, which special-cases "users" through the existing
// roleClassifier.js rather than through this map.
const MULTI_ENTITY_TABLE_NAME_MAP = {
  hospitals: "hospitals",
  departments: "departments",
  patients: "patients",
  wards: "wards",
  test_catalog: "test_catalog",
  billing_tariff: "billing_tariff",
  medisys_pharmacy: "pharmacy_stock",
  pharmacy_stock: "pharmacy_stock",
  blood_donors: "blood_donors",
  beds: "beds",
  doctor_schedules: "doctor_schedules",
  doctor_calendar_availability: "doctor_calendar_availability",
  nurse_shift_roster: "nurse_shift_roster",
  doctor_nurse_teams: "doctor_nurse_teams",
  opd_visits: "opd_visits",
  blood_inventory_units: "blood_inventory_units",
  consultations: "consultations",
  ipd_admissions: "ipd_admissions",
  lab_orders: "lab_orders",
  blood_patient_donations: "blood_patient_donations",
  blood_requests: "blood_requests",
  prescriptions: "pharmacy_orders",
  pharmacy_orders: "pharmacy_orders",
  pharmacy_dispenses: "pharmacy_orders",
  ipd_notes: "ipd_notes",
  doctor_orders: "doctor_orders",
  medication_administration: "medication_administration",
  lab_order_images: "lab_order_images",
  bills: "bills",
  blood_billing: "blood_billing",
  bill_items: "bill_items",
  bill_payments: "bill_payments",
  patient_charges: "patient_charges",
  vitals: "vitals",
};

// Commit order. No real FK constraints exist in server/schema.js (verified —
// nothing in this app relies on the database to enforce or report
// referential order), so this is hand-authored from the actual column
// relationships above rather than read from information_schema. "users" here
// stands for whichever of the 7 staffRole entities a row's own role column
// resolves to — see MULTI_ENTITY_TIERS usage in importRoutes.js, which
// expands it in place.
const MULTI_ENTITY_TIERS = [
  ["hospitals", "departments"],
  ["users", "patients"],
  ["wards", "test_catalog", "billing_tariff", "pharmacy_stock", "blood_donors"],
  ["beds", "doctor_schedules", "doctor_calendar_availability", "nurse_shift_roster", "doctor_nurse_teams", "opd_visits", "blood_inventory_units"],
  ["consultations", "ipd_admissions", "lab_orders", "blood_patient_donations", "blood_requests"],
  ["pharmacy_orders", "ipd_notes", "doctor_orders", "medication_administration", "lab_order_images", "bills", "blood_billing"],
  ["bill_items", "bill_payments", "patient_charges", "vitals"],
];

// table_name values that are recognized but deliberately NEVER staged as
// their own importable bucket — the app already repopulates this data
// automatically as a side effect of importing something else, so treating a
// row of it as "unclassified" (blocking the whole batch on a manual decision)
// or as its own real bucket (risking a duplicate/conflicting row) would both
// be wrong. Real bug found 2026-09-02: user_directory rows in a full-database
// export (401 of them, in one real case) sat in "Unclassified" requiring a
// manual Skip — even though commitPatientRow/commitStaffRow already insert a
// user_directory row for every patient/staff row THIS SAME FILE imports.
// These rows are still never silently lost — see the "auto-skipped" count
// surfaced in the upload response (server/importRoutes.js) — just not staged
// as something needing a decision, since there genuinely isn't one to make.
const MULTI_ENTITY_AUTO_SKIP_TABLES = new Set(["user_directory"]);

module.exports = {
  ENTITIES,
  getEntity,
  listEntities,
  MULTI_ENTITY_TABLE_NAME_MAP,
  MULTI_ENTITY_TIERS,
  MULTI_ENTITY_AUTO_SKIP_TABLES,
  PATIENT_CHARGE_SOURCE_TYPES,
};
