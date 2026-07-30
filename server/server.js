require("dotenv").config({ quiet: true });
const path = require("path");
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const bcrypt = require("bcrypt");
const pool = require("./db");
const { ensureSchema, ensureTenantSchema, buildTenantDbName } = require("./schema");
const { buildShortCode, generateStaffUserId, generateTempPassword, generateUhid } = require("./credentials");
const { ROLE_PREFIXES, ROLE_LABELS, STAFF_ROLES, DESIGNATION_PREFIXES } = require("./roles");
const { computeAvailableSlots } = require("./slots");

const TENANT_DB_NAME_PATTERN = /^medisys_h\d+_[a-z0-9_]+$/;

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
      "SELECT hospital_id, db_name, account_type FROM user_directory WHERE user_id = ? LIMIT 1",
      [userId]
    );

    if (directoryRows.length > 0) {
      const { hospital_id: hospitalId, db_name: dbName, account_type: accountType } = directoryRows[0];

      const [hospitalRows] = await pool.query("SELECT name FROM hospitals WHERE id = ? LIMIT 1", [
        hospitalId,
      ]);

      if (hospitalRows.length === 0) {
        return res.status(401).json({ success: false, message: "Invalid User ID or password." });
      }

      if (accountType === "patient") {
        const [patientRows] = await pool.query(
          `SELECT uhid, password_hash, full_name FROM \`${dbName}\`.patients WHERE uhid = ? LIMIT 1`,
          [userId]
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
          dbName,
        };

        return res.json({ success: true, user: req.session.user });
      }

      const [userRows] = await pool.query(
        `SELECT user_id, password_hash, full_name, role FROM \`${dbName}\`.users WHERE user_id = ? LIMIT 1`,
        [userId]
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
        hospitalId,
        hospitalName: hospitalRows[0].name,
        dbName,
      };

      return res.json({ success: true, user: req.session.user });
    }

    const [rows] = await pool.query(
      "SELECT user_id, password_hash, full_name, role FROM users WHERE user_id = ? LIMIT 1",
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
      `SELECT id, name, city, state, bed_count, status, admin_name, admin_email, short_code, admin_user_id, db_name, created_at
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
              status, short_code, admin_user_id, db_name, created_at
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
      "SELECT name, status, modules FROM hospitals WHERE id = ? LIMIT 1",
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

app.get("/api/me", requireTenantUser, (req, res) => {
  const { fullName, role, hospitalName } = req.session.user;
  res.json({ success: true, profile: { fullName, role, roleLabel: ROLE_LABELS[role] || role, hospitalName } });
});

app.get("/api/hospital/staff", requireHospitalAdmin, async (req, res) => {
  try {
    const { dbName } = req.session.user;
    const [rows] = await pool.query(
      `SELECT u.id, u.user_id, u.full_name, u.email, u.phone, u.role, u.details, u.created_at,
              d.name AS department_name
       FROM \`${dbName}\`.users u
       LEFT JOIN \`${dbName}\`.departments d ON d.id = u.department_id
       WHERE u.role != 'hospital_admin'
       ORDER BY u.role, u.full_name`
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

    const { hospitalId, dbName } = req.session.user;
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
      `INSERT INTO \`${dbName}\`.users (user_id, password_hash, full_name, role, email, phone, details, department_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
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

    await pool.query("INSERT INTO user_directory (user_id, hospital_id, db_name) VALUES (?, ?, ?)", [
      userId,
      hospitalId,
      dbName,
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
       FROM \`${req.session.user.dbName}\`.patients
       WHERE full_name LIKE ? OR phone LIKE ? OR uhid LIKE ? OR abha_id = ?
       ORDER BY created_at DESC
       LIMIT 20`,
      [like, like, like, q]
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
       FROM \`${req.session.user.dbName}\`.patients WHERE uhid = ? LIMIT 1`,
      [req.params.uhid]
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
    const { hospitalId, dbName, userId } = req.session.user;

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
      `INSERT INTO \`${dbName}\`.patients
        (uhid, password_hash, full_name, dob, gender, phone, address, emergency_contact_name,
         emergency_contact_phone, abha_id, category, registered_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
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
      await pool.query(`UPDATE \`${dbName}\`.patients SET uhid = ? WHERE id = ?`, [uhid, result.insertId]);
    }

    await pool.query(
      "INSERT INTO user_directory (user_id, hospital_id, db_name, account_type) VALUES (?, ?, ?, 'patient')",
      [uhid, hospitalId, dbName]
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

// ---------- Doctor schedule ----------

app.get("/api/doctor/schedule", requireRole("doctor"), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, day_of_week, start_time, end_time, slot_minutes
       FROM \`${req.session.user.dbName}\`.doctor_schedules
       WHERE doctor_user_id = ? ORDER BY day_of_week, start_time`,
      [req.session.user.userId]
    );
    res.json({ success: true, schedule: rows });
  } catch (err) {
    console.error("Get schedule error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

app.post("/api/doctor/schedule", requireRole("doctor"), async (req, res) => {
  const { dayOfWeek, startTime, endTime, slotMinutes } = req.body || {};
  if (dayOfWeek === undefined || dayOfWeek === null || !startTime || !endTime) {
    return res.status(400).json({ success: false, message: "Day, start time, and end time are required." });
  }
  if (endTime <= startTime) {
    return res.status(400).json({
      success: false,
      message: "End time must be after start time (use 23:45 for end-of-day, not 00:00).",
    });
  }
  try {
    const [result] = await pool.query(
      `INSERT INTO \`${req.session.user.dbName}\`.doctor_schedules
        (doctor_user_id, day_of_week, start_time, end_time, slot_minutes)
       VALUES (?, ?, ?, ?, ?)`,
      [req.session.user.userId, dayOfWeek, startTime, endTime, slotMinutes || 15]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error("Create schedule error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

app.delete("/api/doctor/schedule/:id", requireRole("doctor"), async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM \`${req.session.user.dbName}\`.doctor_schedules WHERE id = ? AND doctor_user_id = ?`,
      [req.params.id, req.session.user.userId]
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
      `SELECT id, name FROM \`${req.session.user.dbName}\`.departments ORDER BY name`
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
      `INSERT INTO \`${req.session.user.dbName}\`.departments (name, created_by) VALUES (?, ?)`,
      [name, req.session.user.userId]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error("Create department error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

app.delete("/api/departments/:id", requireRole("hospital_admin"), async (req, res) => {
  try {
    const { dbName } = req.session.user;
    await pool.query(`UPDATE \`${dbName}\`.users SET department_id = NULL WHERE department_id = ?`, [
      req.params.id,
    ]);
    await pool.query(`DELETE FROM \`${dbName}\`.departments WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error("Delete department error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

app.get("/api/opd/doctors", requireTenantUser, async (req, res) => {
  const { departmentId } = req.query;
  try {
    const { dbName } = req.session.user;
    let query = `SELECT u.user_id, u.full_name, u.details, u.department_id, d.name AS department_name
                 FROM \`${dbName}\`.users u
                 LEFT JOIN \`${dbName}\`.departments d ON d.id = u.department_id
                 WHERE u.role = 'doctor'`;
    const params = [];
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
    const { dbName } = req.session.user;
    const dayOfWeek = new Date(`${date}T00:00:00`).getDay();

    const [scheduleRows] = await pool.query(
      `SELECT start_time, end_time, slot_minutes FROM \`${dbName}\`.doctor_schedules
       WHERE doctor_user_id = ? AND day_of_week = ?`,
      [doctorUserId, dayOfWeek]
    );
    const [bookedRows] = await pool.query(
      `SELECT slot_time FROM \`${dbName}\`.opd_visits
       WHERE doctor_user_id = ? AND visit_date = ? AND slot_time IS NOT NULL`,
      [doctorUserId, date]
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
  const { patientUhid, doctorUserId, visitDate, slotTime } = req.body || {};
  if (!patientUhid || !doctorUserId || !visitDate) {
    return res.status(400).json({ success: false, message: "Patient, doctor, and date are required." });
  }

  try {
    const { dbName, userId } = req.session.user;

    if (slotTime) {
      const [conflict] = await pool.query(
        `SELECT id FROM \`${dbName}\`.opd_visits WHERE doctor_user_id = ? AND visit_date = ? AND slot_time = ?`,
        [doctorUserId, visitDate, slotTime]
      );
      if (conflict.length > 0) {
        return res.status(409).json({
          success: false,
          message: "That slot has just been booked. Please pick another.",
        });
      }
    }

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM \`${dbName}\`.opd_visits WHERE visit_date = ?`,
      [visitDate]
    );
    const tokenNumber = countRows[0].cnt + 1;

    const [patientRows] = await pool.query(`SELECT phone FROM \`${dbName}\`.patients WHERE uhid = ? LIMIT 1`, [
      patientUhid,
    ]);
    const patientPhone = patientRows[0]?.phone;
    const source = slotTime ? "appointment" : "walk-in";

    const [result] = await pool.query(
      `INSERT INTO \`${dbName}\`.opd_visits
        (token_number, patient_uhid, doctor_user_id, visit_date, slot_time, source, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, 'waiting', ?)`,
      [tokenNumber, patientUhid, doctorUserId, visitDate, slotTime || null, source, userId]
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
  const visitDate = date || new Date().toISOString().slice(0, 10);

  try {
    const { dbName } = req.session.user;
    let query = `SELECT v.id, v.token_number, v.patient_uhid, v.doctor_user_id, v.visit_date, v.slot_time,
                        v.source, v.status, p.full_name AS patient_name, u.full_name AS doctor_name
                 FROM \`${dbName}\`.opd_visits v
                 LEFT JOIN \`${dbName}\`.patients p ON p.uhid = v.patient_uhid
                 LEFT JOIN \`${dbName}\`.users u ON u.user_id = v.doctor_user_id
                 WHERE v.visit_date = ?`;
    const params = [visitDate];

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
    await pool.query(`UPDATE \`${req.session.user.dbName}\`.opd_visits SET status = ? WHERE id = ?`, [
      status,
      req.params.id,
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
    const { dbName } = req.session.user;
    const [consultations] = await pool.query(
      `SELECT c.id, c.symptoms, c.notes, c.decision, c.created_at, u.full_name AS doctor_name
       FROM \`${dbName}\`.consultations c
       LEFT JOIN \`${dbName}\`.users u ON u.user_id = c.doctor_user_id
       WHERE c.patient_uhid = ? ORDER BY c.created_at DESC`,
      [req.params.uhid]
    );
    const [admissions] = await pool.query(
      `SELECT id, status, admission_notes, created_at, admitted_at
       FROM \`${dbName}\`.ipd_admissions WHERE patient_uhid = ? ORDER BY created_at DESC`,
      [req.params.uhid]
    );
    res.json({ success: true, history: { consultations, admissions } });
  } catch (err) {
    console.error("Get patient history error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

// ---------- Consultation (doctor decision point) ----------

app.post("/api/opd/visits/:id/consultation", requireRole("doctor"), async (req, res) => {
  const { symptoms, notes, decision } = req.body || {};
  if (!["prescribe", "order_tests", "admit"].includes(decision)) {
    return res.status(400).json({ success: false, message: "A valid decision is required." });
  }

  try {
    const { dbName, userId } = req.session.user;
    const [visitRows] = await pool.query(
      `SELECT patient_uhid FROM \`${dbName}\`.opd_visits WHERE id = ? LIMIT 1`,
      [req.params.id]
    );
    if (visitRows.length === 0) {
      return res.status(404).json({ success: false, message: "Visit not found." });
    }
    const patientUhid = visitRows[0].patient_uhid;

    await pool.query(
      `INSERT INTO \`${dbName}\`.consultations (opd_visit_id, patient_uhid, doctor_user_id, symptoms, notes, decision)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.params.id, patientUhid, userId, symptoms || null, notes || null, decision]
    );
    await pool.query(`UPDATE \`${dbName}\`.opd_visits SET status = 'completed' WHERE id = ?`, [req.params.id]);

    let admissionId = null;
    let admissionAlreadyExisted = false;
    if (decision === "admit") {
      const [existing] = await pool.query(
        `SELECT id FROM \`${dbName}\`.ipd_admissions
         WHERE patient_uhid = ? AND status IN ('requested', 'admitted') LIMIT 1`,
        [patientUhid]
      );

      if (existing.length > 0) {
        admissionId = existing[0].id;
        admissionAlreadyExisted = true;
      } else {
        const [admissionResult] = await pool.query(
          `INSERT INTO \`${dbName}\`.ipd_admissions (patient_uhid, admitting_doctor_user_id, opd_visit_id, created_by)
           VALUES (?, ?, ?, ?)`,
          [patientUhid, userId, req.params.id, userId]
        );
        admissionId = admissionResult.insertId;
      }
    }

    res.json({ success: true, admissionId, admissionAlreadyExisted });
  } catch (err) {
    console.error("Record consultation error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

// ---------- Wards & beds ----------

app.get("/api/wards", requireTenantUser, async (req, res) => {
  try {
    const { dbName } = req.session.user;
    const [wards] = await pool.query(`SELECT id, name FROM \`${dbName}\`.wards ORDER BY name`);
    const [beds] = await pool.query(
      `SELECT id, ward_id, bed_number, status FROM \`${dbName}\`.beds ORDER BY bed_number`
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
      `INSERT INTO \`${req.session.user.dbName}\`.wards (name, created_by) VALUES (?, ?)`,
      [name, req.session.user.userId]
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
      `INSERT INTO \`${req.session.user.dbName}\`.beds (ward_id, bed_number) VALUES (?, ?)`,
      [req.params.wardId, bedNumber]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error("Create bed error:", err.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

app.get("/api/beds/available", requireTenantUser, async (req, res) => {
  try {
    const { dbName } = req.session.user;
    const [rows] = await pool.query(
      `SELECT b.id, b.bed_number, w.id AS ward_id, w.name AS ward_name
       FROM \`${dbName}\`.beds b JOIN \`${dbName}\`.wards w ON w.id = b.ward_id
       WHERE b.status = 'available' ORDER BY w.name, b.bed_number`
    );
    res.json({ success: true, beds: rows });
  } catch (err) {
    console.error("Get available beds error:", err.message);
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
    const { dbName } = req.session.user;
    const [existing] = await pool.query(
      `SELECT id FROM \`${dbName}\`.ipd_admissions WHERE patient_uhid = ? AND status IN ('requested', 'admitted') LIMIT 1`,
      [patientUhid]
    );
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "This patient already has an active or pending admission.",
      });
    }

    const [result] = await pool.query(
      `INSERT INTO \`${dbName}\`.ipd_admissions
        (patient_uhid, admitting_doctor_user_id, consent_obtained, id_proof_note, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [
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
  try {
    const { dbName } = req.session.user;
    let query = `SELECT a.id, a.patient_uhid, a.admitting_doctor_user_id, a.ward_id, a.bed_id, a.status,
                        a.created_at, a.admitted_at, p.full_name AS patient_name, u.full_name AS doctor_name,
                        w.name AS ward_name, b.bed_number
                 FROM \`${dbName}\`.ipd_admissions a
                 LEFT JOIN \`${dbName}\`.patients p ON p.uhid = a.patient_uhid
                 LEFT JOIN \`${dbName}\`.users u ON u.user_id = a.admitting_doctor_user_id
                 LEFT JOIN \`${dbName}\`.wards w ON w.id = a.ward_id
                 LEFT JOIN \`${dbName}\`.beds b ON b.id = a.bed_id`;
    const params = [];
    if (status) {
      query += " WHERE a.status = ?";
      params.push(status);
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
    const { dbName } = req.session.user;
    const [rows] = await pool.query(
      `SELECT a.*, p.full_name AS patient_name, u.full_name AS doctor_name,
              w.name AS ward_name, b.bed_number
       FROM \`${dbName}\`.ipd_admissions a
       LEFT JOIN \`${dbName}\`.patients p ON p.uhid = a.patient_uhid
       LEFT JOIN \`${dbName}\`.users u ON u.user_id = a.admitting_doctor_user_id
       LEFT JOIN \`${dbName}\`.wards w ON w.id = a.ward_id
       LEFT JOIN \`${dbName}\`.beds b ON b.id = a.bed_id
       WHERE a.id = ? LIMIT 1`,
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Admission not found." });
    }

    const [orders] = await pool.query(
      `SELECT id, order_type, description, ordered_by, created_at
       FROM \`${dbName}\`.doctor_orders WHERE ipd_admission_id = ? ORDER BY created_at DESC`,
      [req.params.id]
    );
    const [mar] = await pool.query(
      `SELECT id, medicine_name, dose, administered_by, administered_at, notes
       FROM \`${dbName}\`.medication_administration WHERE ipd_admission_id = ? ORDER BY administered_at DESC`,
      [req.params.id]
    );
    const [notes] = await pool.query(
      `SELECT id, note_type, message, flagged_by, created_at
       FROM \`${dbName}\`.ipd_notes WHERE ipd_admission_id = ? ORDER BY created_at DESC`,
      [req.params.id]
    );
    const [vitals] = await pool.query(
      `SELECT id, bp, temperature, weight, spo2, recorded_by, recorded_at
       FROM \`${dbName}\`.vitals WHERE ipd_admission_id = ? ORDER BY recorded_at DESC`,
      [req.params.id]
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
    const { dbName } = req.session.user;
    const [bedRows] = await pool.query(`SELECT ward_id, status FROM \`${dbName}\`.beds WHERE id = ? LIMIT 1`, [
      bedId,
    ]);
    if (bedRows.length === 0) {
      return res.status(404).json({ success: false, message: "Bed not found." });
    }
    if (bedRows[0].status !== "available") {
      return res.status(409).json({ success: false, message: "That bed is no longer available." });
    }

    await pool.query(
      `UPDATE \`${dbName}\`.ipd_admissions SET ward_id = ?, bed_id = ?, status = 'admitted', admitted_at = NOW() WHERE id = ?`,
      [bedRows[0].ward_id, bedId, req.params.id]
    );
    await pool.query(`UPDATE \`${dbName}\`.beds SET status = 'occupied' WHERE id = ?`, [bedId]);

    res.json({ success: true });
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
      `INSERT INTO \`${req.session.user.dbName}\`.doctor_orders (ipd_admission_id, order_type, description, ordered_by)
       VALUES (?, ?, ?, ?)`,
      [req.params.id, orderType, description, req.session.user.userId]
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
      `INSERT INTO \`${req.session.user.dbName}\`.medication_administration
        (ipd_admission_id, doctor_order_id, medicine_name, dose, administered_by, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.params.id, doctorOrderId || null, medicineName, dose || null, req.session.user.userId, notes || null]
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
      `INSERT INTO \`${req.session.user.dbName}\`.ipd_notes (ipd_admission_id, note_type, message, flagged_by)
       VALUES (?, ?, ?, ?)`,
      [req.params.id, finalNoteType, message, req.session.user.userId]
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
      `INSERT INTO \`${req.session.user.dbName}\`.vitals
        (patient_uhid, opd_visit_id, ipd_admission_id, bp, temperature, weight, spo2, recorded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
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
    const { dbName } = req.session.user;
    let query = `SELECT id, bp, temperature, weight, spo2, recorded_by, recorded_at FROM \`${dbName}\`.vitals WHERE `;
    const params = [];

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
    const dbName = buildTenantDbName(hospitalId, name);
    await ensureTenantSchema(pool, dbName);

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
      `INSERT INTO \`${dbName}\`.users (user_id, password_hash, full_name, role)
       VALUES (?, ?, ?, 'hospital_admin')`,
      [adminUserId, passwordHash, adminName || null]
    );

    await pool.query("INSERT INTO user_directory (user_id, hospital_id, db_name) VALUES (?, ?, ?)", [
      adminUserId,
      hospitalId,
      dbName,
    ]);

    await pool.query(
      "UPDATE hospitals SET db_name = ?, short_code = ?, admin_user_id = ? WHERE id = ?",
      [dbName, shortCode, adminUserId, hospitalId]
    );

    console.log(`[hospital] "${name}" registered with database "${dbName}". Admin login: ${adminUserId}`);

    res.json({
      success: true,
      hospitalId,
      dbName,
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
    const [rows] = await pool.query("SELECT name, db_name FROM hospitals WHERE id = ? LIMIT 1", [
      req.params.id,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Hospital not found." });
    }

    const { db_name: dbName } = rows[0];

    if (dbName) {
      if (!TENANT_DB_NAME_PATTERN.test(dbName)) {
        console.error(`Refusing to drop database with unexpected name: ${dbName}`);
        return res.status(500).json({ success: false, message: "Server error. Please try again." });
      }
      await pool.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    }

    await pool.query("DELETE FROM user_directory WHERE hospital_id = ?", [req.params.id]);
    await pool.query("DELETE FROM hospitals WHERE id = ?", [req.params.id]);

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

    const [hospitals] = await connection.query(
      "SELECT id, db_name, admin_user_id FROM hospitals WHERE db_name IS NOT NULL"
    );
    for (const hospital of hospitals) {
      await ensureTenantSchema(connection, hospital.db_name);
    }

    await connection.query(
      `INSERT IGNORE INTO user_directory (user_id, hospital_id, db_name)
       SELECT admin_user_id, id, db_name FROM hospitals
       WHERE admin_user_id IS NOT NULL AND db_name IS NOT NULL`
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
