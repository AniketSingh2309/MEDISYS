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
  await ensureColumn(connection, "patients", "blood_group", "VARCHAR(4) NULL");
  await ensureColumn(connection, "patients", "abha_address", "VARCHAR(100) NULL");
  await ensureColumn(connection, "patients", "abha_verified", "TINYINT(1) NOT NULL DEFAULT 0");
  await ensureColumn(connection, "patients", "abha_link_status", "VARCHAR(20) NULL");

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
  // Superseded by doctor_calendar_availability below (specific calendar dates rather
  // than a recurring day-of-week pattern) — table kept around untouched so existing
  // rows aren't lost, but the app no longer reads or writes it.

  await connection.query(`
    CREATE TABLE IF NOT EXISTS doctor_calendar_availability (
      id INT AUTO_INCREMENT PRIMARY KEY,
      hospital_id INT NOT NULL,
      doctor_user_id VARCHAR(50) NOT NULL,
      avail_date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      slot_minutes INT NOT NULL DEFAULT 15,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_doctor_date_start (doctor_user_id, avail_date, start_time)
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
  // A consultation can now combine multiple actions at once (prescribe + order tests +
  // admit), stored as a comma-joined list (e.g. "prescribe,order_tests,admit") — widen
  // from the original single-decision VARCHAR(20). MODIFY is idempotent, safe to re-run.
  await connection.query(`ALTER TABLE consultations MODIFY COLUMN decision VARCHAR(60) NOT NULL`);
  // Structured diagnosis (picked from a fixed notifiable-disease list, see DISEASE_WATCHLIST
  // in server.js) — separate from the free-text symptoms/notes above so case counts per
  // hospital/disease can actually be aggregated for outbreak detection.
  await ensureColumn(connection, "consultations", "diagnosis", "VARCHAR(100) NULL");

  // One row per outbreak alert actually raised (case count for some diagnosis crossed the
  // threshold at some hospital within the rolling window). Drives both the hospital admin's
  // "Outbreak Alerts" panel and the simulated SMS fan-out — see checkDiseaseOutbreak() in
  // server.js. Only aggregate counts are stored here, never other hospitals' patient lists,
  // so an alert never leaks cross-tenant patient data into a hospital admin's portal.
  await connection.query(`
    CREATE TABLE IF NOT EXISTS disease_alerts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      hospital_id INT NOT NULL,
      diagnosis VARCHAR(100) NOT NULL,
      case_count INT NOT NULL,
      window_days INT NOT NULL,
      hospital_patients_notified INT NOT NULL DEFAULT 0,
      nearby_patients_notified INT NOT NULL DEFAULT 0,
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
  await ensureColumn(connection, "ipd_admissions", "discharged_at", "TIMESTAMP NULL");
  await ensureColumn(connection, "ipd_admissions", "discharged_by", "VARCHAR(50) NULL");

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
  // priority / verification fields, added after the initial release — kept as an additive
  // migration (ensureColumn) rather than in the CREATE above so existing installs pick them up.
  await ensureColumn(
    connection,
    "lab_orders",
    "priority",
    "ENUM('routine','urgent','stat') NOT NULL DEFAULT 'routine'"
  );
  await ensureColumn(connection, "lab_orders", "verified_by", "VARCHAR(50) NULL");
  await ensureColumn(connection, "lab_orders", "verified_at", "TIMESTAMP NULL");

  // Multiple images per study (radiology). A study can have 0..N uploaded images;
  // legacy single-file result (result_file_path/name) is still used by the pathology flow.
  await connection.query(`
    CREATE TABLE IF NOT EXISTS lab_order_images (
      id INT AUTO_INCREMENT PRIMARY KEY,
      hospital_id INT NOT NULL,
      lab_order_id INT NOT NULL,
      file_path VARCHAR(255) NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      uploaded_by VARCHAR(50) NULL,
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

  // Links a dispensed medicine to the one combined invoice it was billed under —
  // lets an invoice cover every medicine from a visit instead of one invoice each.
  await ensureColumnInSchema(connection, "medisys_pharmacy", "pharmacy_orders", "invoice_id", "INT NULL");
  // Before Meal / After Meal / With Meal / Empty Stomach — set by the prescribing
  // doctor, shown to pharmacy staff dispensing it and to the patient in their portal.
  await ensureColumnInSchema(connection, "medisys_pharmacy", "pharmacy_orders", "food_instruction", "VARCHAR(20) NULL");

  // Who this batch was bought from — shown as "last supplier" on the low-stock
  // reorder list. Optional; older rows predating this column stay NULL.
  await ensureColumnInSchema(connection, "medisys_pharmacy", "pharmacy_stock", "supplier_name", "VARCHAR(150) NULL");
  // The quantity this batch started with when received, preserved separately
  // from stock_quantity (which dispensing/edits mutate downward) so the
  // "10% of the last-received batch" default reorder threshold stays accurate
  // even after the batch has been partly dispensed. Rows from before this
  // column existed fall back to their current stock_quantity as a reasonable
  // approximation (see the low-stock endpoint in server.js).
  await ensureColumnInSchema(connection, "medisys_pharmacy", "pharmacy_stock", "received_quantity", "INT NULL");

  // Per-medicine (not per-batch) low-stock reorder threshold — set manually by
  // pharmacist/admin from the Medicine Stock tab, or left unset to fall back to
  // "10% of the last-received batch" (computed live, see GET
  // /api/pharmacy-stock/low-stock). Keyed by medicine_name rather than a
  // medicine ID because pharmacy_stock has no separate medicines table —
  // every batch just repeats the medicine's name as a string.
  await connection.query(`
    CREATE TABLE IF NOT EXISTS medisys_pharmacy.medicine_thresholds (
      id INT AUTO_INCREMENT PRIMARY KEY,
      hospital_id INT NOT NULL,
      medicine_name VARCHAR(150) NOT NULL,
      reorder_threshold DECIMAL(10,2) NULL,
      reorder_threshold_type VARCHAR(20) NOT NULL DEFAULT 'percentage',
      updated_by VARCHAR(50) NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_hospital_medicine (hospital_id, medicine_name)
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

  // ---------- Blood Bank ----------
  await connection.query(`
    CREATE TABLE IF NOT EXISTS blood_donors (
      id INT AUTO_INCREMENT PRIMARY KEY,
      hospital_id INT NOT NULL,
      full_name VARCHAR(150) NOT NULL,
      patient_uhid VARCHAR(30) NULL,
      blood_group VARCHAR(4) NOT NULL,
      phone VARCHAR(20),
      last_donation_date DATE NULL,
      total_donations INT NOT NULL DEFAULT 0,
      created_by VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS blood_inventory_units (
      id INT AUTO_INCREMENT PRIMARY KEY,
      hospital_id INT NOT NULL,
      unit_code VARCHAR(30) NOT NULL,
      blood_group VARCHAR(4) NOT NULL,
      component VARCHAR(30) NOT NULL,
      donor_id INT NULL,
      collected_at TIMESTAMP NOT NULL,
      expiry_at TIMESTAMP NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'available',
      issued_to_request_id INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS blood_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      hospital_id INT NOT NULL,
      request_code VARCHAR(30) NOT NULL,
      patient_uhid VARCHAR(30) NULL,
      patient_name VARCHAR(150) NOT NULL,
      age INT NULL,
      sex VARCHAR(4) NULL,
      blood_group VARCHAR(4) NOT NULL,
      component VARCHAR(30) NOT NULL,
      units_required INT NOT NULL DEFAULT 1,
      priority VARCHAR(20) NOT NULL DEFAULT 'Routine',
      ward_location VARCHAR(150),
      ref_physician VARCHAR(150),
      status VARCHAR(20) NOT NULL DEFAULT 'requested',
      assigned_staff_id VARCHAR(50) NULL,
      crossmatch_sample BOOLEAN NOT NULL DEFAULT FALSE,
      crossmatch_abo BOOLEAN NOT NULL DEFAULT FALSE,
      crossmatch_screen BOOLEAN NOT NULL DEFAULT FALSE,
      notes TEXT,
      created_by VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      issued_at TIMESTAMP NULL
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS blood_patient_donations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      hospital_id INT NOT NULL,
      patient_uhid VARCHAR(30) NOT NULL,
      donor_name VARCHAR(150) NOT NULL,
      blood_group VARCHAR(4) NOT NULL,
      component VARCHAR(30) NOT NULL,
      units INT NOT NULL DEFAULT 1,
      weight DECIMAL(5,1),
      hb DECIMAL(4,1),
      systolic INT,
      diastolic INT,
      pulse INT,
      temperature DECIMAL(4,1),
      flags JSON,
      eligible BOOLEAN NOT NULL,
      ineligible_reasons TEXT,
      consent BOOLEAN NOT NULL DEFAULT FALSE,
      recorded_by VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS blood_billing (
      id INT AUTO_INCREMENT PRIMARY KEY,
      hospital_id INT NOT NULL,
      request_id INT NOT NULL,
      patient_uhid VARCHAR(30) NULL,
      patient_name VARCHAR(150) NOT NULL,
      component VARCHAR(30) NOT NULL,
      units INT NOT NULL,
      amount DECIMAL(10,2) NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      payment_type VARCHAR(30) NULL,
      created_by VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      paid_at TIMESTAMP NULL
    )
  `);

  // ---------- Billing Desk (OPD/IPD/Pathology/Radiology/Pharmacy consolidated billing) ----------
  await connection.query(`
    CREATE TABLE IF NOT EXISTS bills (
      id INT AUTO_INCREMENT PRIMARY KEY,
      hospital_id INT NOT NULL,
      bill_no VARCHAR(30) NOT NULL,
      patient_uhid VARCHAR(30) NULL,
      patient_name VARCHAR(150) NOT NULL,
      abha_id VARCHAR(50),
      department VARCHAR(30) NOT NULL,
      doctor_user_id VARCHAR(50) NULL,
      bill_date DATE NOT NULL,
      subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
      discount_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
      discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
      tax_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
      tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
      total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
      paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
      balance_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'Pending',
      is_insurance BOOLEAN NOT NULL DEFAULT FALSE,
      payer_name VARCHAR(150) NULL,
      policy_no VARCHAR(100) NULL,
      claim_status VARCHAR(20) NULL,
      approved_amount DECIMAL(10,2) NULL,
      created_by VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS bill_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      hospital_id INT NOT NULL,
      bill_id INT NOT NULL,
      description VARCHAR(200) NOT NULL,
      department VARCHAR(30),
      qty DECIMAL(10,2) NOT NULL DEFAULT 1,
      rate DECIMAL(10,2) NOT NULL DEFAULT 0,
      amount DECIMAL(10,2) NOT NULL DEFAULT 0
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS bill_payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      hospital_id INT NOT NULL,
      bill_id INT NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      mode VARCHAR(30) NOT NULL,
      reference VARCHAR(50),
      paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_by VARCHAR(50)
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS billing_tariff (
      id INT AUTO_INCREMENT PRIMARY KEY,
      hospital_id INT NOT NULL,
      charge_head VARCHAR(150) NOT NULL,
      department VARCHAR(30) NOT NULL,
      default_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Event-sourced charges: one row per real thing that should be billed (registration,
  // an OPD visit, a lab order, a bed admission). source_type + source_id point back at
  // the row that generated the charge, so re-reconciling never double-charges the same
  // event. bill_id stays NULL until a billing-desk staffer actually collects payment for
  // it — at that point it's grouped into a normal `bills` row like any manual bill.
  await connection.query(`
    CREATE TABLE IF NOT EXISTS patient_charges (
      id INT AUTO_INCREMENT PRIMARY KEY,
      hospital_id INT NOT NULL,
      patient_uhid VARCHAR(30) NOT NULL,
      source_type VARCHAR(20) NOT NULL,
      source_id INT NOT NULL,
      description VARCHAR(200) NOT NULL,
      department VARCHAR(30) NOT NULL,
      rate DECIMAL(10,2) NOT NULL DEFAULT 0,
      bill_id INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_patient_charge_source (hospital_id, source_type, source_id)
    )
  `);

  await seedDefaultUsers(connection);
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

// Same idea as ensureColumn, but for a table in a different database (e.g. the
// cross-database medisys_pharmacy tables), where DATABASE() would check the wrong schema.
async function ensureColumnInSchema(connection, schema, table, column, definition) {
  const [columns] = await connection.query(
    `SELECT COLUMN_NAME FROM information_schema.columns
     WHERE table_schema = ? AND table_name = ? AND COLUMN_NAME = ?`,
    [schema, table, column]
  );
  if (columns.length === 0) {
    await connection.query(`ALTER TABLE \`${schema}\`.\`${table}\` ADD COLUMN \`${column}\` ${definition}`);
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

async function seedBillingTariff(connection, hospitalId) {
  const [[{ cnt }]] = await connection.query(
    "SELECT COUNT(*) AS cnt FROM billing_tariff WHERE hospital_id = ?",
    [hospitalId]
  );
  if (cnt > 0) return;

  const tariff = [
    ["Consultation Fee", "OPD", 600],
    ["Registration Fee", "OPD", 100],
    ["Pathology — Test Panel", "Pathology", 450],
    ["Radiology — Imaging", "Radiology", 1200],
    ["Bed Charges (per day) — General Ward", "IPD", 1800],
    ["Bed Charges (per day) — ICU", "IPD", 6500],
    ["Nursing Charges", "IPD", 300],
    ["Pharmacy — Medicines", "Pharmacy", 0],
  ];

  await connection.query(`INSERT INTO billing_tariff (hospital_id, charge_head, department, default_rate) VALUES ?`, [
    tariff.map((t) => [hospitalId, ...t]),
  ]);
}

const bcrypt = require("bcrypt");

async function seedDefaultUsers(connection) {
  try {
    const hashCore5 = await bcrypt.hash("Core5@2022", 10);
    const hashPhar = await bcrypt.hash("CAyjNATuMc", 10);
    const hash = await bcrypt.hash("admin123", 10);
    const passHash = await bcrypt.hash("password123", 10);

    // 1. Seed superadmins
    const superadmins = [
      ["superadmin", hash, "Super Admin"],
      ["C5-202226", hashCore5, "Core5 Super Admin"]
    ];

    for (const [sId, sHash, sName] of superadmins) {
      const [[{ cntSuper }]] = await connection.query(
        "SELECT COUNT(*) AS cntSuper FROM users WHERE user_id = ?",
        [sId]
      );
      if (cntSuper === 0) {
        await connection.query(
          "INSERT INTO users (user_id, password_hash, full_name, role) VALUES (?, ?, ?, ?)",
          [sId, sHash, sName, "superadmin"]
        );
      }
    }

    // 2-5. Demo hospital + its staff/patients — bootstrap only on a genuinely empty
    // install (no hospitals at all yet). The old guard checked only `id = 1`, so on any
    // database that already had a real hospital under a different id (e.g. imported from
    // a dump with id=10), it silently created a *second* duplicate "City Hospital
    // Ghatkopar" AND — worse — the unconditional password-reset UPDATEs below ran every
    // single server start, resetting real accounts (AD-CHG-64701, OPD-CHG-70518,
    // DR-CHG-49545, NR-CHG-88859, PH-44433, C5-202226, and patients PAT-CHG-0002/3/4) back
    // to these hardcoded demo passwords whenever a real hospital happened to reuse the
    // same user IDs, as ours does. Gating the whole block on "no hospitals exist yet"
    // makes this pure first-run bootstrap and leaves real data alone from then on.
    const [[{ cntAnyHospital }]] = await connection.query("SELECT COUNT(*) AS cntAnyHospital FROM hospitals");
    if (cntAnyHospital === 0) {
      // 2. Seed Default Hospital
      await connection.query(
        `INSERT INTO hospitals (id, name, license_number, city, state, bed_count, status, admin_name, admin_email, short_code, admin_user_id)
         VALUES (1, 'City Hospital Ghatkopar', 'LIC-1001', 'Mumbai', 'Maharashtra', 100, 'active', 'Rashmi', 'admin@cityhospital.com', 'CHG', 'AD-CHG-64701')`
      );

      // 3. Seed Hospital Admin & Staff Users
      const defaultUsers = [
        ["AD-CHG-64701", hashCore5, "Rashmi (Hospital Admin)", "hospital_admin", 1, "staff"],
        ["OPD-CHG-70518", hashCore5, "Jhon Jacob (OPD)", "receptionist", 1, "staff"],
        ["DR-CHG-49545", hashCore5, "Shubham (Doctor)", "doctor", 1, "staff"],
        ["NR-CHG-88859", hashCore5, "Dipti (Nurse)", "nurse", 1, "staff"],
        ["PH-44433", hashPhar, "Pharmacist", "pharmacist", 1, "staff"],
        ["CH-ADM-001", hash, "Hospital Admin", "hospital_admin", 1, "staff"],
        ["DR-001", passHash, "Dr. Sharma", "doctor", 1, "staff"],
        ["PH-001", passHash, "Pharmacist Verma", "pharmacist", 1, "staff"],
        ["REC-001", passHash, "Front Desk Receptionist", "receptionist", 1, "staff"],
        ["NUR-001", passHash, "Nurse Sister Mary", "nurse", 1, "staff"],
      ];

      for (const [uId, uHash, fName, uRole, hId, accType] of defaultUsers) {
        const [[{ cntU }]] = await connection.query("SELECT COUNT(*) AS cntU FROM users WHERE user_id = ?", [uId]);
        if (cntU === 0) {
          await connection.query(
            "INSERT INTO users (user_id, password_hash, full_name, role, hospital_id) VALUES (?, ?, ?, ?, ?)",
            [uId, uHash, fName, uRole, hId]
          );
        }
        const [[{ cntDir }]] = await connection.query("SELECT COUNT(*) AS cntDir FROM user_directory WHERE user_id = ?", [uId]);
        if (cntDir === 0) {
          await connection.query(
            "INSERT INTO user_directory (user_id, hospital_id, account_type) VALUES (?, ?, ?)",
            [uId, hId, accType]
          );
        }
      }

      // 4. Seed Patients
      const patients = [
        ["PAT-CHG-0002", "ASHISH", hashCore5, 1],
        ["PAT-CHG-0003", "Vikram", hashCore5, 1],
        ["PAT-CHG-0004", "NITISH", hashCore5, 1],
      ];

      for (const [uhid, pName, pHash, hId] of patients) {
        const [[{ cntP }]] = await connection.query("SELECT COUNT(*) AS cntP FROM patients WHERE uhid = ?", [uhid]);
        if (cntP === 0) {
          await connection.query(
            "INSERT INTO patients (uhid, full_name, password_hash, hospital_id) VALUES (?, ?, ?, ?)",
            [uhid, pName, pHash, hId]
          );
        }
        const [[{ cntDirP }]] = await connection.query("SELECT COUNT(*) AS cntDirP FROM user_directory WHERE user_id = ?", [uhid]);
        if (cntDirP === 0) {
          await connection.query(
            "INSERT INTO user_directory (user_id, hospital_id, account_type) VALUES (?, ?, 'patient')",
            [uhid, hId]
          );
        }
      }

      // 5. Sync hospital_id between users, patients, and user_directory, and normalize
      // the demo accounts' passwords we just created above.
      await connection.query('UPDATE users u JOIN user_directory d ON u.user_id = d.user_id SET u.hospital_id = d.hospital_id');
      await connection.query('UPDATE patients p JOIN user_directory d ON p.uhid = d.user_id SET p.hospital_id = d.hospital_id');
      await connection.query('UPDATE users SET password_hash = ? WHERE user_id = ?', [hashPhar, 'PH-44433']);
      await connection.query('UPDATE users SET password_hash = ? WHERE user_id = ?', [hashCore5, 'AD-CHG-64701']);
      await connection.query('UPDATE users SET password_hash = ? WHERE user_id = ?', [hashCore5, 'OPD-CHG-70518']);
      await connection.query('UPDATE users SET password_hash = ? WHERE user_id = ?', [hashCore5, 'DR-CHG-49545']);
      await connection.query('UPDATE users SET password_hash = ? WHERE user_id = ?', [hashCore5, 'NR-CHG-88859']);
      await connection.query('UPDATE users SET password_hash = ? WHERE user_id = ?', [hashCore5, 'C5-202226']);
      await connection.query('UPDATE patients SET password_hash = ? WHERE uhid IN (?, ?, ?)', [hashCore5, 'PAT-CHG-0002', 'PAT-CHG-0003', 'PAT-CHG-0004']);
    }

  } catch (err) {
    console.error("Error seeding default users:", err.message);
  }
}

module.exports = { ensureSchema, seedTestCatalog, seedBillingTariff };
