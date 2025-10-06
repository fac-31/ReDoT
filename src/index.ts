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

    if (!input_pull) {
      core.warning("This workflow was not triggered by a pull_request event.");
    } else {
      core.info(`PR number: ${input_pull}`);
    }

    const github_token: string | undefined = core.getInput('github_token') || process.env.GITHUB_TOKEN;
    if (!github_token) {
      core.setFailed("GitHub token not provided.");
      process.exit(1);
    }

    const changes = await getChanges(input_owner, input_repo, Number(input_pull), github_token);

    console.log(changes);
/*
    const octokit = github.getOctokit(github_token);
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
    */
  } catch (error: any) {
    core.setFailed(error.message);
  }
}

run();
