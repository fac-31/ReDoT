import * as core from '@actions/core';
import * as github from '@actions/github';
import axios from 'axios';

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

    const filePath = "chatgpt_output.txt";
    const content = fs.readFileSync(filePath, "utf8");

    // Get the file SHA if it already exists
    let sha;
    try {
      const { data: file } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: filePath,
        ref: branch
      });
      sha = file.sha;
    } catch (e) {
      core.info("File does not exist yet, creating new one.");
    }

    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: "Update from action",
      content: Buffer.from(content).toString("base64"),
      branch,
      sha
    });

    core.info(`Committed changes to ${branch}`);
  } catch (error) {
    core.setFailed(error.message);
  }

}

run();
