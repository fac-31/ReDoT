import * as core from '@actions/core';
import * as github from '@actions/github';
import axios from 'axios';

async function run() {
  try {
    // Get inputs from action.yml
    const openaiApiKey = core.getInput("openai_api_key", { required: true });

    const context = github.context;

    // Only present if the workflow is triggered by a PR event
    const prNumber = context.payload.pull_request?.number;

    if (!prNumber) {
      core.warning("This workflow was not triggered by a pull_request event.");
    } else {
      core.info(`PR number: ${prNumber}`);
    }

    core.info("Write AI slop here pretty please :)");
  } catch (error) {
    core.setFailed(error.message);
  }

}

run();
