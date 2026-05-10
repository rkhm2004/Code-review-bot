/**
 * Truncates text to a maximum length to prevent exceeding the LLM's context window.
 * 40,000 characters is roughly 10,000 tokens, a safe limit for most modern models.
 * * @param text The text (like a code diff) to truncate
 * @param maxLength Maximum characters allowed
 * @returns Truncated text with a warning appended if it was cut
 */
export function truncateContext(text: string, maxLength: number = 40000): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  
  return text.slice(0, maxLength) + "\n\n... [WARNING: CONTENT TRUNCATED DUE TO CONTEXT LIMITS] ...";
}

/**
 * Pauses execution for a specified number of milliseconds.
 * Highly useful if the bot needs to wait for GitHub API rate limits to reset,
 * or if you are running multiple linting processes in a row.
 */
export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Parses a standard GitHub Pull Request URL into its core components.
 * This allows the user to paste a URL like "https://github.com/facebook/react/pull/28795"
 * directly into the chat or dashboard, and the AI can extract the exact arguments it needs.
 */
export function extractPrDetailsFromUrl(url: string): { owner: string; repo: string; pull_number: number } | null {
  try {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
    if (!match) return null;
    
    return {
      owner: match[1],
      repo: match[2],
      pull_number: parseInt(match[3], 10),
    };
  } catch (e) {
    return null;
  }
}

/**
 * A standardized error formatter for tool responses.
 * Ensures the AI always gets a clean, readable error message instead of a raw stack trace.
 */
export function formatToolError(error: any, context: string): string {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return `Action Failed [${context}]: ${errorMessage}\nPlease adjust your parameters and try again.`;
}