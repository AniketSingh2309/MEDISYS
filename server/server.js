require("dotenv").config({ quiet: true });
const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const bcrypt = require("bcrypt");
const multer = require("multer");
const pool = require("./db");
const { ensureSchema, seedTestCatalog } = require("./schema");
const { buildShortCode, generateStaffUserId, generateTempPassword, generateUhid } = require("./credentials");
const { ROLE_PREFIXES, ROLE_LABELS, STAFF_ROLES, DESIGNATION_PREFIXES } = require("./roles");
const { computeAvailableSlots } = require("./slots");
const { assignNurseForAdmission } = require("./nurseAssignment");

const UPLOADS_DIR = path.join(__dirname, "uploads", "lab-results");
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const labResultUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
      const safeExt = path.extname(file.originalname).slice(0, 10);
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
});

const LAB_IMAGES_DIR = path.join(__dirname, "uploads", "lab-images");
fs.mkdirSync(LAB_IMAGES_DIR, { recursive: true });

const labImageUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, LAB_IMAGES_DIR),
    filename: (req, file, cb) => {
      const safeExt = path.extname(file.originalname).slice(0, 10);
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /^image\//.test(file.mimetype)),
});

// Server-local "today" as YYYY-MM-DD using local wall-clock fields (NOT
// toISOString/UTC — that rolls back a day for ~5.5 hours overnight in IST and any
// other UTC+ timezone). Also safe for parsing a Y-M-D string into a Date anchored at
// UTC noon, so calendar-date arithmetic (adding days, reading the weekday) never
// drifts across a local/UTC boundary either.
function todayLocalDateStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
function parseDateStrUTC(dateStr) {
  return new Date(`${dateStr}T12:00:00Z`);
}

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 8 * 60 * 60 * 1000,
    },
  })
);
// Guard against express.static serving repo-root paths it shouldn't (server source/secrets,
// SQL dumps with password hashes, and uploaded patient files) — only the frontend
// folders (html/css/js/images at the repo root) are meant to be publicly reachable.
app.use(["/server", "/database"], (req, res) => res.status(404).end());
app.use(express.static(path.join(__dirname, "..")));

function requireSuperadmin(req, res, next) {
  if (req.session.user && req.session.user.role === "superadmin") {
    return next();
  }
  return res.status(401).json({ success: false, message: "Superadmin session required." });
}

function requireHospitalAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === "hospital_admin") {
    return next();
  }
  return res.status(401).json({ success: false, message: "Hospital admin session required." });
}

function requireTenantUser(req, res, next) {
  if (req.session.user && req.session.user.hospitalId) {
    return next();
  }
  return res.status(401).json({ success: false, message: "Session required." });
}

function requireReceptionistOrAdmin(req, res, next) {
  const role = req.session.user && req.session.user.role;
  if (role === "receptionist" || role === "hospital_admin") {
    return next();
  }
  return res.status(401).json({ success: false, message: "OPD/front-desk or admin session required." });
}

function requireRole(...roles) {
  return (req, res, next) => {
    const role = req.session.user && req.session.user.role;
    if (roles.includes(role)) {
      return next();
    }
    return res.status(401).json({ success: false, message: "Insufficient permissions for this action." });
  };
}

app.post("/api/login", async (req, res) => {
  const { userId, password } = req.body || {};

  if (!userId || !password) {
    return res.status(400).json({ success: false, message: "User ID and password are required." });
  }

  try {
    const [directoryRows] = await pool.query(
      "SELECT hospital_id, account_type FROM user_directory WHERE user_id = ? LIMIT 1",
      [userId]
    );

    if (directoryRows.length > 0) {
      const { hospital_id: hospitalId, account_type: accountType } = directoryRows[0];

      const [hospitalRows] = await pool.query("SELECT name FROM hospitals WHERE id = ? LIMIT 1", [
        hospitalId,
      ]);

      if (hospitalRows.length === 0) {
        return res.status(401).json({ success: false, message: "Invalid User ID or password." });
      }

      if (accountType === "patient") {
        const [patientRows] = await pool.query(
          "SELECT uhid, password_hash, full_name FROM patients WHERE uhid = ? AND hospital_id = ? LIMIT 1",
          [userId, hospitalId]
        );

        if (patientRows.length === 0) {
          return res.status(401).json({ success: false, message: "Invalid User ID or password." });
        }

        const patient = patientRows[0];
        const isMatch = patient.password_hash && (await bcrypt.compare(password, patient.password_hash));

        if (!isMatch) {
          return res.status(401).json({ success: false, message: "Invalid User ID or password." });
        }

        req.session.user = {
          userId: patient.uhid,
          fullName: patient.full_name,
          role: "patient",
          hospitalId,
          hospitalName: hospitalRows[0].name,
        };

        return res.json({ success: true, user: req.session.user });
      }

      const [userRows] = await pool.query(
        "SELECT user_id, password_hash, full_name, role, details FROM users WHERE user_id = ? AND hospital_id = ? LIMIT 1",
        [userId, hospitalId]
      );

      if (userRows.length === 0) {
        return res.status(401).json({ success: false, message: "Invalid User ID or password." });
      }

      const tenantUser = userRows[0];
      const isMatch = await bcrypt.compare(password, tenantUser.password_hash);

      if (!isMatch) {
        return res.status(401).json({ success: false, message: "Invalid User ID or password." });
      }

      req.session.user = {
        userId: tenantUser.user_id,
        fullName: tenantUser.full_name,
        role: tenantUser.role,
        details: tenantUser.details || {},
        hospitalId,
        hospitalName: hospitalRows[0].name,
      };

      return res.json({ success: true, user: req.session.user });
    }

    const [rows] = await pool.query(
      "SELECT user_id, password_hash, full_name, role FROM users WHERE user_id = ? AND role = 'superadmin' LIMIT 1",
      [userId]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: "Invalid User ID or password." });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid User ID or password." });
    }

    req.session.user = { userId: user.user_id, fullName: user.full_name, role: user.role };

    return res.json({
      success: true,
      user: { userId: user.user_id, fullName: user.full_name, role: user.role },
    });
  } catch (err) {
    console.error("Login error:", err.message);
    return res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

app.get("/api/session", (req, res) => {
  res.json({ user: req.session.user || null });
});

app.get("/api/hospitals", requireSuperadmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, city, state, bed_count, status, admin_name, admin_email, short_code, admin_user_id, created_at
       FROM hospitals ORDER BY created_at DESC`
    );
    res.json({ success: true, hospitals: rows });
  } catch (err) {
    console.error("List hospitals error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

app.get("/api/hospitals/:id", requireSuperadmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, license_number, pan, hfr_id, address, city, state, pincode,
              bed_count, opd_volume, admin_name, admin_email, modules, dpdp_consent,
              status, short_code, admin_user_id, created_at
       FROM hospitals WHERE id = ? LIMIT 1`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Hospital not found." });
    }

    res.json({ success: true, hospital: rows[0] });
  } catch (err) {
    console.error("Get hospital error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

app.get("/api/hospital/me", requireHospitalAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT name, status, modules, nurse_assignment_mode FROM hospitals WHERE id = ? LIMIT 1",
      [req.session.user.hospitalId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Hospital not found." });
    }

    res.json({ success: true, hospital: rows[0] });
  } catch (err) {
    console.error("Get hospital/me error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

app.patch("/api/hospital/settings", requireHospitalAdmin, async (req, res) => {
  const { nurseAssignmentMode } = req.body || {};
  if (!["ward_based", "doctor_team"].includes(nurseAssignmentMode)) {
    return res.status(400).json({ success: false, message: "A valid nurse assignment mode is required." });
  }
  try {
    await pool.query("UPDATE hospitals SET nurse_assignment_mode = ? WHERE id = ?", [
      nurseAssignmentMode,
      req.session.user.hospitalId,
    ]);
    res.json({ success: true, nurseAssignmentMode });
  } catch (err) {
    console.error("Update hospital settings error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

app.get("/api/me", requireTenantUser, (req, res) => {
  const { fullName, role, hospitalName, details } = req.session.user;
  res.json({
    success: true,
    profile: { fullName, role, roleLabel: ROLE_LABELS[role] || role, hospitalName, details: details || {} },
  });
});

app.get("/api/hospital/staff", requireHospitalAdmin, async (req, res) => {
  try {
    const { hospitalId } = req.session.user;
    const [rows] = await pool.query(
      `SELECT u.id, u.user_id, u.full_name, u.email, u.phone, u.role, u.details, u.created_at,
              d.name AS department_name
       FROM users u
       LEFT JOIN departments d ON d.id = u.department_id
       WHERE u.hospital_id = ? AND u.role != 'hospital_admin'
       ORDER BY u.role, u.full_name`,
      [hospitalId]
    );
    res.json({ success: true, staff: rows });
  } catch (err) {
    console.error("List staff error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

app.post("/api/hospital/staff", requireHospitalAdmin, async (req, res) => {
  const {
    role,
    fullName,
    email,
    phone,
    details,
    departmentId,
    userId: customUserId,
    password: customPassword,
  } = req.body || {};

  if (!STAFF_ROLES.includes(role)) {
    return res.status(400).json({ success: false, message: "A valid staff role is required." });
  }

  if (!fullName || !email) {
    return res.status(400).json({ success: false, message: "Full name and email are required." });
  }

  if (customUserId && !/^[A-Za-z0-9_-]+$/.test(customUserId)) {
    return res.status(400).json({
      success: false,
      message: "User ID can only contain letters, numbers, hyphens, and underscores.",
    });
  }

  if (customPassword && customPassword.length < 6) {
    return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
  }

  try {
    if (customUserId) {
      const [taken] = await pool.query("SELECT user_id FROM user_directory WHERE user_id = ?", [
        customUserId,
      ]);
      if (taken.length > 0) {
        return res.status(409).json({
          success: false,
          message: `User ID "${customUserId}" is already in use. Please choose a different one.`,
        });
      }
    }

    const { hospitalId } = req.session.user;
    const [hospitalRows] = await pool.query("SELECT short_code FROM hospitals WHERE id = ? LIMIT 1", [
      hospitalId,
    ]);
    const shortCode = hospitalRows[0]?.short_code || "HOSP";

    const prefix =
      role === "pathology_staff"
        ? DESIGNATION_PREFIXES[details?.designation] || ROLE_PREFIXES.pathology_staff
        : ROLE_PREFIXES[role];
    const userId = customUserId || generateStaffUserId(prefix, shortCode);
    const password = customPassword || generateTempPassword();
    const passwordHash = await bcrypt.hash(password, 12);

    await pool.query(
      `INSERT INTO users (hospital_id, user_id, password_hash, full_name, role, email, phone, details, department_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        hospitalId,
        userId,
        passwordHash,
        fullName,
        role,
        email,
        phone || null,
        JSON.stringify(details || {}),
        role === "doctor" ? departmentId || null : null,
      ]
    );

    await pool.query("INSERT INTO user_directory (user_id, hospital_id) VALUES (?, ?)", [
      userId,
      hospitalId,
    ]);

    res.json({
      success: true,
      staff: { userId, password, role, roleLabel: ROLE_LABELS[role] || role, fullName },
    });
  } catch (err) {
    console.error("Create staff error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

app.get("/api/patients/search", requireTenantUser, async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) {
    return res.json({ success: true, patients: [] });
  }

  try {
    const like = `%${q}%`;
    const [rows] = await pool.query(
      `SELECT uhid, full_name, dob, gender, phone, category, created_at
       FROM patients
       WHERE hospital_id = ? AND (full_name LIKE ? OR phone LIKE ? OR uhid LIKE ? OR abha_id = ?)
       ORDER BY created_at DESC
       LIMIT 20`,
      [req.session.user.hospitalId, like, like, like, q]
    );
    res.json({ success: true, patients: rows });
  } catch (err) {
    console.error("Search patients error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

app.get("/api/patients/:uhid", requireTenantUser, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT uhid, full_name, dob, gender, phone, address, emergency_contact_name,
              emergency_contact_phone, abha_id, category, registered_by, created_at
       FROM patients WHERE uhid = ? AND hospital_id = ? LIMIT 1`,
      [req.params.uhid, req.session.user.hospitalId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Patient not found." });
    }

    res.json({ success: true, patient: rows[0] });
  } catch (err) {
    console.error("Get patient error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

app.patch("/api/patients/:uhid", requireRole("doctor", "receptionist", "hospital_admin"), async (req, res) => {
  const {
    fullName,
    dob,
    gender,
    phone,
    address,
    emergencyContactName,
    emergencyContactPhone,
    abhaId,
    category,
  } = req.body || {};

  if (!fullName || !fullName.trim()) {
    return res.status(400).json({ success: false, message: "Patient name is required." });
  }

  try {
    const { hospitalId } = req.session.user;
    const [result] = await pool.query(
      `UPDATE patients
       SET full_name = ?, dob = ?, gender = ?, phone = ?, address = ?,
           emergency_contact_name = ?, emergency_contact_phone = ?, abha_id = ?, category = ?
       WHERE uhid = ? AND hospital_id = ?`,
      [
        fullName.trim(),
        dob || null,
        gender || null,
        phone || null,
        address || null,
        emergencyContactName || null,
        emergencyContactPhone || null,
        abhaId || null,
        category || null,
        req.params.uhid,
        hospitalId,
      ]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Patient not found." });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Update patient error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

app.post("/api/patients", requireReceptionistOrAdmin, async (req, res) => {
  const {
    fullName,
    dob,
    gender,
    phone,
    address,
    emergencyContactName,
    emergencyContactPhone,
    abhaId,
    category,
    uhid: customUhid,
    password: customPassword,
  } = req.body || {};

  if (!fullName) {
    return res.status(400).json({ success: false, message: "Patient name is required." });
  }

  if (customUhid && !/^[A-Za-z0-9_-]+$/.test(customUhid)) {
    return res.status(400).json({
      success: false,
      message: "UHID can only contain letters, numbers, hyphens, and underscores.",
    });
  }

  if (customPassword && customPassword.length < 6) {
    return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
  }

  try {
    const { hospitalId, userId } = req.session.user;

    if (customUhid) {
      const [taken] = await pool.query("SELECT user_id FROM user_directory WHERE user_id = ?", [
        customUhid,
      ]);
      if (taken.length > 0) {
        return res.status(409).json({
          success: false,
          message: `UHID "${customUhid}" is already in use. Please choose a different one.`,
        });
      }
    }

    const [hospitalRows] = await pool.query("SELECT short_code FROM hospitals WHERE id = ? LIMIT 1", [
      hospitalId,
    ]);
    const shortCode = hospitalRows[0]?.short_code || "HOSP";

    const password = customPassword || generateTempPassword();
    const passwordHash = await bcrypt.hash(password, 12);

    const [result] = await pool.query(
      `INSERT INTO patients
        (hospital_id, uhid, password_hash, full_name, dob, gender, phone, address, emergency_contact_name,
         emergency_contact_phone, abha_id, category, registered_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        hospitalId,
        customUhid || null,
        passwordHash,
        fullName,
        dob || null,
        gender || null,
        phone || null,
        address || null,
        emergencyContactName || null,
        emergencyContactPhone || null,
        abhaId || null,
        category || null,
        userId,
      ]
    );

    const uhid = customUhid || generateUhid(shortCode, result.insertId);
    if (!customUhid) {
      await pool.query(`UPDATE patients SET uhid = ? WHERE id = ?`, [uhid, result.insertId]);
    }

    await pool.query(
      "INSERT INTO user_directory (user_id, hospital_id, account_type) VALUES (?, ?, 'patient')",
      [uhid, hospitalId]
    );

    res.json({
      success: true,
      patient: { uhid, fullName, dob, gender, phone, category, password },
    });
  } catch (err) {
    console.error("Create patient error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

// ---------- Doctor's own patient list ----------

app.get("/api/doctor/patients", requireRole("doctor"), async (req, res) => {
  try {
    const { hospitalId, userId } = req.session.user;
    const [rows] = await pool.query(
      `SELECT p.uhid, p.full_name, p.phone, p.gender, p.dob,
              (SELECT MAX(v.created_at) FROM opd_visits v WHERE v.patient_uhid = p.uhid AND v.doctor_user_id = ?) AS last_opd_visit,
              (SELECT COUNT(*) FROM lab_orders lo WHERE lo.patient_uhid = p.uhid AND lo.doctor_user_id = ? AND lo.status IN ('completed', 'verified')) AS completed_report_count,
              (SELECT COUNT(*) FROM lab_orders lo WHERE lo.patient_uhid = p.uhid AND lo.doctor_user_id = ? AND lo.status NOT IN ('completed', 'verified')) AS pending_report_count
       FROM patients p
       WHERE p.hospital_id = ? AND p.uhid IN (
         SELECT DISTINCT patient_uhid FROM opd_visits WHERE doctor_user_id = ? AND hospital_id = ?
         UNION
         SELECT DISTINCT patient_uhid FROM ipd_admissions WHERE admitting_doctor_user_id = ? AND hospital_id = ?
       )
       ORDER BY p.full_name`,
      [userId, userId, userId, hospitalId, userId, hospitalId, userId, hospitalId]
    );
    res.json({ success: true, patients: rows });
  } catch (err) {
    console.error("List doctor patients error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

// ---------- Doctor schedule ----------

app.get("/api/doctor/schedule", requireRole("doctor"), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, avail_date, start_time, end_time, slot_minutes
       FROM doctor_calendar_availability
       WHERE hospital_id = ? AND doctor_user_id = ? AND avail_date >= CURDATE()
       ORDER BY avail_date, start_time`,
      [req.session.user.hospitalId, req.session.user.userId]
    );
    res.json({ success: true, schedule: rows });
  } catch (err) {
    console.error("Get schedule error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

app.post("/api/doctor/schedule", requireRole("doctor"), async (req, res) => {
  const { date, endDate, weekdays, startTime, endTime, slotMinutes } = req.body || {};
  if (!date || !startTime || !endTime) {
    return res.status(400).json({ success: false, message: "Date, start time, and end time are required." });
  }
  if (endTime <= startTime) {
    return res.status(400).json({
      success: false,
      message: "End time must be after start time (use 23:45 for end-of-day, not 00:00).",
    });
  }
  const today = todayLocalDateStr();
  if (date < today) {
    return res.status(400).json({ success: false, message: `${date} is in the past. Pick today or a later date.` });
  }
  if (endDate && endDate < date) {
    return res.status(400).json({ success: false, message: "End date must be on or after the start date." });
  }

  // Single date, or a date range optionally filtered to specific weekdays — either way
  // every row we insert is a concrete calendar date, never a recurring day-of-week rule.
  // Anchored at UTC noon (parseDateStrUTC) so the day-of-week and date-string round-trip
  // never drift across the local/UTC boundary.
  const dates = [];
  const cursor = parseDateStrUTC(date);
  const last = parseDateStrUTC(endDate || date);
  const weekdaySet = Array.isArray(weekdays) && weekdays.length > 0 ? new Set(weekdays.map(Number)) : null;
  while (cursor <= last) {
    if (!weekdaySet || weekdaySet.has(cursor.getUTCDay())) {
      dates.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  if (dates.length === 0) {
    return res.status(400).json({ success: false, message: "No matching dates in that range." });
  }
  if (dates.length > 366) {
    return res.status(400).json({ success: false, message: "That range is too large — please split it up." });
  }

  try {
    const { hospitalId, userId } = req.session.user;
    const values = dates.map((d) => [hospitalId, userId, d, startTime, endTime, slotMinutes || 15]);
    const [result] = await pool.query(
      `INSERT IGNORE INTO doctor_calendar_availability
        (hospital_id, doctor_user_id, avail_date, start_time, end_time, slot_minutes)
       VALUES ?`,
      [values]
    );
    res.json({ success: true, datesRequested: dates.length, datesCreated: result.affectedRows });
  } catch (err) {
    console.error("Create schedule error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

app.delete("/api/doctor/schedule/:id", requireRole("doctor"), async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM doctor_calendar_availability WHERE id = ? AND hospital_id = ? AND doctor_user_id = ?`,
      [req.params.id, req.session.user.hospitalId, req.session.user.userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Delete schedule error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

// ---------- OPD booking & queue ----------

// ---------- Departments (Stage 0) ----------

app.get("/api/departments", requireTenantUser, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name FROM departments WHERE hospital_id = ? ORDER BY name`,
      [req.session.user.hospitalId]
    );
    res.json({ success: true, departments: rows });
  } catch (err) {
    console.error("List departments error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

app.post("/api/departments", requireRole("hospital_admin"), async (req, res) => {
  const { name } = req.body || {};
  if (!name) {
    return res.status(400).json({ success: false, message: "Department name is required." });
  }
  try {
    const [result] = await pool.query(
      `INSERT INTO departments (hospital_id, name, created_by) VALUES (?, ?, ?)`,
      [req.session.user.hospitalId, name, req.session.user.userId]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error("Create department error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

app.delete("/api/departments/:id", requireRole("hospital_admin"), async (req, res) => {
  try {
    const { hospitalId } = req.session.user;
    await pool.query(`UPDATE users SET department_id = NULL WHERE department_id = ? AND hospital_id = ?`, [
      req.params.id,
      hospitalId,
    ]);
    await pool.query(`DELETE FROM departments WHERE id = ? AND hospital_id = ?`, [req.params.id, hospitalId]);
    res.json({ success: true });
  } catch (err) {
    console.error("Delete department error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

app.get("/api/opd/doctors", requireTenantUser, async (req, res) => {
  const { departmentId } = req.query;
  try {
    const { hospitalId } = req.session.user;
    let query = `SELECT u.user_id, u.full_name, u.details, u.department_id, d.name AS department_name
                 FROM users u
                 LEFT JOIN departments d ON d.id = u.department_id
                 WHERE u.hospital_id = ? AND u.role = 'doctor'`;
    const params = [hospitalId];
    if (departmentId) {
      query += " AND u.department_id = ?";
      params.push(departmentId);
    }
    query += " ORDER BY u.full_name";

    const [rows] = await pool.query(query, params);
    res.json({ success: true, doctors: rows });
  } catch (err) {
    console.error("List doctors error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

app.get("/api/opd/slots", requireTenantUser, async (req, res) => {
  const { doctorUserId, date } = req.query;
  if (!doctorUserId || !date) {
    return res.status(400).json({ success: false, message: "doctorUserId and date are required." });
  }
  try {
    const { hospitalId } = req.session.user;

    const [scheduleRows] = await pool.query(
      `SELECT start_time, end_time, slot_minutes FROM doctor_calendar_availability
       WHERE hospital_id = ? AND doctor_user_id = ? AND avail_date = ?`,
      [hospitalId, doctorUserId, date]
    );
    const [bookedRows] = await pool.query(
      `SELECT slot_time FROM opd_visits
       WHERE hospital_id = ? AND doctor_user_id = ? AND visit_date = ? AND slot_time IS NOT NULL`,
      [hospitalId, doctorUserId, date]
    );

    const slots = computeAvailableSlots(
      scheduleRows,
      bookedRows.map((r) => r.slot_time)
    );
    res.json({ success: true, slots });
  } catch (err) {
    console.error("Get slots error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

app.post("/api/opd/visits", requireReceptionistOrAdmin, async (req, res) => {
  const { patientUhid, doctorUserId, visitDate, slotTime, confirmDuplicate } = req.body || {};
  if (!patientUhid || !doctorUserId || !visitDate) {
    return res.status(400).json({ success: false, message: "Patient, doctor, and date are required." });
  }

  const today = todayLocalDateStr();
  if (visitDate < today) {
    return res.status(400).json({
      success: false,
      message: `${visitDate} is in the past. Pick today (${today}) or a later date.`,
    });
  }

  try {
    const { hospitalId, userId } = req.session.user;

    if (slotTime) {
      const [conflict] = await pool.query(
        `SELECT id FROM opd_visits WHERE hospital_id = ? AND doctor_user_id = ? AND visit_date = ? AND slot_time = ?`,
        [hospitalId, doctorUserId, visitDate, slotTime]
      );
      if (conflict.length > 0) {
        return res.status(409).json({
          success: false,
          message: "That slot has just been booked. Please pick another.",
        });
      }
    }

    // Warn (don't hard-block) if this patient already has other unresolved bookings —
    // easy to create several by accident when re-picking dates/doctors while searching
    // for an open slot. The caller can resubmit with confirmDuplicate: true to proceed.
    if (!confirmDuplicate) {
      const [pending] = await pool.query(
        `SELECT v.id, v.visit_date, v.slot_time, u.full_name AS doctor_name, v.doctor_user_id
         FROM opd_visits v LEFT JOIN users u ON u.user_id = v.doctor_user_id
         WHERE v.hospital_id = ? AND v.patient_uhid = ? AND v.status IN ('waiting', 'in-consultation')`,
        [hospitalId, patientUhid]
      );
      if (pending.length > 0) {
        return res.status(409).json({
          success: false,
          duplicateWarning: true,
          message: `This patient already has ${pending.length} unresolved booking(s).`,
          existingVisits: pending.map((v) => ({
            id: v.id,
            visitDate: v.visit_date,
            slotTime: v.slot_time,
            doctorName: v.doctor_name || v.doctor_user_id,
          })),
        });
      }
    }

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM opd_visits WHERE hospital_id = ? AND visit_date = ?`,
      [hospitalId, visitDate]
    );
    const tokenNumber = countRows[0].cnt + 1;

    const [patientRows] = await pool.query(
      `SELECT phone FROM patients WHERE uhid = ? AND hospital_id = ? LIMIT 1`,
      [patientUhid, hospitalId]
    );
    const patientPhone = patientRows[0]?.phone;
    const source = slotTime ? "appointment" : "walk-in";

    const [result] = await pool.query(
      `INSERT INTO opd_visits
        (hospital_id, token_number, patient_uhid, doctor_user_id, visit_date, slot_time, source, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'waiting', ?)`,
      [hospitalId, tokenNumber, patientUhid, doctorUserId, visitDate, slotTime || null, source, userId]
    );

    const confirmation = patientPhone
      ? `[stub] SMS/WhatsApp confirmation sent to ${patientPhone}: token #${tokenNumber} on ${visitDate}${
          slotTime ? ` at ${slotTime}` : ""
        }.`
      : "[stub] No phone on file for this patient — confirmation not sent.";
    console.log(confirmation);

    res.json({
      success: true,
      visit: { id: result.insertId, tokenNumber, visitDate, slotTime: slotTime || null, source },
      confirmation,
    });
  } catch (err) {
    console.error("Book visit error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

app.get("/api/opd/queue", requireTenantUser, async (req, res) => {
  const { date, doctorUserId } = req.query;
  const visitDate = date || todayLocalDateStr();

  try {
    const { hospitalId } = req.session.user;
    let query = `SELECT v.id, v.token_number, v.patient_uhid, v.doctor_user_id, v.visit_date, v.slot_time,
                        v.source, v.status, p.full_name AS patient_name, u.full_name AS doctor_name
                 FROM opd_visits v
                 LEFT JOIN patients p ON p.uhid = v.patient_uhid
                 LEFT JOIN users u ON u.user_id = v.doctor_user_id
                 WHERE v.hospital_id = ? AND v.visit_date = ?`;
    const params = [hospitalId, visitDate];

    if (doctorUserId) {
      query += " AND v.doctor_user_id = ?";
      params.push(doctorUserId);
    }
    query += " ORDER BY (v.slot_time IS NULL), v.slot_time, v.created_at";

    const [rows] = await pool.query(query, params);
    res.json({ success: true, queue: rows });
  } catch (err) {
    console.error("Get queue error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

app.patch("/api/opd/visits/:id/status", requireRole("doctor", "hospital_admin"), async (req, res) => {
  const { status } = req.body || {};
  if (!["waiting", "in-consultation", "completed"].includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid status." });
  }
  try {
    await pool.query(`UPDATE opd_visits SET status = ? WHERE id = ? AND hospital_id = ?`, [
      status,
      req.params.id,
      req.session.user.hospitalId,
    ]);
    res.json({ success: true });
  } catch (err) {
    console.error("Update visit status error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

// ---------- Patient EMR history ----------

app.get("/api/patients/:uhid/history", requireTenantUser, async (req, res) => {
  try {
    const { hospitalId } = req.session.user;
    const [consultations] = await pool.query(
      `SELECT c.id, c.symptoms, c.notes, c.decision, c.created_at, u.full_name AS doctor_name
       FROM consultations c
       LEFT JOIN users u ON u.user_id = c.doctor_user_id
       WHERE c.hospital_id = ? AND c.patient_uhid = ? ORDER BY c.created_at DESC`,
      [hospitalId, req.params.uhid]
    );
    const [admissions] = await pool.query(
      `SELECT id, status, admission_notes, created_at, admitted_at
       FROM ipd_admissions WHERE hospital_id = ? AND patient_uhid = ? ORDER BY created_at DESC`,
      [hospitalId, req.params.uhid]
    );
    const [labOrderRows] = await pool.query(
      `SELECT lo.id, tc.name AS test_name, tc.category, tc.department, lo.status,
              lo.result_notes, lo.result_file_name, lo.completed_at, lo.created_at,
              (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', li.id, 'fileName', li.file_name))
                 FROM lab_order_images li WHERE li.lab_order_id = lo.id) AS images
       FROM lab_orders lo
       LEFT JOIN test_catalog tc ON tc.id = lo.test_id
       WHERE lo.hospital_id = ? AND lo.patient_uhid = ? ORDER BY lo.created_at DESC`,
      [hospitalId, req.params.uhid]
    );
    const labOrders = labOrderRows.map((r) => ({
      ...r,
      images: typeof r.images === "string" ? JSON.parse(r.images) : r.images || [],
    }));
    res.json({ success: true, history: { consultations, admissions, labOrders } });
  } catch (err) {
    console.error("Get patient history error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

// ---------- Pathology / Radiology test catalog ----------

app.get("/api/tests/search", requireTenantUser, async (req, res) => {
  const q = (req.query.q || "").trim();
  try {
    const [rows] = await pool.query(
      `SELECT id, name, category, department, sample_type, price, turnaround_hours
       FROM test_catalog
       WHERE hospital_id = ? AND name LIKE ? ORDER BY name LIMIT 20`,
      [req.session.user.hospitalId, `%${q}%`]
    );
    res.json({ success: true, tests: rows });
  } catch (err) {
    console.error("Search tests error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

// ---------- Consultation (doctor decision point) ----------

app.post("/api/opd/visits/:id/consultation", requireRole("doctor"), async (req, res) => {
  const { symptoms, notes, testIds, admit } = req.body || {};
  const prescriptions = Array.isArray(req.body?.prescriptions) ? req.body.prescriptions : [];
  const tests = Array.isArray(testIds) ? testIds : [];
  const wantsAdmit = admit === true;

  // A consultation can combine any mix of prescribe / order tests / admit — at least
  // one action is required, but none of them are mutually exclusive anymore.
  if (prescriptions.length === 0 && tests.length === 0 && !wantsAdmit) {
    return res.status(400).json({
      success: false,
      message: "Add at least one action: prescribe a medicine, order a test, or admit the patient.",
    });
  }
  for (const p of prescriptions) {
    if (!p || !p.medicineName || !p.dosage || !p.duration) {
      return res.status(400).json({ success: false, message: "Each prescription needs a medicine, dosage, and duration." });
    }
  }

  try {
    const { hospitalId, userId } = req.session.user;
    const [visitRows] = await pool.query(
      `SELECT patient_uhid FROM opd_visits WHERE id = ? AND hospital_id = ? LIMIT 1`,
      [req.params.id, hospitalId]
    );
    if (visitRows.length === 0) {
      return res.status(404).json({ success: false, message: "Visit not found." });
    }
    const patientUhid = visitRows[0].patient_uhid;

    const actions = [];
    if (prescriptions.length > 0) actions.push("prescribe");
    if (tests.length > 0) actions.push("order_tests");
    if (wantsAdmit) actions.push("admit");
    const decision = actions.join(",");

    await pool.query(
      `INSERT INTO consultations (hospital_id, opd_visit_id, patient_uhid, doctor_user_id, symptoms, notes, decision)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [hospitalId, req.params.id, patientUhid, userId, symptoms || null, notes || null, decision]
    );
    await pool.query(`UPDATE opd_visits SET status = 'completed' WHERE id = ? AND hospital_id = ?`, [
      req.params.id,
      hospitalId,
    ]);

    if (prescriptions.length > 0) {
      const values = prescriptions.map((p) => [
        hospitalId,
        req.params.id,
        patientUhid,
        userId,
        p.medicineName,
        p.dosage,
        p.duration,
        p.urgency === "urgent" ? "urgent" : "routine",
      ]);
      await pool.query(
        `INSERT INTO medisys_pharmacy.pharmacy_orders
           (hospital_id, opd_visit_id, patient_uhid, doctor_user_id, medicine_name, dosage, duration, urgency)
         VALUES ?`,
        [values]
      );
    }

    if (tests.length > 0) {
      const values = tests.map((testId) => [hospitalId, req.params.id, patientUhid, testId, userId]);
      await pool.query(
        `INSERT INTO lab_orders (hospital_id, opd_visit_id, patient_uhid, test_id, doctor_user_id) VALUES ?`,
        [values]
      );
    }

    let admissionId = null;
    let admissionAlreadyExisted = false;
    if (wantsAdmit) {
      const [existing] = await pool.query(
        `SELECT id FROM ipd_admissions
         WHERE hospital_id = ? AND patient_uhid = ? AND status IN ('requested', 'admitted') LIMIT 1`,
        [hospitalId, patientUhid]
      );

      if (existing.length > 0) {
        admissionId = existing[0].id;
        admissionAlreadyExisted = true;
      } else {
        const [admissionResult] = await pool.query(
          `INSERT INTO ipd_admissions (hospital_id, patient_uhid, admitting_doctor_user_id, opd_visit_id, created_by)
           VALUES (?, ?, ?, ?, ?)`,
          [hospitalId, patientUhid, userId, req.params.id, userId]
        );
        admissionId = admissionResult.insertId;
      }
    }

    res.json({
      success: true,
      admissionId,
      admissionAlreadyExisted,
      prescriptionCount: prescriptions.length,
      testCount: tests.length,
    });
  } catch (err) {
    console.error("Record consultation error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

// ---------- Lab orders (Pathology / Laboratory / Radiology queues) ----------

app.get("/api/lab-orders", requireRole("pathology_staff", "hospital_admin"), async (req, res) => {
  const { department, scope, status } = req.query;
  try {
    const { hospitalId, userId } = req.session.user;
    let query = `SELECT lo.id, lo.patient_uhid, p.full_name AS patient_name, p.dob, p.gender,
                        lo.test_id, tc.name AS test_name, tc.category, tc.department, tc.sample_type, tc.turnaround_hours,
                        lo.doctor_user_id, u.full_name AS doctor_name,
                        lo.status, lo.priority, lo.assigned_to, a.full_name AS assigned_to_name,
                        lo.result_notes, lo.result_file_name, lo.completed_by, lo.completed_at,
                        lo.verified_by, v.full_name AS verified_by_name, lo.verified_at, lo.created_at,
                        (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', li.id, 'fileName', li.file_name))
                           FROM lab_order_images li WHERE li.lab_order_id = lo.id) AS images
                 FROM lab_orders lo
                 LEFT JOIN patients p ON p.uhid = lo.patient_uhid
                 LEFT JOIN test_catalog tc ON tc.id = lo.test_id
                 LEFT JOIN users u ON u.user_id = lo.doctor_user_id
                 LEFT JOIN users a ON a.user_id = lo.assigned_to
                 LEFT JOIN users v ON v.user_id = lo.verified_by`;
    const conditions = ["lo.hospital_id = ?"];
    const params = [hospitalId];

    if (department) {
      conditions.push("tc.department = ?");
      params.push(department);
    }
    if (scope === "unclaimed") {
      conditions.push("lo.status = 'pending'");
    } else if (scope === "mine") {
      conditions.push("lo.assigned_to = ? AND lo.status NOT IN ('completed', 'verified')");
      params.push(userId);
    } else if (scope === "completed") {
      conditions.push("lo.status IN ('completed', 'verified')");
    }
    if (status && status !== "all") {
      conditions.push("lo.status = ?");
      params.push(status);
    }
    if (conditions.length) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }
    query += " ORDER BY lo.created_at DESC";

    const [rows] = await pool.query(query, params);
    const orders = rows.map((r) => ({
      ...r,
      images: typeof r.images === "string" ? JSON.parse(r.images) : r.images || [],
    }));
    res.json({ success: true, orders });
  } catch (err) {
    console.error("List lab orders error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

app.post("/api/lab-orders/:id/claim", requireRole("pathology_staff"), async (req, res) => {
  try {
    const { hospitalId, userId } = req.session.user;
    const [result] = await pool.query(
      `UPDATE lab_orders SET assigned_to = ?, status = 'in_progress'
       WHERE id = ? AND hospital_id = ? AND status = 'pending'`,
      [userId, req.params.id, hospitalId]
    );
    if (result.affectedRows === 0) {
      return res.status(409).json({ success: false, message: "This order has already been claimed." });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Claim lab order error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

app.post(
  "/api/lab-orders/:id/complete",
  requireRole("pathology_staff"),
  labResultUpload.single("file"),
  async (req, res) => {
    const { resultNotes } = req.body || {};
    try {
      const { hospitalId, userId } = req.session.user;
      const [result] = await pool.query(
        `UPDATE lab_orders
         SET status = 'completed', result_notes = ?, result_file_path = ?, result_file_name = ?,
             assigned_to = COALESCE(assigned_to, ?), completed_by = ?, completed_at = NOW()
         WHERE id = ? AND hospital_id = ? AND status != 'completed'`,
        [
          resultNotes || null,
          req.file ? req.file.filename : null,
          req.file ? req.file.originalname : null,
          userId,
          userId,
          req.params.id,
          hospitalId,
        ]
      );
      if (result.affectedRows === 0) {
        return res.status(409).json({ success: false, message: "This order was already completed." });
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Complete lab order error:", err.message);
      res.status(500).json({ success: false, message: "Server error. Please try again." });
    }
  }
);

app.get("/api/lab-orders/:id/result-file", requireTenantUser, async (req, res) => {
  try {
    const { hospitalId } = req.session.user;
    const [rows] = await pool.query(
      `SELECT result_file_path, result_file_name FROM lab_orders WHERE id = ? AND hospital_id = ? LIMIT 1`,
      [req.params.id, hospitalId]
    );
    if (rows.length === 0 || !rows[0].result_file_path) {
      return res.status(404).json({ success: false, message: "No result file found." });
    }
    res.download(path.join(UPLOADS_DIR, rows[0].result_file_path), rows[0].result_file_name || "result");
  } catch (err) {
    console.error("Download lab result error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

// Escalate/de-escalate a study's priority (radiology triage).
app.post("/api/lab-orders/:id/priority", requireRole("pathology_staff", "hospital_admin"), async (req, res) => {
  const { priority } = req.body || {};
  if (!["routine", "urgent", "stat"].includes(priority)) {
    return res.status(400).json({ success: false, message: "A valid priority is required." });
  }
  try {
    const { hospitalId } = req.session.user;
    const [result] = await pool.query(
      `UPDATE lab_orders SET priority = ? WHERE id = ? AND hospital_id = ?`,
      [priority, req.params.id, hospitalId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Update lab order priority error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

// Save a report in progress. Auto-claims unassigned orders and moves them to "reported"
// (drafted, not yet signed) — kept separate from "verified" so doctors don't see it until signed.
app.post("/api/lab-orders/:id/draft", requireRole("pathology_staff"), async (req, res) => {
  const { resultNotes } = req.body || {};
  try {
    const { hospitalId, userId } = req.session.user;
    const [result] = await pool.query(
      `UPDATE lab_orders
       SET result_notes = ?, assigned_to = COALESCE(assigned_to, ?),
           status = CASE WHEN status IN ('pending', 'in_progress') THEN 'reported' ELSE status END
       WHERE id = ? AND hospital_id = ? AND status NOT IN ('completed', 'verified')`,
      [resultNotes || null, userId, req.params.id, hospitalId]
    );
    if (result.affectedRows === 0) {
      return res.status(409).json({ success: false, message: "This order is already finalized." });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Save lab order draft error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

// Sign & finalize a report. Terminal state, visible to the ordering doctor from here on.
app.post("/api/lab-orders/:id/verify", requireRole("pathology_staff"), async (req, res) => {
  const { resultNotes } = req.body || {};
  try {
    const { hospitalId, userId } = req.session.user;
    const [result] = await pool.query(
      `UPDATE lab_orders
       SET result_notes = ?, status = 'verified', verified_by = ?, verified_at = NOW(),
           assigned_to = COALESCE(assigned_to, ?), completed_by = ?, completed_at = NOW()
       WHERE id = ? AND hospital_id = ? AND status NOT IN ('completed', 'verified')`,
      [resultNotes || null, userId, userId, userId, req.params.id, hospitalId]
    );
    if (result.affectedRows === 0) {
      return res.status(409).json({ success: false, message: "This order is already finalized." });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Verify lab order error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

// Reassign a study to a specific staff member (or clear assignment by passing no userId).
app.post("/api/lab-orders/:id/reassign", requireRole("pathology_staff", "hospital_admin"), async (req, res) => {
  const { userId: targetUserId } = req.body || {};
  try {
    const { hospitalId } = req.session.user;
    if (!targetUserId) {
      const [result] = await pool.query(
        `UPDATE lab_orders SET assigned_to = NULL, status = IF(status = 'in_progress', 'pending', status)
         WHERE id = ? AND hospital_id = ? AND status NOT IN ('completed', 'verified')`,
        [req.params.id, hospitalId]
      );
      if (result.affectedRows === 0) {
        return res.status(409).json({ success: false, message: "This order is already finalized." });
      }
      return res.json({ success: true });
    }

    const [staffRows] = await pool.query(
      `SELECT user_id FROM users WHERE user_id = ? AND hospital_id = ? AND role = 'pathology_staff' LIMIT 1`,
      [targetUserId, hospitalId]
    );
    if (staffRows.length === 0) {
      return res.status(400).json({ success: false, message: "That staff member was not found." });
    }

    const [result] = await pool.query(
      `UPDATE lab_orders
       SET assigned_to = ?, status = IF(status = 'pending', 'in_progress', status)
       WHERE id = ? AND hospital_id = ? AND status NOT IN ('completed', 'verified')`,
      [targetUserId, req.params.id, hospitalId]
    );
    if (result.affectedRows === 0) {
      return res.status(409).json({ success: false, message: "This order is already finalized." });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Reassign lab order error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

// Staff directory for the reassign dropdown — pathology_staff in this hospital, optionally
// narrowed to the Radiologist designation when department=Radiology.
app.get("/api/lab-orders/staff", requireRole("pathology_staff", "hospital_admin"), async (req, res) => {
  try {
    const { hospitalId } = req.session.user;
    const [rows] = await pool.query(
      `SELECT user_id, full_name, details FROM users
       WHERE hospital_id = ? AND role = 'pathology_staff' ORDER BY full_name`,
      [hospitalId]
    );
    const wantRadiology = req.query.department === "Radiology";
    const staff = rows
      .filter((r) => {
        const details = typeof r.details === "string" ? JSON.parse(r.details) : r.details || {};
        const isRadiologist = details.designation === "Radiologist";
        return wantRadiology ? isRadiologist : !isRadiologist;
      })
      .map((r) => ({ userId: r.user_id, fullName: r.full_name }));
    res.json({ success: true, staff });
  } catch (err) {
    console.error("List lab staff error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

// Multiple study images per order (radiology).
app.get("/api/lab-orders/:id/images", requireTenantUser, async (req, res) => {
  try {
    const { hospitalId } = req.session.user;
    const [orderRows] = await pool.query(`SELECT id FROM lab_orders WHERE id = ? AND hospital_id = ? LIMIT 1`, [
      req.params.id,
      hospitalId,
    ]);
    if (orderRows.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }
    const [rows] = await pool.query(
      `SELECT id, file_name AS fileName FROM lab_order_images WHERE lab_order_id = ? AND hospital_id = ? ORDER BY id`,
      [req.params.id, hospitalId]
    );
    res.json({ success: true, images: rows });
  } catch (err) {
    console.error("List lab order images error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

app.post(
  "/api/lab-orders/:id/images",
  requireRole("pathology_staff"),
  labImageUpload.array("images", 10),
  async (req, res) => {
    try {
      const { hospitalId, userId } = req.session.user;
      const [orderRows] = await pool.query(
        `SELECT id FROM lab_orders WHERE id = ? AND hospital_id = ? LIMIT 1`,
        [req.params.id, hospitalId]
      );
      if (orderRows.length === 0) {
        return res.status(404).json({ success: false, message: "Order not found." });
      }
      const files = req.files || [];
      if (files.length === 0) {
        return res.status(400).json({ success: false, message: "No image files were uploaded." });
      }
      const values = files.map((f) => [hospitalId, req.params.id, f.filename, f.originalname, userId]);
      await pool.query(
        `INSERT INTO lab_order_images (hospital_id, lab_order_id, file_path, file_name, uploaded_by) VALUES ?`,
        [values]
      );
      const [rows] = await pool.query(
        `SELECT id, file_name AS fileName FROM lab_order_images WHERE lab_order_id = ? AND hospital_id = ? ORDER BY id`,
        [req.params.id, hospitalId]
      );
      res.json({ success: true, images: rows });
    } catch (err) {
      console.error("Upload lab order images error:", err.message);
      res.status(500).json({ success: false, message: "Server error. Please try again." });
    }
  }
);

app.get("/api/lab-orders/:id/images/:imageId", requireTenantUser, async (req, res) => {
  try {
    const { hospitalId } = req.session.user;
    const [rows] = await pool.query(
      `SELECT file_path, file_name FROM lab_order_images
       WHERE id = ? AND lab_order_id = ? AND hospital_id = ? LIMIT 1`,
      [req.params.imageId, req.params.id, hospitalId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Image not found." });
    }
    res.sendFile(path.join(LAB_IMAGES_DIR, rows[0].file_path));
  } catch (err) {
    console.error("Fetch lab order image error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

// ---------- Pharmacy Orders ----------

app.post("/api/pharmacy-orders", requireRole("doctor"), async (req, res) => {
  const { opdVisitId, ipdAdmissionId, patientUhid, medicineName, dosage, duration, urgency } = req.body;
  if (!patientUhid || !medicineName || !dosage || !duration) {
    return res.status(400).json({ success: false, message: "Missing required fields." });
  }
  try {
    const { userId, hospitalId } = req.session.user;
    await pool.query(
      `INSERT INTO medisys_pharmacy.pharmacy_orders 
       (hospital_id, opd_visit_id, ipd_admission_id, patient_uhid, doctor_user_id, medicine_name, dosage, duration, urgency) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [hospitalId || 1, opdVisitId || null, ipdAdmissionId || null, patientUhid, userId, medicineName, dosage, duration, urgency || 'routine']
    );
    res.json({ success: true, message: "Prescription sent to pharmacy." });
  } catch (err) {
    console.error("Create pharmacy order error:", err.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

app.get("/api/pharmacy-orders", requireTenantUser, async (req, res) => {
  try {
    const [orders] = await pool.query(
      `SELECT po.*, p.full_name as patient_name, p.dob as patient_dob, p.gender as patient_gender 
       FROM medisys_pharmacy.pharmacy_orders po
       LEFT JOIN patients p ON po.patient_uhid = p.uhid
       ORDER BY po.created_at DESC`
    );
    res.json({ success: true, orders });
  } catch (err) {
    console.error("Get pharmacy orders error:", err.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

app.post("/api/pharmacy-orders/:id/dispense", requireTenantUser, async (req, res) => {
  try {
    const { userId } = req.session.user;
    const orderId = req.params.id;

    // 1. Get the order to find medicine name
    const [orders] = await pool.query(
      `SELECT * FROM medisys_pharmacy.pharmacy_orders WHERE id = ?`, [orderId]
    );
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }
    const order = orders[0];
    if (order.status === 'dispensed') {
      return res.status(400).json({ success: false, message: "Already dispensed." });
    }

    // 2. Auto-deduct stock — find matching stock by medicine name (case-insensitive, closest match)
    //    Pick the batch with earliest expiry (FEFO — First Expiry First Out) that has stock > 0
    const medName = order.medicine_name.trim();
    const [matchingStock] = await pool.query(
      `SELECT * FROM medisys_pharmacy.pharmacy_stock 
       WHERE LOWER(medicine_name) LIKE CONCAT('%', LOWER(?), '%') AND stock_quantity > 0
       ORDER BY expiry_date ASC LIMIT 1`,
      [medName]
    );

    let stockDeducted = false;
    let stockWarning = null;
    if (matchingStock.length > 0) {
      const stock = matchingStock[0];
      await pool.query(
        `UPDATE medisys_pharmacy.pharmacy_stock SET stock_quantity = stock_quantity - 1 WHERE id = ? AND stock_quantity > 0`,
        [stock.id]
      );
      stockDeducted = true;
      if (stock.stock_quantity - 1 <= stock.min_stock_level) {
        stockWarning = `Low stock alert: ${stock.medicine_name} has only ${stock.stock_quantity - 1} left.`;
      }
    }

    // 3. Mark order as dispensed
    await pool.query(
      `UPDATE medisys_pharmacy.pharmacy_orders SET status = 'dispensed', dispensed_by = ?, dispensed_at = NOW() WHERE id = ?`,
      [userId, orderId]
    );

    // 4. Auto-create Invoice in pharmacy_invoices table
    let patientName = "Patient (" + order.patient_uhid + ")";
    const [pRows] = await pool.query(`SELECT full_name FROM patients WHERE uhid = ?`, [order.patient_uhid]);
    if (pRows.length > 0 && pRows[0].full_name) {
      patientName = pRows[0].full_name;
    }

    const invNum = "PHINV-" + (8800 + Math.floor(Math.random() * 1000));
    let invAmount = order.amount || 15.00;
    if (matchingStock.length > 0 && matchingStock[0].unit_price) {
      invAmount = matchingStock[0].unit_price;
    }

    await pool.query(
      `INSERT INTO medisys_pharmacy.pharmacy_invoices 
       (hospital_id, invoice_number, order_id, patient_uhid, patient_name, payment_type, item_count, total_amount, payment_status, created_by)
       VALUES (?, ?, ?, ?, ?, 'Cash', 1, ?, 'Pending', ?)`,
      [order.hospital_id || 1, invNum, orderId, order.patient_uhid, patientName, invAmount, userId]
    );

    res.json({ 
      success: true, 
      message: "Medicine dispensed successfully.",
      stockDeducted,
      stockWarning,
      invoiceNumber: invNum
    });
  } catch (err) {
    console.error("Dispense pharmacy order error:", err.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ---------- Pharmacy Invoices / Billing ----------

app.get("/api/pharmacy-invoices", requireTenantUser, async (req, res) => {
  try {
    const [invoices] = await pool.query(
      `SELECT * FROM medisys_pharmacy.pharmacy_invoices ORDER BY created_at DESC`
    );
    
    // Calculate stats
    let totalBilled = 0;
    let collected = 0;
    let pendingCount = 0;

    invoices.forEach(inv => {
      const amt = parseFloat(inv.total_amount) || 0;
      totalBilled += amt;
      if (inv.payment_status === 'Paid') {
        collected += amt;
      } else {
        pendingCount += 1;
      }
    });

    res.json({
      success: true,
      invoices,
      stats: {
        totalBilled,
        collected,
        pendingCount
      }
    });
  } catch (err) {
    console.error("Get pharmacy invoices error:", err.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

app.post("/api/pharmacy-invoices/:id/pay", requireTenantUser, async (req, res) => {
  try {
    const { paymentType } = req.body || {};
    const pType = paymentType && paymentType.trim() ? paymentType.trim() : 'Cash';

    await pool.query(
      `UPDATE medisys_pharmacy.pharmacy_invoices SET payment_status = 'Paid', payment_type = ?, paid_at = NOW() WHERE id = ?`,
      [pType, req.params.id]
    );
    res.json({ success: true, message: "Payment marked as Paid." });
  } catch (err) {
    console.error("Mark invoice paid error:", err.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ---------- Pharmacy Patients Directory ----------

app.get("/api/pharmacy-patients", requireTenantUser, async (req, res) => {
  try {
    const query = req.query.search ? req.query.search.trim() : '';

    let sql = `
      SELECT p.uhid, p.full_name, p.dob, p.gender, p.phone,
             COUNT(po.id) as total_prescriptions,
             MAX(po.created_at) as last_dispensed_at
      FROM patients p
      LEFT JOIN medisys_pharmacy.pharmacy_orders po ON p.uhid = po.patient_uhid
    `;
    const params = [];

    if (query) {
      sql += ` WHERE p.full_name LIKE ? OR p.uhid LIKE ? OR p.phone LIKE ?`;
      params.push(`%${query}%`, `%${query}%`, `%${query}%`);
    }

    sql += ` GROUP BY p.uhid, p.full_name, p.dob, p.gender, p.phone ORDER BY last_dispensed_at DESC, p.full_name ASC LIMIT 50`;

    const [patients] = await pool.query(sql, params);
    res.json({ success: true, patients });
  } catch (err) {
    console.error("Get pharmacy patients error:", err.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

app.get("/api/pharmacy-patients/:uhid/history", requireTenantUser, async (req, res) => {
  try {
    const { uhid } = req.params;

    const [orders] = await pool.query(
      `SELECT po.*, u.full_name as doctor_name
       FROM medisys_pharmacy.pharmacy_orders po
       LEFT JOIN users u ON po.doctor_user_id = u.user_id
       WHERE po.patient_uhid = ?
       ORDER BY po.created_at DESC`,
      [uhid]
    );

    res.json({ success: true, orders });
  } catch (err) {
    console.error("Get patient pharmacy history error:", err.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ---------- Direct Pharmacy Sale / Auto Stock Deduct ----------

app.post("/api/pharmacy-direct-sale", requireTenantUser, async (req, res) => {
  try {
    const { userId, hospitalId } = req.session.user;
    const { stockId, quantity, patientName, phone, paymentMode } = req.body;

    const qty = parseInt(quantity, 10);
    if (!stockId || !qty || qty <= 0) {
      return res.status(400).json({ success: false, message: "Valid medicine and quantity are required." });
    }

    // 1. Check stock availability
    const [stocks] = await pool.query(`SELECT * FROM medisys_pharmacy.pharmacy_stock WHERE id = ?`, [stockId]);
    if (stocks.length === 0) {
      return res.status(404).json({ success: false, message: "Medicine stock item not found." });
    }

    const stock = stocks[0];
    if (stock.stock_quantity < qty) {
      return res.status(400).json({ 
        success: false, 
        message: `Insufficient stock. Only ${stock.stock_quantity} left in stock.` 
      });
    }

    // 2. Auto-deduct stock
    await pool.query(
      `UPDATE medisys_pharmacy.pharmacy_stock SET stock_quantity = stock_quantity - ? WHERE id = ?`,
      [qty, stockId]
    );

    // 3. Create Bill Invoice (Pending Payment)
    const invNum = "PHINV-" + (8800 + Math.floor(Math.random() * 1000));
    const unitPrice = parseFloat(stock.unit_price) || 15.00;
    const totalAmount = unitPrice * qty;
    const pName = patientName && patientName.trim() ? patientName.trim() : "Walk-in Counter Patient";
    const pUhid = phone && phone.trim() ? "PH-" + phone.trim() : "WALKIN-OTC";

    await pool.query(
      `INSERT INTO medisys_pharmacy.pharmacy_invoices 
       (hospital_id, invoice_number, patient_uhid, patient_name, payment_type, item_count, total_amount, payment_status, created_by)
       VALUES (?, ?, ?, ?, 'Pending', ?, ?, 'Pending', ?)`,
      [hospitalId || 1, invNum, pUhid, pName, qty, totalAmount, userId]
    );

    res.json({
      success: true,
      message: `Successfully dispensed ${qty} unit(s) of ${stock.medicine_name}. Stock auto-deducted!`,
      newQuantity: stock.stock_quantity - qty,
      invoiceNumber: invNum
    });
  } catch (err) {
    console.error("Direct pharmacy sale error:", err.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ---------- Pharmacy Stock ----------

app.get("/api/pharmacy-stock", requireTenantUser, async (req, res) => {
  try {
    const [stock] = await pool.query(
      `SELECT * FROM medisys_pharmacy.pharmacy_stock ORDER BY medicine_name ASC`
    );
    res.json({ success: true, stock });
  } catch (err) {
    console.error("Get pharmacy stock error:", err.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

app.post("/api/pharmacy-stock", requireTenantUser, async (req, res) => {
  try {
    const { userId, hospitalId } = req.session.user;
    const { medicineName, category, batchNumber, expiryDate, stockQuantity, minStockLevel, unitPrice } = req.body;
    
    if (!medicineName || !category || !batchNumber || !expiryDate || stockQuantity === undefined) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    await pool.query(
      `INSERT INTO medisys_pharmacy.pharmacy_stock 
       (hospital_id, medicine_name, category, batch_number, expiry_date, stock_quantity, min_stock_level, unit_price, added_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [hospitalId || 1, medicineName, category, batchNumber, expiryDate, stockQuantity, minStockLevel || 10, unitPrice || null, userId]
    );
    res.json({ success: true, message: "Stock added successfully." });
  } catch (err) {
    console.error("Add pharmacy stock error:", err.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// Edit stock
app.put("/api/pharmacy-stock/:id", requireTenantUser, async (req, res) => {
  try {
    const { medicineName, category, batchNumber, expiryDate, stockQuantity, minStockLevel, unitPrice } = req.body;
    await pool.query(
      `UPDATE medisys_pharmacy.pharmacy_stock SET 
       medicine_name = ?, category = ?, batch_number = ?, expiry_date = ?, 
       stock_quantity = ?, min_stock_level = ?, unit_price = ?
       WHERE id = ?`,
      [medicineName, category, batchNumber, expiryDate, stockQuantity, minStockLevel || 10, unitPrice || null, req.params.id]
    );
    res.json({ success: true, message: "Stock updated." });
  } catch (err) {
    console.error("Update pharmacy stock error:", err.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// Delete stock
app.delete("/api/pharmacy-stock/:id", requireTenantUser, async (req, res) => {
  try {
    await pool.query(`DELETE FROM medisys_pharmacy.pharmacy_stock WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: "Stock entry deleted." });
  } catch (err) {
    console.error("Delete pharmacy stock error:", err.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ---------- Pharmacy Purchase Orders ----------

app.get("/api/pharmacy-purchase-orders", requireTenantUser, async (req, res) => {
  try {
    const [orders] = await pool.query(
      `SELECT * FROM medisys_pharmacy.pharmacy_purchase_orders ORDER BY created_at DESC`
    );
    res.json({ success: true, orders });
  } catch (err) {
    console.error("Get purchase orders error:", err.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

app.post("/api/pharmacy-purchase-orders/auto-generate", requireTenantUser, async (req, res) => {
  try {
    const { userId, hospitalId } = req.session.user;
    
    // Find all low/out of stock items
    const [lowStock] = await pool.query(
      `SELECT * FROM medisys_pharmacy.pharmacy_stock WHERE stock_quantity <= min_stock_level`
    );

    if (lowStock.length === 0) {
      return res.json({ success: false, message: "Nothing needs reordering right now." });
    }

    const poNumber = "PO-" + Date.now().toString().slice(-6);
    const supplierName = "Central Pharma Wholesalers Ltd.";
    const itemsSummary = lowStock.map(s => s.medicine_name).join(", ");
    const totalItems = lowStock.length;

    await pool.query(
      `INSERT INTO medisys_pharmacy.pharmacy_purchase_orders 
       (hospital_id, po_number, supplier_name, items_summary, total_items, status, created_by)
       VALUES (?, ?, ?, ?, ?, 'Submitted', ?)`,
      [hospitalId || 1, poNumber, supplierName, itemsSummary, totalItems, userId]
    );

    res.json({ success: true, message: `Generated PO #${poNumber} for ${totalItems} item(s).`, poNumber });
  } catch (err) {
    console.error("Auto generate PO error:", err.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ---------- Wards & beds ----------

app.get("/api/wards", requireTenantUser, async (req, res) => {
  try {
    const { hospitalId } = req.session.user;
    const [wards] = await pool.query(`SELECT id, name FROM wards WHERE hospital_id = ? ORDER BY name`, [
      hospitalId,
    ]);
    const [beds] = await pool.query(
      `SELECT id, ward_id, bed_number, status FROM beds WHERE hospital_id = ? ORDER BY bed_number`,
      [hospitalId]
    );
    const wardsWithBeds = wards.map((w) => ({ ...w, beds: beds.filter((b) => b.ward_id === w.id) }));
    res.json({ success: true, wards: wardsWithBeds });
  } catch (err) {
    console.error("Get wards error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

app.post("/api/wards", requireRole("nurse", "hospital_admin"), async (req, res) => {
  const { name } = req.body || {};
  if (!name) {
    return res.status(400).json({ success: false, message: "Ward name is required." });
  }
  try {
    const [result] = await pool.query(
      `INSERT INTO wards (hospital_id, name, created_by) VALUES (?, ?, ?)`,
      [req.session.user.hospitalId, name, req.session.user.userId]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error("Create ward error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

app.post("/api/wards/:wardId/beds", requireRole("nurse", "hospital_admin"), async (req, res) => {
  const { bedNumber } = req.body || {};
  if (!bedNumber) {
    return res.status(400).json({ success: false, message: "Bed number is required." });
  }
  try {
    const [result] = await pool.query(
      `INSERT INTO beds (hospital_id, ward_id, bed_number) VALUES (?, ?, ?)`,
      [req.session.user.hospitalId, req.params.wardId, bedNumber]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error("Create bed error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

app.get("/api/beds/available", requireTenantUser, async (req, res) => {
  try {
    const { hospitalId } = req.session.user;
    const [rows] = await pool.query(
      `SELECT b.id, b.bed_number, w.id AS ward_id, w.name AS ward_name
       FROM beds b JOIN wards w ON w.id = b.ward_id
       WHERE b.hospital_id = ? AND b.status = 'available' ORDER BY w.name, b.bed_number`,
      [hospitalId]
    );
    res.json({ success: true, beds: rows });
  } catch (err) {
    console.error("Get available beds error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

// ---------- Nurse shift roster (ward_based assignment mode) ----------

app.get("/api/nurse-roster", requireRole("hospital_admin"), async (req, res) => {
  try {
    const { hospitalId } = req.session.user;
    const [rows] = await pool.query(
      `SELECT r.id, r.nurse_user_id, u.full_name AS nurse_name, r.ward_id, w.name AS ward_name,
              r.shift, r.day_of_week
       FROM nurse_shift_roster r
       LEFT JOIN users u ON u.user_id = r.nurse_user_id
       LEFT JOIN wards w ON w.id = r.ward_id
       WHERE r.hospital_id = ?
       ORDER BY r.day_of_week, r.shift, w.name`,
      [hospitalId]
    );
    res.json({ success: true, roster: rows });
  } catch (err) {
    console.error("List nurse roster error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

app.post("/api/nurse-roster", requireRole("hospital_admin"), async (req, res) => {
  const { nurseUserId, wardId, shift, dayOfWeek } = req.body || {};
  if (!nurseUserId || !wardId || !shift || dayOfWeek === undefined || dayOfWeek === null) {
    return res.status(400).json({
      success: false,
      message: "Nurse, ward, shift, and day are required.",
    });
  }
  try {
    const [result] = await pool.query(
      `INSERT INTO nurse_shift_roster (hospital_id, nurse_user_id, ward_id, shift, day_of_week)
       VALUES (?, ?, ?, ?, ?)`,
      [req.session.user.hospitalId, nurseUserId, wardId, shift, dayOfWeek]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error("Create nurse roster entry error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

app.delete("/api/nurse-roster/:id", requireRole("hospital_admin"), async (req, res) => {
  try {
    await pool.query(`DELETE FROM nurse_shift_roster WHERE id = ? AND hospital_id = ?`, [
      req.params.id,
      req.session.user.hospitalId,
    ]);
    res.json({ success: true });
  } catch (err) {
    console.error("Delete nurse roster entry error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

// ---------- Doctor-nurse teams (doctor_team assignment mode) ----------

app.get("/api/doctor-nurse-teams", requireRole("hospital_admin"), async (req, res) => {
  try {
    const { hospitalId } = req.session.user;
    const [rows] = await pool.query(
      `SELECT t.id, t.doctor_user_id, d.full_name AS doctor_name, t.nurse_user_id, n.full_name AS nurse_name
       FROM doctor_nurse_teams t
       LEFT JOIN users d ON d.user_id = t.doctor_user_id
       LEFT JOIN users n ON n.user_id = t.nurse_user_id
       WHERE t.hospital_id = ?
       ORDER BY d.full_name, n.full_name`,
      [hospitalId]
    );
    res.json({ success: true, teams: rows });
  } catch (err) {
    console.error("List doctor-nurse teams error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

app.post("/api/doctor-nurse-teams", requireRole("hospital_admin"), async (req, res) => {
  const { doctorUserId, nurseUserId } = req.body || {};
  if (!doctorUserId || !nurseUserId) {
    return res.status(400).json({ success: false, message: "Doctor and nurse are required." });
  }
  try {
    const [result] = await pool.query(
      `INSERT INTO doctor_nurse_teams (hospital_id, doctor_user_id, nurse_user_id) VALUES (?, ?, ?)`,
      [req.session.user.hospitalId, doctorUserId, nurseUserId]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error("Create doctor-nurse team error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

app.delete("/api/doctor-nurse-teams/:id", requireRole("hospital_admin"), async (req, res) => {
  try {
    await pool.query(`DELETE FROM doctor_nurse_teams WHERE id = ? AND hospital_id = ?`, [
      req.params.id,
      req.session.user.hospitalId,
    ]);
    res.json({ success: true });
  } catch (err) {
    console.error("Delete doctor-nurse team error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

// ---------- IPD admissions ----------

app.post("/api/ipd/admissions", requireReceptionistOrAdmin, async (req, res) => {
  const { patientUhid, admittingDoctorUserId, consentObtained, idProofNote } = req.body || {};
  if (!patientUhid) {
    return res.status(400).json({ success: false, message: "Patient is required." });
  }
  try {
    const { hospitalId } = req.session.user;
    const [existing] = await pool.query(
      `SELECT id FROM ipd_admissions WHERE hospital_id = ? AND patient_uhid = ? AND status IN ('requested', 'admitted') LIMIT 1`,
      [hospitalId, patientUhid]
    );
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "This patient already has an active or pending admission.",
      });
    }

    const [result] = await pool.query(
      `INSERT INTO ipd_admissions
        (hospital_id, patient_uhid, admitting_doctor_user_id, consent_obtained, id_proof_note, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        hospitalId,
        patientUhid,
        admittingDoctorUserId || null,
        !!consentObtained,
        idProofNote || null,
        req.session.user.userId,
      ]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error("Create admission error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

app.get("/api/ipd/admissions", requireTenantUser, async (req, res) => {
  const { status } = req.query;
  // Nurses can only ever list their own patients; other roles may pass assignedNurseId for oversight.
  const assignedNurseId =
    req.session.user.role === "nurse" ? req.session.user.userId : req.query.assignedNurseId;
  try {
    const { hospitalId } = req.session.user;
    let query = `SELECT a.id, a.patient_uhid, a.admitting_doctor_user_id, a.ward_id, a.bed_id, a.status,
                        a.assigned_nurse_id, a.created_at, a.admitted_at, p.full_name AS patient_name,
                        u.full_name AS doctor_name, w.name AS ward_name, b.bed_number
                 FROM ipd_admissions a
                 LEFT JOIN patients p ON p.uhid = a.patient_uhid
                 LEFT JOIN users u ON u.user_id = a.admitting_doctor_user_id
                 LEFT JOIN wards w ON w.id = a.ward_id
                 LEFT JOIN beds b ON b.id = a.bed_id
                 WHERE a.hospital_id = ?`;
    const params = [hospitalId];
    if (status) {
      query += " AND a.status = ?";
      params.push(status);
    }
    if (assignedNurseId) {
      query += " AND a.assigned_nurse_id = ?";
      params.push(assignedNurseId);
    }
    query += " ORDER BY a.created_at DESC";

    const [rows] = await pool.query(query, params);
    res.json({ success: true, admissions: rows });
  } catch (err) {
    console.error("List admissions error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

app.get("/api/ipd/admissions/:id", requireTenantUser, async (req, res) => {
  try {
    const { hospitalId } = req.session.user;
    const [rows] = await pool.query(
      `SELECT a.*, p.full_name AS patient_name, u.full_name AS doctor_name,
              w.name AS ward_name, b.bed_number
       FROM ipd_admissions a
       LEFT JOIN patients p ON p.uhid = a.patient_uhid
       LEFT JOIN users u ON u.user_id = a.admitting_doctor_user_id
       LEFT JOIN wards w ON w.id = a.ward_id
       LEFT JOIN beds b ON b.id = a.bed_id
       WHERE a.id = ? AND a.hospital_id = ? LIMIT 1`,
      [req.params.id, hospitalId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Admission not found." });
    }

    const [orders] = await pool.query(
      `SELECT id, order_type, description, ordered_by, created_at
       FROM doctor_orders WHERE hospital_id = ? AND ipd_admission_id = ? ORDER BY created_at DESC`,
      [hospitalId, req.params.id]
    );
    const [mar] = await pool.query(
      `SELECT id, medicine_name, dose, administered_by, administered_at, notes
       FROM medication_administration WHERE hospital_id = ? AND ipd_admission_id = ? ORDER BY administered_at DESC`,
      [hospitalId, req.params.id]
    );
    const [notes] = await pool.query(
      `SELECT id, note_type, message, flagged_by, created_at
       FROM ipd_notes WHERE hospital_id = ? AND ipd_admission_id = ? ORDER BY created_at DESC`,
      [hospitalId, req.params.id]
    );
    const [vitals] = await pool.query(
      `SELECT id, bp, temperature, weight, spo2, recorded_by, recorded_at
       FROM vitals WHERE hospital_id = ? AND ipd_admission_id = ? ORDER BY recorded_at DESC`,
      [hospitalId, req.params.id]
    );

    res.json({ success: true, admission: rows[0], orders, mar, notes, vitals });
  } catch (err) {
    console.error("Get admission error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

app.post("/api/ipd/admissions/:id/allocate-bed", requireRole("nurse", "hospital_admin"), async (req, res) => {
  const { bedId } = req.body || {};
  if (!bedId) {
    return res.status(400).json({ success: false, message: "Bed is required." });
  }
  try {
    const { hospitalId } = req.session.user;
    const [bedRows] = await pool.query(
      `SELECT ward_id, status FROM beds WHERE id = ? AND hospital_id = ? LIMIT 1`,
      [bedId, hospitalId]
    );
    if (bedRows.length === 0) {
      return res.status(404).json({ success: false, message: "Bed not found." });
    }
    if (bedRows[0].status !== "available") {
      return res.status(409).json({ success: false, message: "That bed is no longer available." });
    }

    await pool.query(
      `UPDATE ipd_admissions SET ward_id = ?, bed_id = ?, status = 'admitted', admitted_at = NOW() WHERE id = ? AND hospital_id = ?`,
      [bedRows[0].ward_id, bedId, req.params.id, hospitalId]
    );
    await pool.query(`UPDATE beds SET status = 'occupied' WHERE id = ? AND hospital_id = ?`, [
      bedId,
      hospitalId,
    ]);

    const nurseAssignment = await assignNurseForAdmission(pool, hospitalId, req.params.id);

    res.json({ success: true, nurseAssignment });
  } catch (err) {
    console.error("Allocate bed error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

// ---------- Doctor orders ----------

app.post("/api/ipd/admissions/:id/orders", requireRole("doctor"), async (req, res) => {
  const { orderType, description } = req.body || {};
  if (!["test", "medicine", "procedure", "nursing_instruction"].includes(orderType) || !description) {
    return res.status(400).json({
      success: false,
      message: "A valid order type and description are required.",
    });
  }
  try {
    await pool.query(
      `INSERT INTO doctor_orders (hospital_id, ipd_admission_id, order_type, description, ordered_by)
       VALUES (?, ?, ?, ?, ?)`,
      [req.session.user.hospitalId, req.params.id, orderType, description, req.session.user.userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Create order error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

// ---------- Medication administration (MAR) ----------

app.post("/api/ipd/admissions/:id/mar", requireRole("nurse"), async (req, res) => {
  const { medicineName, dose, notes, doctorOrderId } = req.body || {};
  if (!medicineName) {
    return res.status(400).json({ success: false, message: "Medicine name is required." });
  }
  try {
    await pool.query(
      `INSERT INTO medication_administration
        (hospital_id, ipd_admission_id, doctor_order_id, medicine_name, dose, administered_by, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.session.user.hospitalId,
        req.params.id,
        doctorOrderId || null,
        medicineName,
        dose || null,
        req.session.user.userId,
        notes || null,
      ]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Log MAR error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

// ---------- IPD notes / complication feed ----------

app.post("/api/ipd/admissions/:id/notes", requireRole("doctor", "nurse"), async (req, res) => {
  const { noteType, message } = req.body || {};
  if (!message) {
    return res.status(400).json({ success: false, message: "Note message is required." });
  }
  const finalNoteType = noteType || (req.session.user.role === "doctor" ? "doctor_round" : "general");
  try {
    await pool.query(
      `INSERT INTO ipd_notes (hospital_id, ipd_admission_id, note_type, message, flagged_by)
       VALUES (?, ?, ?, ?, ?)`,
      [req.session.user.hospitalId, req.params.id, finalNoteType, message, req.session.user.userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Create note error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

// ---------- Vitals ----------

app.post("/api/vitals", requireRole("nurse", "hospital_admin"), async (req, res) => {
  const { patientUhid, opdVisitId, ipdAdmissionId, bp, temperature, weight, spo2 } = req.body || {};
  if (!patientUhid || (!opdVisitId && !ipdAdmissionId)) {
    return res.status(400).json({
      success: false,
      message: "Patient and either an OPD visit or IPD admission are required.",
    });
  }
  try {
    await pool.query(
      `INSERT INTO vitals
        (hospital_id, patient_uhid, opd_visit_id, ipd_admission_id, bp, temperature, weight, spo2, recorded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.session.user.hospitalId,
        patientUhid,
        opdVisitId || null,
        ipdAdmissionId || null,
        bp || null,
        temperature || null,
        weight || null,
        spo2 || null,
        req.session.user.userId,
      ]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Log vitals error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

app.get("/api/vitals", requireTenantUser, async (req, res) => {
  const { opdVisitId, ipdAdmissionId } = req.query;
  try {
    const { hospitalId } = req.session.user;
    let query = `SELECT id, bp, temperature, weight, spo2, recorded_by, recorded_at FROM vitals WHERE hospital_id = ? AND `;
    const params = [hospitalId];

    if (opdVisitId) {
      query += "opd_visit_id = ?";
      params.push(opdVisitId);
    } else if (ipdAdmissionId) {
      query += "ipd_admission_id = ?";
      params.push(ipdAdmissionId);
    } else {
      return res.status(400).json({ success: false, message: "opdVisitId or ipdAdmissionId is required." });
    }
    query += " ORDER BY recorded_at DESC";

    const [rows] = await pool.query(query, params);
    res.json({ success: true, vitals: rows });
  } catch (err) {
    console.error("Get vitals error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

app.post("/api/hospitals", requireSuperadmin, async (req, res) => {
  const {
    name,
    licenseNumber,
    pan,
    hfrId,
    address,
    city,
    state,
    pincode,
    bedCount,
    opdVolume,
    adminName,
    adminEmail,
    adminUserId: customAdminUserId,
    adminPassword: customAdminPassword,
    modules,
    dpdpConsent,
  } = req.body || {};

  if (!name || !adminEmail || !dpdpConsent) {
    return res.status(400).json({
      success: false,
      message: "Facility name, client admin email, and DPDP consent are required.",
    });
  }

  if (customAdminUserId && !/^[A-Za-z0-9_-]+$/.test(customAdminUserId)) {
    return res.status(400).json({
      success: false,
      message: "Admin User ID can only contain letters, numbers, hyphens, and underscores.",
    });
  }

  if (customAdminPassword && customAdminPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Admin password must be at least 6 characters.",
    });
  }

  try {
    const [existing] = await pool.query(
      `SELECT id FROM hospitals
       WHERE LOWER(name) = LOWER(?) AND LOWER(COALESCE(city, '')) = LOWER(COALESCE(?, ''))
       LIMIT 1`,
      [name, city || ""]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: `A hospital named "${name}" is already registered in ${city || "the same location"}. Use a different name or location.`,
      });
    }

    if (customAdminUserId) {
      const [takenRows] = await pool.query("SELECT user_id FROM user_directory WHERE user_id = ?", [
        customAdminUserId,
      ]);
      if (takenRows.length > 0) {
        return res.status(409).json({
          success: false,
          message: `Admin User ID "${customAdminUserId}" is already in use. Please choose a different one.`,
        });
      }
    }

    const [result] = await pool.query(
      `INSERT INTO hospitals
        (name, license_number, pan, hfr_id, address, city, state, pincode, bed_count, opd_volume,
         admin_name, admin_email, modules, dpdp_consent, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
      [
        name,
        licenseNumber || null,
        pan || null,
        hfrId || null,
        address || null,
        city || null,
        state || null,
        pincode || null,
        bedCount || null,
        opdVolume || null,
        adminName || null,
        adminEmail,
        JSON.stringify(modules || []),
        !!dpdpConsent,
        req.session.user.userId,
      ]
    );

    const hospitalId = result.insertId;

    let shortCode = buildShortCode(name);
    let suffix = 1;
    while (true) {
      const [codeRows] = await pool.query("SELECT id FROM hospitals WHERE short_code = ?", [shortCode]);
      if (codeRows.length === 0) break;
      suffix += 1;
      shortCode = `${buildShortCode(name)}${suffix}`;
    }

    const adminUserId = customAdminUserId || generateStaffUserId(ROLE_PREFIXES.hospital_admin, shortCode);
    const adminPassword = customAdminPassword || generateTempPassword();
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    await pool.query(
      `INSERT INTO users (hospital_id, user_id, password_hash, full_name, role)
       VALUES (?, ?, ?, ?, 'hospital_admin')`,
      [hospitalId, adminUserId, passwordHash, adminName || null]
    );

    await pool.query("INSERT INTO user_directory (user_id, hospital_id) VALUES (?, ?)", [
      adminUserId,
      hospitalId,
    ]);

    await pool.query("UPDATE hospitals SET short_code = ?, admin_user_id = ? WHERE id = ?", [
      shortCode,
      adminUserId,
      hospitalId,
    ]);

    await seedTestCatalog(pool, hospitalId);

    console.log(`[hospital] "${name}" registered (hospital_id ${hospitalId}). Admin login: ${adminUserId}`);

    res.json({
      success: true,
      hospitalId,
      shortCode,
      admin: { userId: adminUserId, password: adminPassword },
    });
  } catch (err) {
    console.error("Create hospital error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

app.delete("/api/hospitals/:id", requireSuperadmin, async (req, res) => {
  try {
    const hospitalId = req.params.id;
    const [rows] = await pool.query("SELECT name FROM hospitals WHERE id = ? LIMIT 1", [hospitalId]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Hospital not found." });
    }

    // Every hospital-scoped table, deleted by hospital_id now that all tenants share one database.
    const scopedTables = [
      "doctor_nurse_teams",
      "nurse_shift_roster",
      "medication_administration",
      "doctor_orders",
      "ipd_notes",
      "vitals",
      "lab_orders",
      "consultations",
      "ipd_admissions",
      "opd_visits",
      "beds",
      "wards",
      "doctor_schedules",
      "doctor_calendar_availability",
      "test_catalog",
      "patients",
      "users",
      "departments",
    ];
    for (const table of scopedTables) {
      await pool.query(`DELETE FROM \`${table}\` WHERE hospital_id = ?`, [hospitalId]);
    }

    await pool.query("DELETE FROM user_directory WHERE hospital_id = ?", [hospitalId]);
    await pool.query("DELETE FROM hospitals WHERE id = ?", [hospitalId]);

    res.json({ success: true });
  } catch (err) {
    console.error("Delete hospital error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

const PORT = process.env.PORT || 3000;

async function start() {
  const connection = await pool.getConnection();
  try {
    await ensureSchema(connection);

    const [hospitals] = await connection.query("SELECT id, admin_user_id FROM hospitals");
    for (const hospital of hospitals) {
      await seedTestCatalog(connection, hospital.id);
    }

    await connection.query(
      `INSERT IGNORE INTO user_directory (user_id, hospital_id)
       SELECT admin_user_id, id FROM hospitals WHERE admin_user_id IS NOT NULL`
    );
  } finally {
    connection.release();
  }

  app.listen(PORT, () => {
    console.log(`MEDISYS server running at http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err.message);
  process.exit(1);
});
