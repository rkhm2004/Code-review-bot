import { z } from "zod";
import { server } from "../../server/mcp.js";
import { octokit } from "../../utils/octokit.js";

server.tool(
  "post_pr_review",
  "Submits a formal PR review (Approve, Request Changes, or Comment) with a summary",
  {
    owner: z.string(),
    repo: z.string(),
    pull_number: z.number(),
    event: z.enum(["APPROVE", "REQUEST_CHANGES", "COMMENT"]).describe("The type of review action"),
    body: z.string().describe("The overall review summary body in markdown format"),
  },
  async ({ owner, repo, pull_number, event, body }) => {
    try {
      const { data } = await octokit.pulls.createReview({
        owner,
        repo,
        pull_number,
        event,
        body,
      });

      return {
        content: [{ type: "text", text: `Review submitted successfully! Status: ${event}. Review ID: ${data.id}` }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error submitting overall review: ${error.message}` }],
        isError: true,
      };
    }
  }
);