import Fastify, { FastifyRequest, FastifyReply } from "fastify";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { server } from "./server/mcp.js";

const fastify = Fastify();

// Explicitly type the parameters to fix "Implicit Any" errors
fastify.get("/sse", async (request: FastifyRequest, reply: FastifyReply) => {
  const transport = new SSEServerTransport("/messages", reply.raw);
  await server.connect(transport);
});

fastify.post("/messages", async (request: FastifyRequest, reply: FastifyReply) => {
  // logic...
});