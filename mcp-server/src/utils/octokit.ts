import { Octokit } from "@octokit/rest";
import { config } from "../config/index.js";

// Initialize Octokit with your Personal Access Token
export const octokit = new Octokit({
  auth: config.GITHUB_TOKEN,
});

/**
 * Helper to parse GitHub URLs if the user provides a full link 
 * instead of just owner/repo.
 */
export const parseGitHubUrl = (url: string) => {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!match) return null;
  return {
    owner: match[1],
    repo: match[2],
    pull_number: parseInt(match[3], 10),
  };
};