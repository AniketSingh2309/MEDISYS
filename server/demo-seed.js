require('dotenv').config({ path: __dirname + '/../server/.env' });
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function main() {
  const pool = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'medisys',
  });

  const [[hospital]] = await pool.query('SELECT id FROM hospitals LIMIT 1');
  if (!hospital) { console.error('No hospital found.'); process.exit(1); }
  const hospitalId = hospital.id;
  console.log('Hospital ID:', hospitalId);

  const [[doctor]] = await pool.query('SELECT user_id FROM users WHERE role = ? AND hospital_id = ? LIMIT 1', ['doctor', hospitalId]);
  if (!doctor) { console.error('No doctor found. Create a doctor via admin panel first.'); process.exit(1); }
  const doctorUserId = doctor.user_id;
  console.log('Doctor:', doctorUserId);

  const passwordHash = await bcrypt.hash('Demo@1234', 10);
  const today = new Date().toISOString().slice(0, 10);

  const uhidA = 'DEMO-WALKIN-01';
  await pool.query('INSERT INTO patients (uhid, hospital_id, full_name, dob, gender, phone) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE full_name = VALUES(full_name)', [uhidA, hospitalId, 'Amit Kumar (Demo)', '1990-05-15', 'male', '9000000001']);
  await pool.query('INSERT INTO users (user_id, password_hash, full_name, role, hospital_id) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE full_name = VALUES(full_name)', [uhidA, passwordHash, 'Amit Kumar (Demo)', 'patient', hospitalId]);

  const uhidB = 'DEMO-TELE-01';
  await pool.query('INSERT INTO patients (uhid, hospital_id, full_name, dob, gender, phone) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE full_name = VALUES(full_name)', [uhidB, hospitalId, 'Sneha Verma (Online)', '1995-11-22', 'female', '9000000002']);
  await pool.query('INSERT INTO users (user_id, password_hash, full_name, role, hospital_id) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE full_name = VALUES(full_name)', [uhidB, passwordHash, 'Sneha Verma (Online)', 'patient', hospitalId]);

  const [[{ cnt }]] = await pool.query('SELECT COUNT(*) AS cnt FROM opd_visits WHERE hospital_id = ? AND visit_date = ?', [hospitalId, today]);
  const tokenA = cnt + 1;
  const tokenB = cnt + 2;

  const [rA] = await pool.query('INSERT INTO opd_visits (hospital_id, token_number, patient_uhid, doctor_user_id, visit_date, slot_time, source, status, created_by) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?)', [hospitalId, tokenA, uhidA, doctorUserId, today, 'walk-in', 'waiting', doctorUserId]);
  console.log('Walk-in visit: Token #' + tokenA + ', ID:', rA.insertId);

  const [rB] = await pool.query('INSERT INTO opd_visits (hospital_id, token_number, patient_uhid, doctor_user_id, visit_date, slot_time, source, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [hospitalId, tokenB, uhidB, doctorUserId, today, '10:30:00', 'telemedicine', 'waiting', doctorUserId]);
  console.log('Telemedicine visit: Token #' + tokenB + ', ID:', rB.insertId);

  console.log('\nDone! Patient logins: ID = DEMO-WALKIN-01 or DEMO-TELE-01, Password = Demo@1234');
  await pool.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });

