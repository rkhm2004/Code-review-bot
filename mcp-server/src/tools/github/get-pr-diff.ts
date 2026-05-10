import { z } from "zod";
import { server } from "../../server/mcp.js";
import { octokit } from "../../utils/octokit.js";

server.tool(
  "get_pr_diff",
  "Fetches the raw diff of a Pull Request to see code changes",
  {
    owner: z.string().describe("Repository owner (username or organization)"),
    repo: z.string().describe("Repository name"),
    pull_number: z.number().describe("The Pull Request number"),
  },
  async ({ owner, repo, pull_number }) => {
    try {
      const { data } = await octokit.pulls.get({
        owner,
        repo,
        pull_number,
        mediaType: { format: "diff" }, // This tells GitHub to return the diff text
      });

      return {
        content: [{ type: "text", text: data as unknown as string }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error fetching diff: ${error.message}` }],
        isError: true,
      };
    }
  }
);