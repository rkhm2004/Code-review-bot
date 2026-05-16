import Fastify from 'fastify';
import cors from '@fastify/cors';
import { EventEmitter } from 'events';
import 'dotenv/config';

// ============================================================================
// GLOBAL CONFIGURATION & STATE
// ============================================================================
const app = Fastify();
const messageBus = new EventEmitter();

let currentDiffData = "";
let cleanAiPatchedCode = "";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";

// Enable CORS
app.register(cors, { origin: true });

// ============================================================================
// SERVER-SENT EVENTS (SSE)
// ============================================================================
app.get('/sse', async (req: any, res: any) => {
  res.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  res.raw.write(`event: endpoint\ndata: /message\n\n`);

  const onMessage = (data: any) => {
    res.raw.write(`event: message\ndata: ${JSON.stringify(data)}\n\n`);
  };

  messageBus.on('ai_response', onMessage);

  req.raw.on('close', () => {
    messageBus.off('ai_response', onMessage);
  });
});

// ============================================================================
// FETCH PULL REQUEST DIFF
// ============================================================================
app.get('/diff', async (req: any, res: any) => {
  try {
    const { owner, repo, pull_number } = req.query;

    if (!owner || !repo || !pull_number) {
      return res.status(400).send({
        error: 'Missing required parameters'
      });
    }

    console.log(
      `🔍 Fetching PR diff for ${owner}/${repo} #${pull_number}`
    );

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${pull_number}`,
      {
        headers: {
          Accept: 'application/vnd.github.v3.diff',
          'User-Agent': 'Sentinel-AI-Review-Bot',
          Authorization: `Bearer ${GITHUB_TOKEN}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(
        `GitHub API failed with status ${response.status}`
      );
    }

    const diffData = await response.text();

    currentDiffData = diffData;

    console.log(
      `✅ Diff downloaded successfully (${diffData.length} bytes)`
    );

    return res.send({
      diff: diffData
    });

  } catch (error: any) {

    console.error(
      '❌ FAILED TO FETCH DIFF:',
      error.message
    );

    return res.status(500).send({
      error: 'Failed to fetch PR diff',
      details: error.message
    });
  }
});

// ============================================================================
// GROQ AI REVIEW ENDPOINT
// ============================================================================
app.post('/message', async (req: any, res: any) => {

  const body = req.body;

  if (
    body?.method === 'tools/call' &&
    body?.params?.name === 'get_pr_diff'
  ) {

    console.log('🤖 Running Groq AI security audit...');

    res.send({
      status: 'processing'
    });

    try {

      if (!currentDiffData) {
        throw new Error(
          'No pull request diff available. Load a PR first.'
        );
      }

      const groqResponse = await fetch(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          method: 'POST',

          headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },

          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",

            messages: [
              {
                role: 'system',
                content:
                  'You are an elite DevSecOps AI agent. Analyze the provided git diff for vulnerabilities including SQL injection, command injection, insecure dependencies, cleartext logging, and hardcoded secrets. Then generate a secure production-ready fixed version.'
              },

              {
                role: 'user',
                content:
                  `Analyze this pull request diff:\n\n${currentDiffData}`
              }
            ],

            temperature: 0.2
          })
        }
      );

      if (!groqResponse.ok) {

        const errPayload = await groqResponse.json();

        throw new Error(
          errPayload.error?.message || 'Groq API failed'
        );
      }

      const groqData = await groqResponse.json();

      const aiMarkdownOutput =
        groqData.choices?.[0]?.message?.content || "";

      // ============================================================================
      // EXTRACT CODE BLOCK
      // ============================================================================

      const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)```/;

      const match = aiMarkdownOutput.match(codeBlockRegex);

      if (match && match[1]) {
        cleanAiPatchedCode = match[1].trim();
      } else {
        cleanAiPatchedCode = aiMarkdownOutput;
      }

      console.log('✅ AI review completed successfully');

      // Send live SSE update
      messageBus.emit('ai_response', {
        type: 'review_complete',
        content: aiMarkdownOutput,
        patchedCode: cleanAiPatchedCode
      });

    } catch (error: any) {

      console.error(
        '❌ GROQ REVIEW FAILED:',
        error.message
      );

      messageBus.emit('ai_response', {
        type: 'error',
        message: error.message
      });
    }
  }

  return;
});

// ============================================================================
// START SERVER
// ============================================================================
const startServer = async () => {

  try {

    await app.listen({
      port: 3001,
      host: '0.0.0.0'
    });

    console.log('🚀 MCP Server running on port 3001');

  } catch (error) {

    console.error('❌ SERVER FAILED TO START:', error);

    process.exit(1);
  }
};

startServer();