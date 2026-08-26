require('dotenv').config();
const mysql = require('mysql2/promise');
async function main() {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST, port: +process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  const now = new Date();
  const localDate = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
  console.log('Updating visit_date to today:', localDate);
  const [r] = await c.query(
    'UPDATE opd_visits SET visit_date=? WHERE patient_uhid IN (?,?) AND status IN (?,?)',
    [localDate, 'DEMO-WALKIN-01', 'DEMO-TELE-01', 'waiting', 'in-consultation']
  );
  console.log('Updated rows:', r.affectedRows);
  const [rows] = await c.query(
    'SELECT id, token_number, patient_uhid, source, status FROM opd_visits WHERE patient_uhid IN (?,?) AND status IN (?,?)',
    ['DEMO-WALKIN-01', 'DEMO-TELE-01', 'waiting', 'in-consultation']
  );
  rows.forEach(r2 => console.log('  Token #' + r2.token_number, '|', r2.patient_uhid, '|', r2.source, '|', r2.status));
  await c.end();
}
main().catch(e => console.error(e.message));
