import Fastify from 'fastify';
import cors from '@fastify/cors';
import { EventEmitter } from 'events';

// ============================================================================
// 1. INITIALIZE SERVER & EVENT STREAM (The Walkie-Talkie)
// ============================================================================
const app = Fastify();
const messageBus = new EventEmitter();

// Allow the Next.js frontend on port 3000 to talk to this backend
app.register(cors, {
  origin: true
});

// ============================================================================
// 2. SERVER-SENT EVENTS (SSE) ENDPOINT
// ============================================================================
app.get('/sse', (req: any, res: any) => {
  res.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // Tell the frontend where to send its AI tool requests
  res.raw.write(`event: endpoint\ndata: /message\n\n`);

  // Listen for AI responses and send them to the frontend
  const onMessage = (data: any) => {
    res.raw.write(`event: message\ndata: ${JSON.stringify(data)}\n\n`);
  };

  messageBus.on('ai_response', onMessage);

  req.raw.on('close', () => {
    messageBus.off('ai_response', onMessage);
  });
});


// ============================================================================
// 3. THE BULLETPROOF GITHUB FETCHER
// ============================================================================
app.get('/diff', async (req: any, res: any) => {
  try {
    const { owner, repo, pull_number } = req.query;
    
    if (!owner || !repo || !pull_number) {
      return res.status(400).send({ error: "Missing required parameters" });
    }

    console.log(`\n🔍 Fetching PR Diff for: ${owner}/${repo} PR #${pull_number}`);

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${pull_number}`, {
      headers: {
        'Accept': 'application/vnd.github.v3.diff',
        'User-Agent': 'Sentinel-AI-Review-Bot',
        // 'Authorization': `Bearer ${process.env.GITHUB_TOKEN}` // Uncomment if using a private repo!
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API returned status ${response.status}: ${response.statusText}`);
    }

    const diffData = await response.text();
    console.log(`✅ Successfully downloaded diff (${diffData.length} characters)`);
    
    return res.send({ diff: diffData });

  } catch (error: any) {
    console.error('❌ FAILED TO FETCH DIFF:', error.message);
    return res.status(500).send({ 
      error: "Failed to fetch from GitHub", 
      details: error.message 
    });
  }
});


// ============================================================================
// 4. THE AI MCP TOOL HANDLER
// ============================================================================
app.post('/message', async (req: any, res: any) => {
  const body = req.body;
  
  if (body?.method === 'tools/call' && body?.params?.name === 'get_pr_diff') {
    console.log("🤖 Agent received request to review code...");
    
    // Simulate AI processing time (Replace this with your actual Groq/AI call later!)
    setTimeout(() => {
      const simulatedAiReview = {
        jsonrpc: "2.0",
        id: body.id,
        result: {
          content: [
            {
              type: "text",
              text: "### Sentinel AI Review Complete\n\nI found a few issues in the provided diff.\n\n```javascript\n// Secure version of the code\nfunction secureAuth(user, pass) {\n  // Fixed hardcoded credentials and removed eval()\n  console.log('Secure login process initialized.');\n  return true;\n}\n```"
            }
          ]
        }
      };
      
      // Emit the response back through the Walkie-Talkie to the frontend
      messageBus.emit('ai_response', simulatedAiReview);
      console.log("✅ Agent sent review back to UI");
    }, 2000);
    
    return res.send({ status: "processing" });
  }

  return res.status(404).send({ error: "Tool not found" });
});


// ============================================================================
// 5. GITHUB APPROVE & PUSH MOCK ENDPOINT
// ============================================================================
app.post('/approve', async (req: any, res: any) => {
  console.log("🚀 Received Approval! Pushing changes to GitHub...");
  // You can add your actual GitHub octokit push logic here later
  return res.send({ success: true, message: "Code successfully pushed to repository." });
});


// ============================================================================
// 6. THE LOUD & SAFE STARTUP SCRIPT
// ============================================================================
const start = async () => {
  try {
    // 0.0.0.0 is MANDATORY for Docker!
    await app.listen({ port: 3001, host: '0.0.0.0' });
    console.log('\n=========================================');
    console.log('🚀 SENTINEL AI BACKEND IS ALIVE!');
    console.log('📡 Listening on http://0.0.0.0:3001');
    console.log('=========================================\n');
  } catch (err) {
    console.error('🔥 SERVER CRASHED ON STARTUP:', err);
    process.exit(1);
  }
};

start();