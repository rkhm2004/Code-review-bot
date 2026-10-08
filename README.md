# CS4 — Secure Code Debugging & Review Assistant

This repository implements Case Study 4 as a local/private, evidence-driven code debugging and security review assistant.

## Final architecture

```text
Authenticated User
      |
      v
Next.js Dashboard  <---- Login / RBAC role
      |
      v
Fastify Review Gateway
  |        |        |
  |        |        +--> Report / Metrics
  |        +-----------> GitHub PR/Diff (authorized repositories only)
  v
Private Docker Network
      |
      v
Local Python Analysis Service
  |
  +--> Language + syntax validation
  +--> Function/module/dependency analysis
  +--> Control-flow analysis
  +--> Compiler / static-analysis / runtime evidence
  +--> Deterministic secure/MISRA-oriented rules
  +--> Local Sentence-Transformer embeddings
  +--> FAISS RAG
  |      +--> approved guidance
  |      +--> historical ACCEPTED findings
  |          (sanitized metadata only)
  +--> Optional local Ollama LLM
  +--> Encrypted SQLite audit/disposition store
  |
  v
Structured Findings
  +--> evidence / file / line
  +--> severity / confidence
  +--> root-cause hypothesis
  +--> rule reference
  +--> remediation
  +--> status
  |
  v
Qualified Human Reviewer
  +--> Accept
  +--> Edit/Validate
  +--> Reject
  |
  +--> approved finding becomes eligible historical RAG knowledge
```

Automatic merge/release approval is disabled.

## Implemented CS4 requirements

### 1. Authentication and RBAC

The gateway uses signed bearer tokens and role-based permissions.

- ADMIN: analyze, validate, disposition, audit, report
- REVIEWER: analyze, validate, disposition, audit, report
- DEVELOPER: analyze, validate, report
- AUDITOR: audit, report

The dashboard has an authentication screen. Operational API endpoints reject unauthenticated requests.

### 2. Repository-aware retrieval and authorization

GitHub PR/diff/file retrieval is preserved. Repository access is restricted by `ALLOWED_REPOSITORIES`, and parent-path traversal is rejected.

### 3. Code understanding

The analysis service reports:

- detected language
- line count
- functions and function ranges
- imports/includes
- dependency statements
- call dependencies
- control-flow counts
- estimated nesting/indentation depth
- module summary

### 4. Evidence-driven debugging

The service accepts:

- source code
- compiler/build logs
- static-analysis output
- runtime logs

Findings include evidence, severity, confidence, root-cause hypothesis, recommendation and status.

### 5. Local/private RAG

RAG uses Sentence Transformers + FAISS locally.

The corpus contains:

1. approved CS4/MISRA-oriented/security guidance
2. historical findings that were explicitly accepted by a human reviewer

Historical entries are sanitized. Source-code bodies and source snippets are never persisted for RAG.

### 6. Human oversight and audit

Acceptance requires source validation first. Dispositions are written to SQLite audit storage.

Automatic merge is blocked.

Reviewer notes and structured audit details can be encrypted with `CS4_AUDIT_ENCRYPTION_KEY`.

### 7. Formal evaluation

The versioned evaluation set is:

- `evaluation/dataset.jsonl`

The evaluation runner computes:

- detection precision
- detection recall
- detection F1
- severity accuracy
- retrieval Hit@1
- retrieval Hit@3
- retrieval Hit@5
- retrieval MRR

Run:

```bash
python evaluation/run_evaluation.py
```

The resulting `evaluation/metrics.json` is the reproducible evaluation artifact.

### 8. Dedicated report export

The analysis service exposes `POST /report` through the authenticated gateway.

The dashboard provides **Export Markdown Report**, producing a structured review report containing:

- status and finding counts
- code/dependency understanding
- control-flow summary
- evidence
- root-cause hypotheses
- recommendations
- governance status

### 9. Deployment security

Docker Compose separates:

- `cs4_edge`: frontend + gateway
- `cs4_private`: gateway + analysis service

The analysis service is not published to the host.

See `SECURITY_DEPLOYMENT.md` for authentication, secrets, encryption, network isolation and repository authorization controls.

## Configuration

Create a local `.env` file and set real values. Do not commit `.env` or any secret-bearing configuration.

Required production controls:

```text
GITHUB_TOKEN=...
ALLOWED_REPOSITORIES=owner/repository
CS4_AUTH_SECRET=at-least-32-random-characters
CS4_ADMIN_USERNAME=admin
CS4_ADMIN_PASSWORD=strong-password
CS4_AUDIT_ENCRYPTION_KEY=...
```

For multiple roles, configure `CS4_USERS_JSON` with scrypt password verifiers.

Never commit secrets.

## Run

```bash
docker compose build
docker compose up -d
docker compose ps
```

Services:

- Dashboard: http://localhost:3000
- Gateway: http://localhost:3001
- Analysis service: private Docker network only

Open the dashboard and sign in before running analysis.

## Core review flow

1. Authenticate.
2. Select authorized repository/PR or paste source.
3. Supply compiler, static-analysis or runtime evidence when available.
4. Run local analysis.
5. Inspect code structure, dependencies, control flow and RAG guidance.
6. Review evidence-based findings and root-cause hypotheses.
7. Validate source before accepting a finding.
8. Accept/Edit/Validate/Reject.
9. Accepted findings become eligible historical RAG knowledge.
10. Export the formal review report.

## Privacy and governance

Source code is processed locally by the analysis service. The audit database does not persist source-code bodies or snippets. Repository content is treated as untrusted evidence and cannot override the review policy.

AI output is advisory. Qualified engineering reviewers remain responsible for compliance, design and release decisions.

## Evaluation and demo evidence

Keep the final submission evidence focused on:

- authenticated login and role
- authorized repository retrieval
- local FAISS retrieval
- finding evidence and confidence
- dependency/control-flow summary
- compiler/static/runtime evidence
- human disposition
- historical approved-finding retrieval
- evaluation metrics
- exported report
- network/security controls

Submission packaging should be created only after the final implementation is tested.
