import { z } from "zod";
import { server } from "../../server/mcp.js";
import { octokit } from "../../utils/octokit.js";

server.tool(
  "post_review_comment",
  "Posts a single inline comment on a specific line of code in a Pull Request",
  {
    owner: z.string(),
    repo: z.string(),
    pull_number: z.number(),
    body: z.string().describe("The markdown-formatted comment text (e.g., pointing out a bug)"),
    commit_id: z.string().describe("The SHA of the latest commit in the PR"),
    path: z.string().describe("The relative path to the file being commented on"),
    line: z.number().describe("The specific line number in the file to comment on"),
  },
  async ({ owner, repo, pull_number, body, commit_id, path, line }) => {
    try {
      const { data } = await octokit.pulls.createReviewComment({
        owner,
        repo,
        pull_number,
        body,
        commit_id,
        path,
        line,
      });

      return {
        content: [{ type: "text", text: `Comment successfully posted at line ${line}. Comment ID: ${data.id}` }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error posting inline comment: ${error.message}` }],
        isError: true,
      };
    }
  }
);