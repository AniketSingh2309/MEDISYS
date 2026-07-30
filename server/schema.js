async function ensureSchema(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(50) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(150),
      role VARCHAR(50) NOT NULL DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS hospitals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      license_number VARCHAR(100),
      pan VARCHAR(20),
      hfr_id VARCHAR(50),
      address VARCHAR(255),
      city VARCHAR(100),
      state VARCHAR(100),
      pincode VARCHAR(12),
      bed_count INT,
      opd_volume INT,
      admin_name VARCHAR(150),
      admin_email VARCHAR(150) NOT NULL,
      modules JSON,
      dpdp_consent BOOLEAN NOT NULL DEFAULT FALSE,
      status ENUM('pending_activation','active') NOT NULL DEFAULT 'pending_activation',
      invite_token VARCHAR(64),
      invite_sent_at TIMESTAMP NULL,
      db_name VARCHAR(150),
      short_code VARCHAR(10),
      admin_user_id VARCHAR(50),
      created_by VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS user_directory (
      user_id VARCHAR(50) PRIMARY KEY,
      hospital_id INT NOT NULL,
      db_name VARCHAR(150) NOT NULL,
      account_type VARCHAR(20) NOT NULL DEFAULT 'staff',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await ensureColumn(connection, "medisys_hmis", "hospitals", "db_name", "VARCHAR(150)");
  await ensureColumn(connection, "medisys_hmis", "hospitals", "short_code", "VARCHAR(10)");
  await ensureColumn(connection, "medisys_hmis", "hospitals", "admin_user_id", "VARCHAR(50)");
  await ensureColumn(connection, "medisys_hmis", "user_directory", "account_type", "VARCHAR(20) NOT NULL DEFAULT 'staff'");
}

async function ensureColumn(connection, schema, table, column, definition) {
  const [columns] = await connection.query(
    `SELECT COLUMN_NAME FROM information_schema.columns
     WHERE table_schema = ? AND table_name = ? AND COLUMN_NAME = ?`,
    [schema, table, column]
  );
  if (columns.length === 0) {
    await connection.query(`ALTER TABLE \`${schema}\`.\`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  }
}

async function ensureTenantSchema(connection, dbName) {
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  await connection.query(`
    CREATE TABLE IF NOT EXISTS \`${dbName}\`.users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(50) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(150),
      role VARCHAR(50) NOT NULL DEFAULT 'staff',
      email VARCHAR(150),
      phone VARCHAR(20),
      details JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await ensureColumn(connection, dbName, "users", "email", "VARCHAR(150)");
  await ensureColumn(connection, dbName, "users", "phone", "VARCHAR(20)");
  await ensureColumn(connection, dbName, "users", "details", "JSON");
  await ensureColumn(connection, dbName, "users", "department_id", "INT NULL");

  await connection.query(`
    CREATE TABLE IF NOT EXISTS \`${dbName}\`.departments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      created_by VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS \`${dbName}\`.patients (
      id INT AUTO_INCREMENT PRIMARY KEY,
      uhid VARCHAR(30) UNIQUE,
      password_hash VARCHAR(255),
      full_name VARCHAR(150) NOT NULL,
      dob DATE,
      gender VARCHAR(10),
      phone VARCHAR(20),
      address VARCHAR(255),
      emergency_contact_name VARCHAR(150),
      emergency_contact_phone VARCHAR(20),
      abha_id VARCHAR(50),
      category VARCHAR(20),
      registered_by VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await ensureColumn(connection, dbName, "patients", "password_hash", "VARCHAR(255)");

  await connection.query(`
    CREATE TABLE IF NOT EXISTS \`${dbName}\`.doctor_schedules (
      id INT AUTO_INCREMENT PRIMARY KEY,
      doctor_user_id VARCHAR(50) NOT NULL,
      day_of_week TINYINT NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      slot_minutes INT NOT NULL DEFAULT 15,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS \`${dbName}\`.wards (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      created_by VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS \`${dbName}\`.beds (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ward_id INT NOT NULL,
      bed_number VARCHAR(20) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'available',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS \`${dbName}\`.opd_visits (
      id INT AUTO_INCREMENT PRIMARY KEY,
      token_number INT NOT NULL,
      patient_uhid VARCHAR(30) NOT NULL,
      doctor_user_id VARCHAR(50) NOT NULL,
      visit_date DATE NOT NULL,
      slot_time TIME NULL,
      source VARCHAR(20) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'waiting',
      created_by VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS \`${dbName}\`.vitals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      patient_uhid VARCHAR(30) NOT NULL,
      opd_visit_id INT NULL,
      ipd_admission_id INT NULL,
      bp VARCHAR(20),
      temperature VARCHAR(10),
      weight VARCHAR(10),
      spo2 VARCHAR(10),
      recorded_by VARCHAR(50),
      recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS \`${dbName}\`.consultations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      opd_visit_id INT NOT NULL,
      patient_uhid VARCHAR(30) NOT NULL,
      doctor_user_id VARCHAR(50) NOT NULL,
      symptoms TEXT,
      notes TEXT,
      decision VARCHAR(20) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS \`${dbName}\`.ipd_admissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      patient_uhid VARCHAR(30) NOT NULL,
      admitting_doctor_user_id VARCHAR(50),
      ward_id INT NULL,
      bed_id INT NULL,
      consent_obtained BOOLEAN NOT NULL DEFAULT FALSE,
      id_proof_note VARCHAR(150),
      admission_notes TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'requested',
      opd_visit_id INT NULL,
      created_by VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      admitted_at TIMESTAMP NULL
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS \`${dbName}\`.doctor_orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ipd_admission_id INT NOT NULL,
      order_type VARCHAR(20) NOT NULL,
      description TEXT NOT NULL,
      ordered_by VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS \`${dbName}\`.medication_administration (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ipd_admission_id INT NOT NULL,
      doctor_order_id INT NULL,
      medicine_name VARCHAR(150) NOT NULL,
      dose VARCHAR(50),
      administered_by VARCHAR(50),
      administered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      notes VARCHAR(255)
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS \`${dbName}\`.ipd_notes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ipd_admission_id INT NOT NULL,
      note_type VARCHAR(20) NOT NULL,
      message TEXT NOT NULL,
      flagged_by VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

function buildTenantDbName(id, name) {
  const slug = String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return `medisys_h${id}_${slug}`.slice(0, 64);
}

module.exports = { ensureSchema, ensureTenantSchema, buildTenantDbName };
