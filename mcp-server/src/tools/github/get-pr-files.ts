import { z } from "zod";
import { server } from "../../server/mcp.js";
import { octokit } from "../../utils/octokit.js";

server.tool(
  "get_pr_files",
  "Lists all files changed in a Pull Request",
  {
    owner: z.string(),
    repo: z.string(),
    pull_number: z.number(),
  },
  async ({ owner, repo, pull_number }) => {
    try {
      const { data } = await octokit.pulls.listFiles({
        owner,
        repo,
        pull_number,
      });

      const fileList = data.map(f => `${f.status.toUpperCase()}: ${f.filename} (+${f.additions} -${f.deletions})`).join("\n");

      return {
        content: [{ type: "text", text: `Files changed in PR #${pull_number}:\n${fileList}` }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error listing files: ${error.message}` }],
        isError: true,
      };
    }
  }
);