#  Agentic Code Review Dashboard

SentinelReview is a high-performance, futuristic AI-powered code analysis tool. It utilizes the **Model Context Protocol (MCP)** to deploy an autonomous agent that audits GitHub Pull Requests for bugs, security flaws, and syntax errors, displaying the results in a beautiful, glassmorphism-styled dashboard.

## 🚀 Overview

Traditional code reviews are manual and time-consuming. SentinelReview acts as an automated, agentic teammate. By simply pasting a GitHub PR URL into the dashboard, the backend MCP server fetches the diffs, runs local linting, and feeds the context to an AI engine (like Claude 3.5 or GPT-4o). The dashboard provides a live feed of the agent's "thoughts" and highlights critical security findings alongside the code diff.

## 💻 Tech Stack

### Frontend (Mission Control)
* **Framework:** Next.js 15 (App Router) & React 19
* **Styling:** Tailwind CSS (Dark theme, Glassmorphism)
* **Animations:** Framer Motion & tsParticles (Animated Background)
* **Icons:** Lucide React
* **Components:** React Diff Viewer Continued (Code diffing)
* **State Management:** Zustand & TanStack React Query

### Backend (MCP Agentic Server)
* **Runtime:** Node.js (v20+) & TypeScript (ESM)
* **Server:** Fastify (Handling SSE - Server-Sent Events)
* **Protocol:** Model Context Protocol (MCP) SDK
* **Validation:** Zod
* **Integrations:** Octokit (GitHub API), Child Process (ESLint execution)

### Infrastructure
* **Containerization:** Docker & Docker Compose
* **OS Environment:** Alpine Linux

## 📂 Project Structure

```text
code-review-bot-mcp/
├── .env                 # Environment variables (GitHub Token, Ports)
├── docker-compose.yml   # Multi-container orchestration
├── README.md
├── frontend/            # Next.js 15 Dashboard
│   ├── app/             # App Router (Pages & Layout)
│   ├── components/      # UI Components (DiffViewer, PRInput, etc.)
│   ├── lib/             # API connections to Fastify
│   ├── Dockerfile
│   └── package.json
└── mcp-server/          # Fastify + MCP Backend
    ├── src/
    │   ├── config/      # Env loading
    │   ├── server/      # MCP Server Initialization
    │   ├── tools/       # Agent Tools (GitHub fetch, Linting, etc.)
    │   └── index.ts     # Fastify SSE entry point
    ├── Dockerfile
    ├── tsconfig.json
    └── package.json
