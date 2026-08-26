require('dotenv').config();
const mysql = require('mysql2/promise');
async function main() {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST, port: +process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  const today = new Date().toISOString().slice(0,10);
  console.log('Today:', today);
  const [visits] = await c.query(
    'SELECT id,token_number,patient_uhid,doctor_user_id,visit_date,source,status,hospital_id FROM opd_visits WHERE doctor_user_id=? ORDER BY id DESC LIMIT 10',
    ['DR-CHG-49545']
  );
  console.log('Visits:', JSON.stringify(visits, null, 2));
  const [doc] = await c.query('SELECT user_id,full_name,hospital_id FROM users WHERE user_id=?', ['DR-CHG-49545']);
  console.log('Doctor:', JSON.stringify(doc[0]));
  await c.end();
}
main().catch(e => console.error(e.message));
