const crypto = require("crypto");

function buildShortCode(name) {
  const words = String(name)
    .toUpperCase()
    .replace(/[^A-Z\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);

  let code = words.map((w) => w[0]).join("").slice(0, 5);
  if (code.length < 3) {
    code = (words[0] || "HOSP").slice(0, 3);
  }
  return code;
}

function generateStaffUserId(prefix, shortCode) {
  const digits = crypto.randomInt(1000, 100000);
  return `${prefix}-${shortCode}-${digits}`;
}

function generateTempPassword(length = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  return Array.from({ length }, () => chars[crypto.randomInt(chars.length)]).join("");
}

function generateUhid(shortCode, sequentialId) {
  return `PAT-${shortCode}-${String(sequentialId).padStart(6, "0")}`;
}

module.exports = { buildShortCode, generateStaffUserId, generateTempPassword, generateUhid };
