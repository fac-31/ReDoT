import * as core from '@actions/core';

import type { RestEndpointMethodTypes } from "@octokit/rest";

import { getChanges } from './server';

// Response type for repos.getContent
type GetContentResponse =
  RestEndpointMethodTypes["repos"]["getContent"]["response"]["data"];

// Narrow to just "file" type
type FileContent = Extract<GetContentResponse, { type: "file" }>;

async function run() {
  try {
    // Get inputs from action.yml
    const input_owner = core.getInput("owner", { required: true });
    const input_repo = core.getInput("repo", { required: true });
    const input_pull = core.getInput("pull", { required: true });
    
    const anthropic_api_key = core.getInput("anthropic_api_key", { required: true });
    if (!anthropic_api_key) {
      core.setFailed("Anthropic API key not provided.");
      process.exit(1);
    }

    if (!input_pull) {
      core.warning("This workflow was not triggered by a pull_request event.");
    } else {
      core.info(`PR number: ${input_pull}`);
    }

    // Get GitHub token from input or fall back to the default GITHUB_TOKEN
    const github_token: string = core.getInput('github_token') || process.env.GITHUB_TOKEN || '';
    if (!github_token) {
      core.setFailed("GitHub token not provided. Please pass github_token input or ensure GITHUB_TOKEN is available.");
      process.exit(1);
    }

    await getChanges(input_owner, input_repo, Number(input_pull), anthropic_api_key, github_token);
  } catch (error: any) {
    core.setFailed(error.message);
  }
}

run();
