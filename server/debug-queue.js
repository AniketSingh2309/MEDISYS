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
  console.log('Local date now:', localDate);

  const [rows] = await c.query(
    'SELECT id, token_number, patient_uhid, source, status, visit_date, DATE(visit_date) as vd FROM opd_visits WHERE doctor_user_id=? AND status IN (?,?) ORDER BY id DESC LIMIT 10',
    ['DR-CHG-49545', 'waiting', 'in-consultation']
  );
  console.log('Active visits:', rows.length);
  rows.forEach(r => console.log('  ID:', r.id, '| token:', r.token_number, '| source:', r.source, '| visit_date:', r.vd, '| match today:', r.vd === localDate));
  await c.end();
}
main().catch(e => console.error(e.message));
