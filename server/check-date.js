require('dotenv').config();
const mysql = require('mysql2/promise');
async function main() {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST, port: +process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  const today = new Date();
  const todayStr = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
  console.log('todayStr:', todayStr);
  const [rows] = await c.query(
    'SELECT id, visit_date, DATE(visit_date) as visit_date_only, status, source FROM opd_visits WHERE doctor_user_id=? AND visit_date=?',
    ['DR-CHG-49545', todayStr]
  );
  console.log('Rows found:', rows.length, JSON.stringify(rows));

  // also check DATE() comparison
  const [rows2] = await c.query(
    'SELECT id, visit_date, source FROM opd_visits WHERE doctor_user_id=? AND DATE(visit_date)=?',
    ['DR-CHG-49545', todayStr]
  );
  console.log('With DATE() func:', rows2.length, JSON.stringify(rows2.map(r => ({id:r.id, source:r.source}))));
  await c.end();
}
main().catch(e => console.error(e.message));
