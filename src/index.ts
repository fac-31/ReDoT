import * as core from '@actions/core';
import * as github from '@actions/github';

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

    const result = await getChanges(input_owner, input_repo, Number(input_pull), anthropic_api_key, github_token);

    if (result.docMdPath && result.updatedDocMd) {
      const octokit = github.getOctokit(github_token);
      const { owner, repo } = github.context.repo;
      const branch = github.context.ref.replace("refs/heads/", "");

      // Get the file SHA if it already exists
      let sha: string | undefined;
      try {
        const response = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: result.docMdPath,
          ref: branch
        });
        const file = response.data as FileContent;
        sha = file.sha;
      } catch (e) {
        core.info("File does not exist yet, creating new one.");
      }

      await octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: result.docMdPath,
        message: "Update from action",
        content: Buffer.from(result.updatedDocMd).toString("base64"),
        branch,
        sha
      });

      core.info(`Committed changes to ${branch}`);
    } else {
      core.info("No changes need to be made");
    }
  } catch (error: any) {
    core.setFailed(error.message);
  }
}

run();
