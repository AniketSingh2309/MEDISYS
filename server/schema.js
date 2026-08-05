async function ensureSchema(connection) {
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
      short_code VARCHAR(10),
      admin_user_id VARCHAR(50),
      created_by VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

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
    CREATE TABLE IF NOT EXISTS user_directory (
      user_id VARCHAR(50) PRIMARY KEY,
      hospital_id INT NOT NULL,
      account_type VARCHAR(20) NOT NULL DEFAULT 'staff',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await ensureColumn(connection, "hospitals", "short_code", "VARCHAR(10)");
  await ensureColumn(connection, "hospitals", "admin_user_id", "VARCHAR(50)");
  await ensureColumn(
    connection,
    "hospitals",
    "nurse_assignment_mode",
    "ENUM('ward_based','doctor_team') NOT NULL DEFAULT 'ward_based'"
  );
  await ensureColumn(connection, "users", "email", "VARCHAR(150)");
  await ensureColumn(connection, "users", "phone", "VARCHAR(20)");
  await ensureColumn(connection, "users", "details", "JSON");
  await ensureColumn(connection, "users", "department_id", "INT NULL");
  await ensureColumn(connection, "users", "hospital_id", "INT NULL");

  await dropColumnIfExists(connection, "hospitals", "db_name");
  await dropColumnIfExists(connection, "user_directory", "db_name");

  await connection.query(`
    CREATE TABLE IF NOT EXISTS departments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      hospital_id INT NOT NULL,
      name VARCHAR(100) NOT NULL,
      created_by VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS patients (
      id INT AUTO_INCREMENT PRIMARY KEY,
      hospital_id INT NOT NULL,
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

  await connection.query(`
    CREATE TABLE IF NOT EXISTS doctor_schedules (
      id INT AUTO_INCREMENT PRIMARY KEY,
      hospital_id INT NOT NULL,
      doctor_user_id VARCHAR(50) NOT NULL,
      day_of_week TINYINT NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      slot_minutes INT NOT NULL DEFAULT 15,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS wards (
      id INT AUTO_INCREMENT PRIMARY KEY,
      hospital_id INT NOT NULL,
      name VARCHAR(100) NOT NULL,
      department_id INT NULL,
      created_by VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS beds (
      id INT AUTO_INCREMENT PRIMARY KEY,
      hospital_id INT NOT NULL,
      ward_id INT NOT NULL,
      bed_number VARCHAR(20) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'available',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS opd_visits (
      id INT AUTO_INCREMENT PRIMARY KEY,
      hospital_id INT NOT NULL,
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
    CREATE TABLE IF NOT EXISTS vitals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      hospital_id INT NOT NULL,
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
    CREATE TABLE IF NOT EXISTS consultations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      hospital_id INT NOT NULL,
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
    CREATE TABLE IF NOT EXISTS ipd_admissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      hospital_id INT NOT NULL,
      patient_uhid VARCHAR(30) NOT NULL,
      admitting_doctor_user_id VARCHAR(50),
      ward_id INT NULL,
      bed_id INT NULL,
      consent_obtained BOOLEAN NOT NULL DEFAULT FALSE,
      id_proof_note VARCHAR(150),
      admission_notes TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'requested',
      opd_visit_id INT NULL,
      assigned_nurse_id VARCHAR(50) NULL,
      created_by VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      admitted_at TIMESTAMP NULL
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS doctor_orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      hospital_id INT NOT NULL,
      ipd_admission_id INT NOT NULL,
      order_type VARCHAR(20) NOT NULL,
      description TEXT NOT NULL,
      ordered_by VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS medication_administration (
      id INT AUTO_INCREMENT PRIMARY KEY,
      hospital_id INT NOT NULL,
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
    CREATE TABLE IF NOT EXISTS ipd_notes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      hospital_id INT NOT NULL,
      ipd_admission_id INT NOT NULL,
      note_type VARCHAR(20) NOT NULL,
      message TEXT NOT NULL,
      flagged_by VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS test_catalog (
      id INT AUTO_INCREMENT PRIMARY KEY,
      hospital_id INT NOT NULL,
      name VARCHAR(150) NOT NULL,
      category VARCHAR(30) NOT NULL,
      department VARCHAR(50),
      sample_type VARCHAR(50),
      price DECIMAL(10,2) NOT NULL DEFAULT 0,
      turnaround_hours INT NOT NULL DEFAULT 24,
      is_panel BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS lab_orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      hospital_id INT NOT NULL,
      opd_visit_id INT NULL,
      ipd_admission_id INT NULL,
      patient_uhid VARCHAR(30) NOT NULL,
      test_id INT NOT NULL,
      doctor_user_id VARCHAR(50) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      assigned_to VARCHAR(50) NULL,
      result_notes TEXT NULL,
      result_file_path VARCHAR(255) NULL,
      result_file_name VARCHAR(255) NULL,
      completed_by VARCHAR(50) NULL,
      completed_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`CREATE DATABASE IF NOT EXISTS medisys_pharmacy`);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS medisys_pharmacy.pharmacy_orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      hospital_id INT NOT NULL,
      opd_visit_id INT NULL,
      ipd_admission_id INT NULL,
      patient_uhid VARCHAR(30) NOT NULL,
      doctor_user_id VARCHAR(50) NOT NULL,
      medicine_name VARCHAR(150) NOT NULL,
      dosage VARCHAR(100) NOT NULL,
      duration VARCHAR(50) NOT NULL,
      urgency ENUM('routine', 'urgent') NOT NULL DEFAULT 'routine',
      status VARCHAR(20) NOT NULL DEFAULT 'pending_pharmacy',
      dispensed_by VARCHAR(50) NULL,
      dispensed_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      amount DECIMAL(10,2) NULL,
      payment_mode VARCHAR(20) NULL
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS medisys_pharmacy.pharmacy_stock (
      id INT AUTO_INCREMENT PRIMARY KEY,
      hospital_id INT NOT NULL,
      medicine_name VARCHAR(150) NOT NULL,
      category VARCHAR(50) NOT NULL,
      batch_number VARCHAR(50) NOT NULL,
      expiry_date DATE NOT NULL,
      stock_quantity INT NOT NULL DEFAULT 0,
      min_stock_level INT NOT NULL DEFAULT 10,
      unit_price DECIMAL(10,2),
      added_by VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS medisys_pharmacy.pharmacy_purchase_orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      hospital_id INT NOT NULL,
      po_number VARCHAR(50) NOT NULL UNIQUE,
      supplier_name VARCHAR(150) NOT NULL,
      items_summary VARCHAR(255) NOT NULL,
      total_items INT NOT NULL DEFAULT 1,
      status VARCHAR(30) NOT NULL DEFAULT 'Submitted',
      created_by VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS medisys_pharmacy.pharmacy_invoices (
      id INT AUTO_INCREMENT PRIMARY KEY,
      hospital_id INT NOT NULL,
      invoice_number VARCHAR(50) NOT NULL UNIQUE,
      order_id INT NULL,
      patient_uhid VARCHAR(30) NOT NULL,
      patient_name VARCHAR(150) NOT NULL,
      payment_type VARCHAR(30) NOT NULL DEFAULT 'Cash',
      item_count INT NOT NULL DEFAULT 1,
      total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      payment_status VARCHAR(20) NOT NULL DEFAULT 'Pending',
      created_by VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      paid_at TIMESTAMP NULL
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS nurse_shift_roster (
      id INT AUTO_INCREMENT PRIMARY KEY,
      hospital_id INT NOT NULL,
      nurse_user_id VARCHAR(50) NOT NULL,
      ward_id INT NOT NULL,
      shift VARCHAR(20) NOT NULL,
      day_of_week TINYINT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS doctor_nurse_teams (
      id INT AUTO_INCREMENT PRIMARY KEY,
      hospital_id INT NOT NULL,
      doctor_user_id VARCHAR(50) NOT NULL,
      nurse_user_id VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function ensureColumn(connection, table, column, definition) {
  const [columns] = await connection.query(
    `SELECT COLUMN_NAME FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  if (columns.length === 0) {
    await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  }
}

async function dropColumnIfExists(connection, table, column) {
  const [columns] = await connection.query(
    `SELECT COLUMN_NAME FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  if (columns.length > 0) {
    await connection.query(`ALTER TABLE \`${table}\` DROP COLUMN \`${column}\``);
  }
}

async function seedTestCatalog(connection, hospitalId) {
  const [[{ cnt }]] = await connection.query(
    "SELECT COUNT(*) AS cnt FROM test_catalog WHERE hospital_id = ?",
    [hospitalId]
  );
  if (cnt > 0) return;

  const tests = [
    ["CBC (Complete Blood Count)", "Hematology", "Pathology", "Blood", 300, 6],
    ["ESR", "Hematology", "Pathology", "Blood", 150, 6],
    ["Hemoglobin (Hb)", "Hematology", "Pathology", "Blood", 100, 4],
    ["Peripheral Smear", "Hematology", "Pathology", "Blood", 250, 12],
    ["LFT (Liver Function Test)", "Biochemistry", "Pathology", "Blood", 600, 12],
    ["KFT (Kidney Function Test)", "Biochemistry", "Pathology", "Blood", 600, 12],
    ["Blood Sugar (Fasting)", "Biochemistry", "Pathology", "Blood", 100, 4],
    ["Blood Sugar (PP)", "Biochemistry", "Pathology", "Blood", 100, 4],
    ["Lipid Profile", "Biochemistry", "Pathology", "Blood", 700, 12],
    ["Electrolytes (Na/K/Cl)", "Biochemistry", "Pathology", "Blood", 400, 6],
    ["Urine Culture & Sensitivity", "Microbiology", "Pathology", "Urine", 500, 48],
    ["Blood Culture & Sensitivity", "Microbiology", "Pathology", "Blood", 800, 72],
    ["Sputum Culture & Sensitivity", "Microbiology", "Pathology", "Sputum", 500, 48],
    ["Wound Swab Culture", "Microbiology", "Pathology", "Swab", 500, 48],
    ["Biopsy - Histopathology", "Histopathology", "Pathology", "Tissue", 1500, 96],
    ["FNAC (Fine Needle Aspiration Cytology)", "Histopathology", "Pathology", "Tissue", 1200, 72],
    ["HIV (ELISA)", "Serology", "Pathology", "Blood", 400, 24],
    ["HBsAg", "Serology", "Pathology", "Blood", 350, 24],
    ["HCV", "Serology", "Pathology", "Blood", 400, 24],
    ["VDRL", "Serology", "Pathology", "Blood", 200, 12],
    ["Widal Test", "Serology", "Pathology", "Blood", 200, 12],
    ["Dengue NS1/IgM/IgG", "Serology", "Pathology", "Blood", 600, 12],
    ["Malaria Antigen Test", "Serology", "Pathology", "Blood", 300, 4],
    ["Chest X-Ray", "Radiology", "Radiology", "N/A", 400, 4],
    ["Ultrasound Abdomen", "Radiology", "Radiology", "N/A", 1000, 6],
    ["CT Scan (Plain)", "Radiology", "Radiology", "N/A", 3500, 24],
    ["MRI (Plain)", "Radiology", "Radiology", "N/A", 6000, 24],
    ["ECG", "Radiology", "Radiology", "N/A", 250, 1],
  ];

  await connection.query(
    `INSERT INTO test_catalog (hospital_id, name, category, department, sample_type, price, turnaround_hours) VALUES ?`,
    [tests.map((t) => [hospitalId, ...t])]
  );
}

module.exports = { ensureSchema, seedTestCatalog };
