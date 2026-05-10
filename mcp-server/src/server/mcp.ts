import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { config } from "../config/index.js"; // Note the .js extension

export const server = new McpServer({
  name: "code-review-bot-mcp",
  version: "1.0.0",
});

server.tool(
  "health_check",
  "Checks if the MCP server and GitHub configuration are active",
  {},
  async () => {
    return {
      content: [{
        type: "text",
        text: `Active. GitHub Token: ${config.GITHUB_TOKEN ? "Present" : "Missing"}`
      }]
    };
  }
);