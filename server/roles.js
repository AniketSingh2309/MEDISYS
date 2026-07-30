const ROLE_PREFIXES = {
  hospital_admin: "AD",
  doctor: "DR",
  nurse: "NR",
  pharmacist: "PH",
  pathology_staff: "PT",
  receptionist: "OPD",
  billing_staff: "BS",
  blood_bank_staff: "BB",
};

const ROLE_LABELS = {
  hospital_admin: "Hospital Admin",
  doctor: "Doctor",
  nurse: "Nurse",
  pharmacist: "Pharmacist",
  pathology_staff: "Pathologist",
  receptionist: "OPD",
  billing_staff: "Billing Staff",
  blood_bank_staff: "Blood Bank Staff",
  patient: "Patient",
};

const STAFF_ROLES = [
  "doctor",
  "nurse",
  "pharmacist",
  "pathology_staff",
  "receptionist",
  "billing_staff",
  "blood_bank_staff",
];

// The Pathologist card covers three designations in one form; the User ID prefix
// is chosen from the picked designation instead of the flat ROLE_PREFIXES entry.
const DESIGNATION_PREFIXES = {
  Pathologist: "PA",
  "Lab Assistant": "LA",
  Radiologist: "RA",
};

module.exports = { ROLE_PREFIXES, ROLE_LABELS, STAFF_ROLES, DESIGNATION_PREFIXES };
