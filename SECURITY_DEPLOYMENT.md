# CS4 Security Deployment Controls

## Authentication and RBAC

The gateway now requires bearer authentication for all operational endpoints.

Roles:

- **ADMIN** — analyze, validate, disposition, audit, report, user administration.
- **REVIEWER** — analyze, validate, disposition, audit, report.
- **DEVELOPER** — analyze, validate, report.
- **AUDITOR** — audit and report.

Passwords are never stored in plaintext in configured user records. The bootstrap administrator derives a password verifier using Node.js scryptSync. Production deployments should use CS4_USERS_JSON with precomputed scrypt verifiers or protected bootstrap environment variables.

Tokens are HMAC-SHA256 signed bearer tokens with an expiry. Set CS4_AUTH_SECRET to a random value of at least 32 characters.

## Historical approved-finding RAG

Only findings explicitly given an **ACCEPTED** human disposition are eligible for the historical corpus.

The historical corpus stores sanitized metadata: finding identifier, category, severity, title, description, recommendation, rule identifier and file path. Source-code body and source evidence are not stored in the audit database and are not embedded into the historical RAG corpus.

The FAISS index fingerprint includes the approved-history corpus, so accepting a new finding causes the local corpus to rebuild on the next retrieval.

## Audit encryption

Reviewer notes and structured audit details can be encrypted with Fernet using CS4_AUDIT_ENCRYPTION_KEY.

Production requirements:
- provide a strong secret key through the deployment secret store
- never commit the key
- back it up separately from the SQLite database
- rotate it through a controlled migration procedure

The health endpoint reports whether encryption is available and explicitly reports that source code is not persisted.

## Network isolation

Docker Compose uses two networks:
- **cs4_edge** — frontend and gateway exposure.
- **cs4_private** — gateway-to-analysis communication.

The analysis service is not published to the host. Port 8000 is exposed only to the private Docker network. The gateway is the only service that reaches GitHub. Repository access is constrained by ALLOWED_REPOSITORIES.

For production, place the frontend/gateway behind HTTPS/TLS termination using a reverse proxy or institutional ingress. Do not expose the gateway over plain HTTP outside the trusted deployment boundary.

## Secret handling

Required secrets are supplied through environment variables or a deployment secret manager: GITHUB_TOKEN, CS4_AUTH_SECRET, CS4_ADMIN_PASSWORD or CS4_USERS_JSON, and CS4_AUDIT_ENCRYPTION_KEY. No source code, credentials, audit encryption key or GitHub token should be committed.

## Repository authorization

ALLOWED_REPOSITORIES is mandatory for repository-aware deployments. An empty allowlist is rejected by the gateway repository authorization check.

## Governance

Automatic merge/release approval remains disabled. Authentication and RBAC do not change the human-review requirement. All AI findings remain evidence-driven and require qualified human disposition and validation before acceptance.
