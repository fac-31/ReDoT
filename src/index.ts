import * as core from '@actions/core';
import * as github from '@actions/github';

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

    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      core.error("GitHub token not provided.");
      return;
    }

    const octokit = github.getOctokit(token);
    const { owner, repo } = github.context.repo;
    const branch = github.context.ref.replace("refs/heads/", "");

    core.info(`Committed changes to ${branch}`);
  } catch (error: any) {
    core.setFailed(error.message);
  }

}

run();
