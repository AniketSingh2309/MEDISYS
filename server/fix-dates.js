require('dotenv').config();
const mysql = require('mysql2/promise');
async function main() {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST, port: +process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  // Get local date same as how server generates it
  const now = new Date();
  const localDate = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
  console.log('Setting visit_date to local date:', localDate);

  const [r] = await c.query(
    'UPDATE opd_visits SET visit_date=? WHERE patient_uhid IN (?,?) AND status=?',
    [localDate, 'DEMO-WALKIN-01', 'DEMO-TELE-01', 'waiting']
  );
  console.log('Updated rows:', r.affectedRows);

  // Verify
  const [rows] = await c.query(
    'SELECT id,token_number,patient_uhid,source,visit_date,status FROM opd_visits WHERE patient_uhid IN (?,?) AND status=?',
    ['DEMO-WALKIN-01', 'DEMO-TELE-01', 'waiting']
  );
  rows.forEach(x => console.log(x.id, x.token_number, x.patient_uhid, x.source, x.visit_date));
  await c.end();
}
main().catch(e => console.error(e.message));
