import crypto from "node:crypto";

export type Role = "ADMIN" | "REVIEWER" | "DEVELOPER" | "AUDITOR";

export type AuthUser = {
  username: string;
  role: Role;
};

const SECRET = process.env.CS4_AUTH_SECRET || "";
const TTL_SECONDS = Number(process.env.CS4_AUTH_TTL_SECONDS || 3600);

const PERMISSIONS: Record<Role, string[]> = {
  ADMIN: ["analyze", "validate", "disposition", "audit", "report", "manage_users"],
  REVIEWER: ["analyze", "validate", "disposition", "audit", "report"],
  DEVELOPER: ["analyze", "validate", "report"],
  AUDITOR: ["audit", "report"],
};

function b64url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

function sign(input: string): string {
  return crypto.createHmac("sha256", SECRET).update(input).digest("base64url");
}

function configuredUsers(): Array<{ username: string; passwordHash: string; salt: string; role: Role; disabled?: boolean }> {
  const raw = process.env.CS4_USERS_JSON || "[]";
  try {
    const users = JSON.parse(raw);
    if (Array.isArray(users) && users.length) return users;
  } catch {}
  const username = process.env.CS4_ADMIN_USERNAME || "admin";
  const password = process.env.CS4_ADMIN_PASSWORD || "";
  if (password) {
    const salt = process.env.CS4_ADMIN_SALT || crypto.createHash("sha256").update(username + SECRET).digest("hex").slice(0, 32);
    return [{ username, passwordHash: passwordHash(password, salt), salt, role: "ADMIN" as Role }];
  }
  return [];
}

export function passwordHash(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 32).toString("base64url");
}

export function verifyPassword(password: string, salt: string, expected: string): boolean {
  const actual = Buffer.from(passwordHash(password, salt));
  const target = Buffer.from(expected);
  return actual.length === target.length && crypto.timingSafeEqual(actual, target);
}

export function authenticate(username: string, password: string): AuthUser | null {
  const user = configuredUsers().find((candidate) => candidate.username === username && !candidate.disabled);
  if (!user || !verifyPassword(password, user.salt, user.passwordHash)) return null;
  return { username: user.username, role: user.role };
}

export function createToken(user: AuthUser): string {
  if (!SECRET || SECRET.length < 32) throw new Error("CS4_AUTH_SECRET must be configured with at least 32 characters.");
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({ sub: user.username, role: user.role, iat: now, exp: now + TTL_SECONDS }));
  return `${header}.${payload}.${sign(`${header}.${payload}`)}`;
}

export function verifyToken(token: string): AuthUser | null {
  if (!SECRET || SECRET.length < 32) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  const expected = sign(`${header}.${payload}`);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data.sub || !data.role || !data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
    if (!["ADMIN", "REVIEWER", "DEVELOPER", "AUDITOR"].includes(data.role)) return null;
    const configured = configuredUsers().find((u) => u.username === data.sub && !u.disabled);
    if (!configured || configured.role !== data.role) return null;
    return { username: data.sub, role: data.role };
  } catch {
    return null;
  }
}

export function hasPermission(role: Role, permission: string): boolean {
  return PERMISSIONS[role]?.includes(permission) ?? false;
}

export function permissions(role: Role): string[] {
  return [...(PERMISSIONS[role] || [])];
}

export function authHealth() {
  return {
    enabled: true,
    secret_configured: Boolean(SECRET && SECRET.length >= 32),
    user_count: configuredUsers().filter((u) => !u.disabled).length,
    ttl_seconds: TTL_SECONDS,
    roles: Object.fromEntries(Object.entries(PERMISSIONS).map(([role, values]) => [role, values])),
  };
}
