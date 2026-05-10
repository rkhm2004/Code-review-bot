const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface PRRequest {
  owner: string;
  repo: string;
  pull_number: number;
}

export const api = {
  /**
   * Triggers the AI to start analyzing a Pull Request.
   */
  async startReview(details: PRRequest) {
    const response = await fetch(`${API_BASE_URL}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: {
          name: "get_pr_diff",
          arguments: details
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to start review: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Health check for the MCP Backend
   */
  async checkHealth() {
    try {
      const res = await fetch(`${API_BASE_URL}/sse`);
      return res.ok;
    } catch {
      return false;
    }
  }
};