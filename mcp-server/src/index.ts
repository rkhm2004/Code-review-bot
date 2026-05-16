import Fastify from 'fastify';
import cors from '@fastify/cors';
import { EventEmitter } from 'events';
import 'dotenv/config';

const app = Fastify();
const messageBus = new EventEmitter();

// Global memory cache
let currentDiffData = "";
let cleanAiPatchedCode = "";
let cachedLatestAiResult: any = null;

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";

app.register(cors, { origin: true });

// ============================================================================
// 1. SERVER-SENT EVENTS (SSE) ENDPOINT
// ============================================================================
app.get('/sse', (req: any, res: any) => {
  res.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  console.log("📺 [SSE] Frontend connected successfully.");

  res.raw.write(`event: endpoint\ndata: /message\n\n`);

  if (cachedLatestAiResult) {
    console.log("⚡ [SSE] Sending cached AI response to newly connected frontend.");
    res.raw.write(`event: message\ndata: ${JSON.stringify(cachedLatestAiResult)}\n\n`);
  }

  const onMessage = (data: any) => {
    console.log("📤 [SSE] Broadcasting AI response to frontend.");
    res.raw.write(`event: message\ndata: ${JSON.stringify(data)}\n\n`);
  };

  messageBus.on('ai_response', onMessage);

  req.raw.on('close', () => {
    console.log("🔌 [SSE] Frontend disconnected.");
    messageBus.off('ai_response', onMessage);
  });
});

// ============================================================================
// 2. DOWNLOAD PR DIFF ENDPOINT
// ============================================================================
app.get('/diff', async (req: any, res: any) => {
  try {
    const { owner, repo, pull_number } = req.query;

    if (!owner || !repo || !pull_number) {
      return res.status(400).send({ error: "Missing required parameters" });
    }

    console.log(`\n🔍 Fetching PR diff for ${owner}/${repo} #${pull_number}`);

    cachedLatestAiResult = null;
    cleanAiPatchedCode = "";

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${pull_number}`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3.diff',
          'User-Agent': 'Sentinel-AI-Review-Bot',
          'Authorization': `Bearer ${GITHUB_TOKEN}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API failed with status ${response.status}`);
    }

    const diffData = await response.text();
    currentDiffData = diffData;

    console.log(`✅ Diff cached successfully (${diffData.length} bytes)`);
    return res.send({ diff: diffData });

  } catch (error: any) {
    console.error('❌ FAILED TO FETCH DIFF:', error.message);
    return res.status(500).send({ error: error.message });
  }
});

// ============================================================================
// 3. GROQ AI REVIEW ENGINE ENDPOINT
// ============================================================================
app.post('/message', async (req: any, res: any) => {
  const body = req.body;

  if (body?.method === 'tools/call' && body?.params?.name === 'get_pr_diff') {
    console.log("🤖 Initializing Groq AI security review...");

    res.send({ status: "processing" });

    try {
      let waitCounter = 0;
      while (!currentDiffData && waitCounter < 10) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        waitCounter++;
      }

      if (!currentDiffData) {
        throw new Error("Timeout: No PR diff loaded in memory after 10 seconds.");
      }

      const groqResponse = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              {
                role: "system",
                content: "You are an elite DevSecOps AI agent. Analyze git diffs for vulnerabilities including SQL injection, command injection, insecure dependencies, hardcoded credentials, insecure logging, and unsafe patterns. Return a detailed report followed by a secure production-ready refactored version inside a markdown code block."
              },
              {
                role: "user",
                content: `Analyze this pull request patch:\n\n${currentDiffData}`
              }
            ],
            temperature: 0.2
          })
        }
      );

      if (!groqResponse.ok) {
        const errPayload = await groqResponse.json();
        throw new Error(errPayload.error?.message || "Groq API processing failed");
      }

      const groqData = await groqResponse.json();
      const aiMarkdownOutput = groqData?.choices?.[0]?.message?.content || "";

      // 🚨 BUG FIX: Using new RegExp() to prevent tsx/esbuild from crashing on backticks
      const codeBlockRegex = new RegExp('```(?:\\w+)?\\n([\\s\\S]*?)\\```');
      const match = aiMarkdownOutput.match(codeBlockRegex);

      if (match && match[1]) {
        cleanAiPatchedCode = match[1].trim();
      } else {
        cleanAiPatchedCode = aiMarkdownOutput;
      }

      cachedLatestAiResult = {
        type: 'review_complete',
        content: aiMarkdownOutput,
        patchedCode: cleanAiPatchedCode
      };

      console.log("✅ AI review completed successfully.");

      messageBus.emit('ai_response', cachedLatestAiResult);

    } catch (error: any) {
      console.error("❌ GROQ REVIEW FAILED:", error.message);

      const errorPayload = {
        type: 'error',
        message: error.message
      };

      cachedLatestAiResult = errorPayload;
      messageBus.emit('ai_response', errorPayload);
    }
  }
  return;
});

// ============================================================================
// 4. AUTONOMOUS COMMIT & MERGE CONTROLLER
// ============================================================================
app.post('/approve', async (req: any, res: any) => {
  try {
    const { owner, repo, pull_number } = req.body;
    if (!owner || !repo || !pull_number) {
      return res.status(400).send({ error: "Missing required parameters" });
    }
    if (!cleanAiPatchedCode) {
      return res.status(400).send({ error: "No compiled secure patch buffered in engine memory to commit." });
    }

    console.log(`\n🚀 Stage 1: Resolving remote target branch reference details...`);
    const prResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${pull_number}`, {
      headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` }
    });
    if (!prResponse.ok) throw new Error("Target Pull Request meta reference lookup failed.");
    const prData = await prResponse.json();
    const branchName = prData.head.ref;

    console.log(`🚀 Stage 2: Acquiring active target file SHA checksum...`);
    const fileUrl = `https://api.github.com/repos/${owner}/${repo}/contents/bad_auth.js?ref=${branchName}`;
    const fileCheck = await fetch(fileUrl, {
      headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` }
    });
    
    let fileSha = "";
    if (fileCheck.ok) {
      const fileData = await fileCheck.json();
      fileSha = fileData.sha;
    }

    console.log(`🚀 Stage 3: Injecting patched secure file onto remote branch: [${branchName}]`);
    const commitUrl = `https://api.github.com/repos/${owner}/${repo}/contents/bad_auth.js`;
    const commitResponse = await fetch(commitUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: "🛡️ Sentinel AI: Autonomously patched code vulnerabilities",
        content: Buffer.from(cleanAiPatchedCode).toString('base64'),
        branch: branchName,
        sha: fileSha
      })
    });

    if (!commitResponse.ok) throw new Error("GitHub repository file write permission rejected code injection.");

    console.log(`⏳ Letting GitHub process the commit (2 seconds)...`);
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log(`🚀 Stage 4: Executing final codebase compile merge onto main branch...`);
    const mergeResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${pull_number}/merge`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        commit_title: `🛡️ Sentinel AI: Merged verified secure code patch from PR #${pull_number}`,
        merge_method: 'merge'
      })
    });

    if (!mergeResponse.ok) {
        const err = await mergeResponse.json();
        throw new Error(`GitHub rejected merge: ${err.message}`);
    }

    console.log("✅ AGENT LIFE CYCLE COMPLETE: PIPELINE EXECUTION SUCCESSFUL!");
    return res.send({ success: true, message: "Sentinel AI successfully modified your file and merged the patch into main!" });

  } catch (error: any) {
    console.error('❌ CRITICAL REJECTION ENCOUNTERED:', error.message);
    return res.status(500).send({ error: error.message });
  }
});

// ============================================================================
// 5. BOOTSTRAP APPARATUS
// ============================================================================
const startServer = async () => {
  try {
    await app.listen({
      port: 3005,
      host: '0.0.0.0'
    });

    console.log('\n=========================================');
    console.log("🚀 SENTINEL AI BACKEND IS ALIVE NATIVELY!");
    console.log("📡 Listening on http://localhost:3005");
    console.log('=========================================\n');

  } catch (error) {
    console.error("❌ SERVER START FAILED:", error);
    process.exit(1);
  }
};

startServer();