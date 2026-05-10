import { server } from "../../server/mcp.js"; // Fixes "Cannot find name 'server'"
import { z } from "zod";
import { exec } from "node:child_process"; // Using node: prefix for 2026 standards
import { promisify } from "node:util";

const execAsync = promisify(exec);

// Use an interface to fix the 'any' error for the tool arguments
interface LintArgs {
  target_path: string;
}

server.tool(
  "run_lint", 
  "Runs ESLint on a specific file or directory to find syntax/style errors", 
  { 
    target_path: z.string().describe("The file or directory path to lint (e.g., src/index.ts)") 
  }, 
  async ({ target_path }: LintArgs) => {
    try {
      // Run the linter command
      const { stdout } = await execAsync(`npx eslint ${target_path}`);
      
      return { 
        content: [{ 
          type: "text", 
          text: `Linting passed successfully:\n${stdout || "No issues found."}` 
        }] 
      };
    } catch (error: any) {
      // Linters exit with a non-zero code when errors are found.
      // We capture stdout/stderr to give the AI the actual linting report.
      const lintOutput = error.stdout || error.stderr || error.message;
      
      return { 
        content: [{ 
          type: "text", 
          text: `Linting found issues that need to be addressed:\n\n${lintOutput}` 
        }] 
      };
    }
  }
);