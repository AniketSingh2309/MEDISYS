require("dotenv").config({ quiet: true });
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const { ensureSchema } = require("./schema");

const SUPERADMIN_USER_ID = process.env.SUPERADMIN_USER_ID;
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD;

async function main() {
  if (!SUPERADMIN_USER_ID || !SUPERADMIN_PASSWORD) {
    throw new Error("Set SUPERADMIN_USER_ID and SUPERADMIN_PASSWORD in server/.env before running the seed script.");
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
  });

  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\` CHARACTER SET utf8mb4`
  );
  await connection.changeUser({ database: process.env.DB_NAME });

  await ensureSchema(connection);

  const passwordHash = await bcrypt.hash(SUPERADMIN_PASSWORD, 12);

  await connection.query(
    `INSERT INTO users (user_id, password_hash, full_name, role)
     VALUES (?, ?, ?, 'superadmin')
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = 'superadmin'`,
    [SUPERADMIN_USER_ID, passwordHash, "Core5 Super Admin"]
  );

  console.log(`Database "${process.env.DB_NAME}" ready.`);
  console.log(`Superadmin user "${SUPERADMIN_USER_ID}" created/updated.`);

  await connection.end();
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
