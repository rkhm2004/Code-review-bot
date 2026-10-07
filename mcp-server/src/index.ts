import Fastify from "fastify";
import cors from "@fastify/cors";
import "dotenv/config";
import { authenticate, authHealth, createToken, hasPermission, permissions, verifyToken, type AuthUser, type Role } from "./auth.js";

const app = Fastify({ logger: true });
const listeners = new Set<(data: unknown) => void>();
let currentReview: any = null;

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const ANALYSIS_SERVICE_URL = process.env.ANALYSIS_SERVICE_URL || "http://analysis-service:8000";
const PORT = Number(process.env.PORT || 3001);
const ALLOWED_REPOSITORIES = (process.env.ALLOWED_REPOSITORIES || "").split(",").map(v => v.trim()).filter(Boolean);

function repositoryAllowed(owner: string, repo: string): boolean {
  if (!ALLOWED_REPOSITORIES.length) return false;
  return ALLOWED_REPOSITORIES.includes(`${owner}/${repo}`);
}
function broadcast(data: unknown) { for (const listener of listeners) listener(data); }
function githubHeaders(accept = "application/vnd.github+json") {
  return { Accept: accept, "User-Agent": "CS4-Secure-Code-Review-Assistant", Authorization: `Bearer ${GITHUB_TOKEN}` };
}
function bearer(req: any): AuthUser | null {
  const value = String(req.headers.authorization || "");
  if (!value.startsWith("Bearer ")) return null;
  return verifyToken(value.slice(7));
}
function requirePermission(req: any, reply: any, permission: string): AuthUser | null {
  const user = bearer(req);
  if (!user) { reply.code(401).send({ error: "Authentication required." }); return null; }
  if (!hasPermission(user.role, permission)) { reply.code(403).send({ error: "Insufficient role permissions.", required_permission: permission, role: user.role }); return null; }
  return user;
}

app.register(cors, { origin: true });

app.get("/health", async (_req, reply) => {
  try {
    const response = await fetch(`${ANALYSIS_SERVICE_URL}/health`);
    const analysis = await response.json();
    return reply.send({ status: "ok", service: "cs4-review-gateway", authentication: authHealth(), analysis_service: analysis, automatic_merge: false, human_review_required: true });
  } catch {
    return reply.code(503).send({ status: "degraded", service: "cs4-review-gateway", authentication: authHealth(), analysis_service: "unavailable", automatic_merge: false, human_review_required: true });
  }
});

app.post("/auth/login", async (req: any, reply) => {
  const { username, password } = req.body || {};
  if (!username || !password) return reply.code(400).send({ error: "username and password are required." });
  const user = authenticate(String(username), String(password));
  if (!user) return reply.code(401).send({ error: "Invalid username or password." });
  try {
    return reply.send({ access_token: createToken(user), token_type: "bearer", expires_in: Number(process.env.CS4_AUTH_TTL_SECONDS || 3600), user: { ...user, permissions: permissions(user.role) } });
  } catch (error: any) {
    return reply.code(503).send({ error: error.message || "Authentication is not configured." });
  }
});

app.get("/auth/me", async (req: any, reply) => {
  const user = bearer(req);
  if (!user) return reply.code(401).send({ error: "Authentication required." });
  return reply.send({ user: { ...user, permissions: permissions(user.role) } });
});

app.get("/sse", async (req: any, reply: any) => {
  if (!requirePermission(req, reply, "analyze")) return;
  reply.raw.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive", "Access-Control-Allow-Origin": "*" });
  const listener = (data: unknown) => reply.raw.write(`event: message\ndata: ${JSON.stringify(data)}\n\n`);
  listeners.add(listener);
  if (currentReview) listener(currentReview);
  req.raw.on("close", () => listeners.delete(listener));
});

app.get("/diff", async (req: any, reply) => {
  if (!requirePermission(req, reply, "analyze")) return;
  try {
    const { owner, repo, pull_number } = req.query || {};
    if (!owner || !repo || !pull_number) return reply.code(400).send({ error: "owner, repo and pull_number are required" });
    if (!repositoryAllowed(String(owner), String(repo))) return reply.code(403).send({ error: "Repository is not authorized for this deployment." });
    const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${encodeURIComponent(pull_number)}`, { headers: githubHeaders("application/vnd.github.v3.diff") });
    if (!response.ok) return reply.code(response.status).send({ error: `GitHub returned ${response.status}` });
    return reply.send({ diff: await response.text() });
  } catch (error: any) { return reply.code(500).send({ error: error.message || "Failed to fetch PR diff" }); }
});

app.get("/file", async (req: any, reply) => {
  if (!requirePermission(req, reply, "analyze")) return;
  try {
    const { owner, repo, path, ref } = req.query || {};
    if (!owner || !repo || !path) return reply.code(400).send({ error: "owner, repo and path are required" });
    if (!repositoryAllowed(String(owner), String(repo))) return reply.code(403).send({ error: "Repository is not authorized for this deployment." });
    if (String(path).includes("..")) return reply.code(400).send({ error: "Parent-path traversal is not allowed." });
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${String(path).split("/").map(encodeURIComponent).join("/")}${ref ? `?ref=${encodeURIComponent(ref)}` : ""}`;
    const response = await fetch(url, { headers: githubHeaders() });
    const data: any = await response.json();
    if (!response.ok) return reply.code(response.status).send({ error: data.message || "GitHub file retrieval failed" });
    if (!data.content) return reply.code(400).send({ error: "Selected path is not a text file." });
    return reply.send({ path, ref: ref || "default", content: Buffer.from(String(data.content).replace(/\n/g, ""), "base64").toString("utf8") });
  } catch (error: any) { return reply.code(500).send({ error: error.message || "Failed to retrieve repository file" }); }
});

async function proxy(req: any, reply: any, path: string, permission: string, method = "GET") {
  const user = requirePermission(req, reply, permission);
  if (!user) return;
  try {
    const response = await fetch(`${ANALYSIS_SERVICE_URL}${path}`, {
      method,
      headers: { "Content-Type": "application/json", "X-CS4-User": user.username, "X-CS4-Role": user.role },
      ...(method === "POST" ? { body: JSON.stringify(req.body || {}) } : {}),
    });
    return reply.code(response.status).send(await response.json());
  } catch (error: any) { return reply.code(503).send({ error: error.message || "Analysis service unavailable" }); }
}

app.post("/analyze", async (req, reply) => {
  const user = requirePermission(req, reply, "analyze"); if (!user) return;
  try {
    const response = await fetch(`${ANALYSIS_SERVICE_URL}/analyze`, { method: "POST", headers: { "Content-Type": "application/json", "X-CS4-User": user.username, "X-CS4-Role": user.role }, body: JSON.stringify(req.body || {}) });
    const data = await response.json();
    currentReview = { type: "review_complete", content: data };
    broadcast(currentReview);
    return reply.code(response.status).send(data);
  } catch (error: any) { return reply.code(503).send({ error: error.message || "Analysis service unavailable" }); }
});

app.post("/validate", (req, reply) => proxy(req, reply, "/validate", "validate", "POST"));
app.post("/disposition", (req, reply) => proxy(req, reply, "/disposition", "disposition", "POST"));
app.get("/audit", (req, reply) => proxy(req, reply, `/audit?limit=${encodeURIComponent(String((req.query as any)?.limit || "100"))}`, "audit"));
app.get("/metrics", (req, reply) => proxy(req, reply, "/metrics", "audit"));
app.post("/report", (req, reply) => proxy(req, reply, "/report", "report", "POST"));
app.get("/evaluation", (req, reply) => proxy(req, reply, "/evaluation", "audit"));

app.post("/approve", async (req, reply) => {
  if (!requirePermission(req, reply, "disposition")) return;
  return reply.code(403).send({ error: "Automatic merge is disabled for CS4. A qualified human reviewer must validate and dispose findings first." });
});

app.listen({ port: PORT, host: "0.0.0.0" })
  .then(() => console.log(`CS4 review gateway listening on http://localhost:${PORT}`))
  .catch((error) => { app.log.error(error); process.exit(1); });
