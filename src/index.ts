import * as core from '@actions/core';
import * as github from '@actions/github';

import type { RestEndpointMethodTypes } from "@octokit/rest";

// Response type for repos.getContent
type GetContentResponse =
  RestEndpointMethodTypes["repos"]["getContent"]["response"]["data"];

// Narrow to just "file" type
type FileContent = Extract<GetContentResponse, { type: "file" }>;

async function run() {
  try {
    // Get inputs from action.yml
    const openaiApiKey = core.getInput("openai_api_key", { required: true });

    // Only present if the workflow is triggered by a PR event
    const prNumber = github.context.payload.pull_request?.number;

    if (!prNumber) {
      core.warning("This workflow was not triggered by a pull_request event.");
    } else {
      core.info(`PR number: ${prNumber}`);
    }

    const token = process.env.GITHUB_TOKEN || core.getInput('github_token', { required: false });
    if (!token) {
      core.setFailed("GitHub token not provided.");
      return;
    }

    const octokit = github.getOctokit(token);
    const { owner, repo } = github.context.repo;
    const branch = github.context.ref.replace("refs/heads/", "");

    const filePath = "test.txt";

    // Get the file SHA if it already exists
    let sha: string | undefined;
    try {
      const response = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: filePath,
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
      path: filePath,
      message: "Update from action",
      content: Buffer.from("Banana!").toString("base64"),
      branch,
      sha
    });

    core.info(`Committed changes to ${branch}`);
  } catch (error: any) {
    core.setFailed(error.message);
  }
}

run();
