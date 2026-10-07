import { server } from "../../server/mcp.js";
import { z } from "zod";
import { spawn } from "node:child_process";

interface LintArgs { target_path: string; }

function safeTarget(value: string): string {
  const target = value.trim();
  if (!target || target.startsWith("-") || target.includes("..") || new RegExp("[;&|$<>]").test(target)) {
    throw new Error("Unsafe lint target path.");
  }
  return target;
}

server.tool(
  "run_lint",
  "Runs ESLint on an approved relative path without shell interpolation.",
  { target_path: z.string().describe("Approved relative file or directory path") },
  async ({ target_path }: LintArgs) => {
    try {
      const target = safeTarget(target_path);
      const output = await new Promise<string>((resolve, reject) => {
        const child = spawn("npx", ["eslint", "--no-error-on-unmatched-pattern", target], {
          shell: false,
          cwd: process.cwd(),
        });
        let stdout = "";
        let stderr = "";
        child.stdout.on("data", chunk => { stdout += chunk.toString(); });
        child.stderr.on("data", chunk => { stderr += chunk.toString(); });
        child.on("error", reject);
        child.on("close", code => {
          const text = stdout || stderr || "No issues found.";
          resolve(code && code !== 0 ? `Linting found issues:\n\n${text}` : `Linting passed:\n${text}`);
        });
      });
      return { content: [{ type: "text", text: output }] };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Linting failed safely: ${error.message}` }], isError: true };
    }
  }
);
