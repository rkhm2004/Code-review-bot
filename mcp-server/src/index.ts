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
        'User-Agent': 'Sentinel-AI-Review-Bot'
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
    return res.status(500).send({ error: "Failed to fetch from GitHub", details: error.message });
  }
});

// ============================================================================
// 4. THE AI MCP TOOL HANDLER
// ============================================================================
app.post('/message', async (req: any, res: any) => {
  const body = req.body;
  
  if (body?.method === 'tools/call' && body?.params?.name === 'get_pr_diff') {
    console.log("🤖 Agent received request to review code...");
    
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
      
      messageBus.emit('ai_response', simulatedAiReview);
      console.log("✅ Agent sent review back to UI");
    }, 2000);
    
    return res.send({ status: "processing" });
  }

  return res.status(404).send({ error: "Tool not found" });
});

// ============================================================================
// 5. GITHUB REAL MERGE ENDPOINT
// ============================================================================
app.post('/approve', async (req: any, res: any) => {
  // 🚨 PASTE YOUR REAL GITHUB TOKEN HERE 🚨
  const GITHUB_TOKEN = ""; 
  
  try {
    const { owner, repo, pull_number } = req.body;
    
    if (!owner || !repo || !pull_number) {
      return res.status(400).send({ error: "Missing PR details" });
    }

    console.log(`🚀 Approving & Merging PR #${pull_number} for ${owner}/${repo}...`);

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${pull_number}/merge`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      body: JSON.stringify({
        commit_title: `🛡️ Sentinel AI: Merged PR #${pull_number} securely.`,
        merge_method: 'merge'
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "GitHub rejected the merge.");
    }

    console.log("✅ GitHub Merge Success:", data.message);
    return res.send({ success: true, message: data.message });

  } catch (error: any) {
    console.error('❌ FAILED TO MERGE:', error.message);
    return res.status(500).send({ error: error.message });
  }
});

// ============================================================================
// 6. THE LOUD & SAFE STARTUP SCRIPT
// ============================================================================
const start = async () => {
  try {
    await app.listen({ port: 3001, host: '0.0.0.0' });
    console.log('\n=========================================');
    console.log('🚀 SENTINEL AI BACKEND IS ALIVE NATIVELY!');
    console.log('📡 Listening on http://localhost:3001');
    console.log('=========================================\n');
  } catch (err) {
    console.error('🔥 SERVER CRASHED ON STARTUP:', err);
    process.exit(1);
  }
};

start();