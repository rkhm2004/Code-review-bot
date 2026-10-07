# CS4 Secure Code Debugging & Review Assistant

This branch adapts the original code-review application for **Case Study 4: Secure Code Debugging and Review Assistant**.

## What this version implements

- Repository/PR-aware code retrieval through GitHub.
- Source-code review with structured findings.
- Code understanding: language, functions, imports/includes and basic control-flow summary.
- Compiler/build-log evidence analysis.
- Static-analysis evidence analysis.
- Runtime-log input.
- Local rule retrieval from an approved coding/security knowledge base.
- MISRA-oriented guidance summaries and secure-coding recommendations.
- Evidence, severity, confidence and finding status for every reported issue.
- Prompt-injection protection: repository content is treated as untrusted evidence.
- Human disposition workflow: Accept, Edit/Validate or Reject.
- Automatic commit/merge is deliberately disabled.
- Optional local LLM integration through Ollama; the deterministic local rule/analysis layer still works when Ollama is unavailable.
- Docker Compose deployment with separate frontend, gateway and local analysis service.

## Architecture

```text
User
  |
  v
Next.js CS4 Dashboard
  |
  v
Fastify Review Gateway
  |---------------------> GitHub PR / Diff Retrieval
  |
  v
Local Python Analysis Service
  |
  +--> Code structure analysis
  +--> Compiler/static-analysis/log evidence
  +--> Local coding/security rule retrieval
  +--> Optional Ollama local LLM
  |
  v
Structured Findings
  |
  +--> Evidence + line
  +--> Severity
  +--> Confidence
  +--> Rule reference
  +--> Recommendation
  +--> Status
  |
  v
Human Reviewer
  |
  +--> Accept
  +--> Edit/Validate
  +--> Reject
```

## Local LLM

The analysis service can call a locally running Ollama instance using:

- `OLLAMA_URL`
- `OLLAMA_MODEL`

Example:

```text
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
```

The application does not use the previous external Groq review path on this branch.

## Run

### 1. Configure GitHub access

Set `GITHUB_TOKEN` in your environment. Do not commit secrets.

### 2. Start

```bash
docker compose up --build
```

Frontend: `http://localhost:3000`

Gateway: `http://localhost:3001`

Analysis service: `http://localhost:8000`

### 3. Optional local model

Install/run Ollama on the host and pull the model configured in `OLLAMA_MODEL`. If Ollama is unavailable, the local deterministic analysis and rule retrieval continue to work.

## Requirements

Python dependencies for the local analysis service are listed in the root `requirements.txt`.

Node dependencies remain in:

- `mcp-server/package.json`
- `frontend/package.json`

## Governance

This implementation intentionally does **not** automatically modify or merge a repository after an AI finding. Findings require qualified human review and validation before acceptance.

Repository source, comments and logs are treated as untrusted input and must not override the system review policy.

## Project status

The `cs4` branch is the implementation branch for the Case Study 4 code work. Submission packaging, evaluation artifacts, screenshots, video and declarations will be prepared separately after the code implementation is validated.
