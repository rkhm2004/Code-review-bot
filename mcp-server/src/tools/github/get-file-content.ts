import { z } from "zod";
import { server } from "../../server/mcp.js";
import { octokit } from "../../utils/octokit.js";

server.tool(
  "get_file_content",
  "Fetches the full content of a specific file from the repository",
  {
    owner: z.string(),
    repo: z.string(),
    path: z.string().describe("Path to the file (e.g., src/index.ts)"),
    ref: z.string().optional().describe("Branch name or commit SHA. Defaults to main/master if omitted."),
  },
  async ({ owner, repo, path, ref }) => {
    try {
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path,
        ref,
      });

      // GitHub returns directory listings differently, so we ensure it's a file
      if (!('content' in data)) {
          throw new Error("The requested path is a directory, not a file.");
      }

      // GitHub returns content encoded in Base64. We must decode it to plain text.
      const decodedContent = Buffer.from(data.content, "base64").toString("utf8");

      return {
        content: [{ type: "text", text: decodedContent }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error fetching file content: ${error.message}` }],
        isError: true,
      };
    }
  }
);