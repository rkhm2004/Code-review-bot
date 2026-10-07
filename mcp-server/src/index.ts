import Fastify from "fastify";
import cors from "@fastify/cors";
import "dotenv/config";

const app = Fastify({ logger: true });
const listeners = new Set<(data: unknown) => void>();
let currentReview: any = null;

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const ANALYSIS_SERVICE_URL = process.env.ANALYSIS_SERVICE_URL || "http://analysis-service:8000";
const PORT = Number(process.env.PORT || 3001);
const ALLOWED_REPOSITORIES = (process.env.ALLOWED_REPOSITORIES || "").split(",").map(v => v.trim()).filter(Boolean);

function repositoryAllowed(owner: string, repo: string): boolean {
  if (!ALLOWED_REPOSITORIES.length) return true;
  return ALLOWED_REPOSITORIES.includes(`${owner}/${repo}`);
}

app.register(cors, { origin: true });

function broadcast(data: unknown) {
  for (const listener of listeners) listener(data);
}

function githubHeaders(accept = "application/vnd.github+json") {
  return {
    Accept: accept,
    "User-Agent": "CS4-Secure-Code-Review-Assistant",
    Authorization: `Bearer ${GITHUB_TOKEN}`,
  };
}

app.get("/health", async (_req, reply) => {
  try {
    const response = await fetch(`${ANALYSIS_SERVICE_URL}/health`);
    const analysis = await response.json();
    return reply.send({
      status: "ok",
      service: "cs4-review-gateway",
      analysis_service: analysis,
      automatic_merge: false,
      human_review_required: true,
    });
  } catch {
    return reply.code(503).send({
      status: "degraded",
      service: "cs4-review-gateway",
      analysis_service: "unavailable",
      automatic_merge: false,
      human_review_required: true,
    });
  }
});

app.get("/sse", async (req: any, reply: any) => {
  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  const listener = (data: unknown) => {
    reply.raw.write(`event: message\ndata: ${JSON.stringify(data)}\n\n`);
  };
  listeners.add(listener);

  if (currentReview) listener(currentReview);

  req.raw.on("close", () => listeners.delete(listener));
});

app.get("/diff", async (req: any, reply) => {
  try {
    const { owner, repo, pull_number } = req.query || {};
    if (!owner || !repo || !pull_number) {
      return reply.code(400).send({ error: "owner, repo and pull_number are required" });
    }
    if (!repositoryAllowed(String(owner), String(repo))) return reply.code(403).send({ error: "Repository is not authorized for this deployment." });

    const response = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${encodeURIComponent(pull_number)}`,
      { headers: githubHeaders("application/vnd.github.v3.diff") }
    );

    if (!response.ok) {
      return reply.code(response.status).send({ error: `GitHub returned ${response.status}` });
    }

    return reply.send({ diff: await response.text() });
  } catch (error: any) {
    return reply.code(500).send({ error: error.message || "Failed to fetch PR diff" });
  }
});


app.get("/file", async (req: any, reply) => {
  try {
    const { owner, repo, path, ref } = req.query || {};
    if (!owner || !repo || !path) {
      return reply.code(400).send({ error: "owner, repo and path are required" });
    }
    if (!repositoryAllowed(String(owner), String(repo))) return reply.code(403).send({ error: "Repository is not authorized for this deployment." });
    if (String(path).includes("..")) return reply.code(400).send({ error: "Parent-path traversal is not allowed." });
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${String(path).split("/").map(encodeURIComponent).join("/")}${ref ? `?ref=${encodeURIComponent(ref)}` : ""}`;
    const response = await fetch(url, { headers: githubHeaders() });
    const data: any = await response.json();
    if (!response.ok) return reply.code(response.status).send({ error: data.message || "GitHub file retrieval failed" });
    if (!data.content) return reply.code(400).send({ error: "Selected path is not a text file." });
    const source = Buffer.from(String(data.content).replace(/\n/g, ""), "base64").toString("utf8");
    return reply.send({ path, ref: ref || "default", content: source });
  } catch (error: any) {
    return reply.code(500).send({ error: error.message || "Failed to retrieve repository file" });
  }
});

app.post("/analyze", async (req: any, reply) => {
  try {
    const response = await fetch(`${ANALYSIS_SERVICE_URL}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body || {}),
    });
    const data = await response.json();
    currentReview = { type: "review_complete", content: data };
    broadcast(currentReview);
    return reply.code(response.status).send(data);
  } catch (error: any) {
    const payload = { error: error.message || "Analysis service unavailable" };
    currentReview = { type: "error", content: payload };
    broadcast(currentReview);
    return reply.code(503).send(payload);
  }
});


app.post("/validate", async (req: any, reply) => {
  try {
    const response = await fetch(`${ANALYSIS_SERVICE_URL}/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body || {}),
    });
    return reply.code(response.status).send(await response.json());
  } catch (error: any) {
    return reply.code(503).send({ error: error.message || "Validation service unavailable" });
  }
});

app.get("/audit", async (req: any, reply) => {
  try {
    const query = req.query || {};
    const limit = encodeURIComponent(String(query.limit || "100"));
    const response = await fetch(`${ANALYSIS_SERVICE_URL}/audit?limit=${limit}`);
    return reply.code(response.status).send(await response.json());
  } catch (error: any) {
    return reply.code(503).send({ error: error.message || "Audit service unavailable" });
  }
});


app.post("/disposition", async (req: any, reply) => {
  try {
    const response = await fetch(`${ANALYSIS_SERVICE_URL}/disposition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body || {}),
    });
    return reply.code(response.status).send(await response.json());
  } catch (error: any) {
    return reply.code(503).send({ error: error.message || "Analysis service unavailable" });
  }
});

// CS4 governance: automatic commit/merge is intentionally disabled.
app.post("/approve", async (_req, reply) => {
  return reply.code(403).send({
    error: "Automatic merge is disabled for CS4. A qualified human reviewer must validate and dispose findings first.",
  });
});

app.listen({ port: PORT, host: "0.0.0.0" })
  .then(() => console.log(`CS4 review gateway listening on http://localhost:${PORT}`))
  .catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
