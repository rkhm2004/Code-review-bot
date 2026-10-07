import crypto from "node:crypto";

const [username, password, role = "REVIEWER"] = process.argv.slice(2);
if (!username || !password) {
  console.error("Usage: node mcp-server/scripts/hash-password.mjs <username> <password> [ADMIN|REVIEWER|DEVELOPER|AUDITOR]");
  process.exit(1);
}
if (!["ADMIN","REVIEWER","DEVELOPER","AUDITOR"].includes(role)) {
  console.error("Invalid role.");
  process.exit(1);
}
const salt = crypto.randomBytes(16).toString("hex");
const passwordHash = crypto.scryptSync(password, salt, 32).toString("base64url");
console.log(JSON.stringify({ username, passwordHash, salt, role }, null, 2));
