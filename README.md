# ReDoT

**Re**-**Do**cument with **T**echnology

> [!NOTE]
> GitHub Action that automatically generates and updates code documentation using AI (Claude by Anthropic) when pull requests are opened or updated.

---

## Features

- 🤖 **AI-Powered Documentation**: Uses Claude Sonnet 4 to analyze code changes and generate relevant documentation
- 📝 **Inline Documentation**: Automatically creates or updates JSDoc comments for modified functions
- 📚 **Central Documentation**: Maintains a DOC.MD file with aggregated documentation across your project
- 🔍 **Smart Analysis**: Only analyzes functions that were actually modified in the PR
- 🎯 **Context-Aware**: Preserves existing documentation and understands your code's context

---

## Prerequisites

1. **GitHub Account** with a repository
2. **Anthropic API Key** - [Get one here](https://console.anthropic.com/)

<details><summary><h3>Getting an Anthropic API Key</h3></summary>
<ol>
    <li>Go to the [Anthropic console](https://console.anthropic.com/)</li>
    <li>Sign up or log in to your account</li>
    <li>Navigate to **API Keys** in the dashboard</li>
    <li>Click **Create Key**</li>
    <li>Copy the key (you won't be able to see it again!)</li>
    <li>Store it securely in your GitHub repository secrets (see Setup Instructions below)</li>
</ol>
</details>

---

## Setup Instructions

<details><summary><h3>1. Store Your Anthropic API Key</h3></summary>
<ol>
    <li>Go to your repository on GitHub</li>
    <li>Click <strong>Settings</strong> → <strong>Secrets and variables</strong> → <strong>Actions</strong></li>
    <li>Click <strong>New repository secret</strong></li>
    <li>Name: <pre>ANTHROPIC_API_KEY</pre></li>
    <li>Value: Paste your Anthropic API key</li>
    <li>Click <strong>Add secret</strong></li>
</ol>
</details>

<details><summary><h3>2. Create Workflow File</h3></summary>
Create a file <pre>.github/workflows/redot.yml</pre> in your repository:

```yaml
name: Auto-generate Documentation

on:
    pull_request:
    types: [opened, synchronize]

jobs:
    update-docs:
    runs-on: ubuntu-latest
    permissions:
        contents: write
        pull-requests: read

    steps:
        - uses: actions/checkout@v3

        - name: Generate Documentation with ReDoT
        uses: <your-org>/ReDoT@v1  # Replace with actual published action path
        with:
            owner: ${{ github.repository_owner }}
            repo: ${{ github.event.repository.name }}
            pull: ${{ github.event.pull_request.number }}
            anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
            # github_token is optional - defaults to ${{ github.token }}
```
</details>

<details><summary><h3>3. Open a Pull Request</h3></summary>
Once the workflow is set up, ReDoT will automatically run on every pull request!
</details>

---

## Configuration

<details><summary><h3>Inputs</h3></summary>
<table>
    <tr>
        <th>Input</th>
        <th>Required</th>
        <th>Default</th>
        <th>Description</th>
    </tr>
    <tr>
        <td><pre>owner</pre></td>
        <td>✅ Yes</td>
        <td>-</td>
        <td>Owner of the repository</td>
    </tr>
    <tr>
        <td><pre>repo</pre></td>
        <td>✅ Yes</td>
        <td>-</td>
        <td>Repository name</td>
    </tr>
    <tr>
        <td><pre>pull</pre></td>
        <td>✅ Yes</td>
        <td>-</td>
        <td>Pull request number</td>
    </tr>
    <tr>
        <td><pre>anthropic_api_key</pre></td>
        <td>✅ Yes</td>
        <td>-</td>
        <td>Your Anthropic API key for Claude</td>
    </tr>
    <tr>
        <td><pre>github_token</pre></td>
        <td>❌ No</td>
        <td><pre>${{ github.token }}</pre></td>
        <td>GitHub token for API access</td>
    </tr>
</table>
</details>

<details><summary><h3>Automatic Values</h3></summary>
For most use cases, you can use GitHub context variables:

```yaml
with:
    owner: ${{ github.repository_owner }}
    repo: ${{ github.event.repository.name }}
    pull: ${{ github.event.pull_request.number }}
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```
</details>

---

## How It Works

1. **PR Triggered**: When a pull request is opened or updated, ReDoT activates
2. **Fetch Changes**: Retrieves all modified files from the PR
3. **Analyze Functions**: Identifies which functions were changed using diff analysis
4. **AI Review**: Claude analyzes each changed function to determine if documentation updates are needed
5. **Generate Docs**: Creates or updates JSDoc comments and DOC.MD entries
6. **Commit** (optional): Commits updated documentation back to the PR branch

---

## Supported Languages

ReDoT supports comprehensive function detection for:

- **JavaScript** (ES5, ES6+)
- **TypeScript**
- **React/JSX**

It recognizes:
- Named functions, arrow functions, async functions, generators
- Class methods (public, private, static)
- Getters and setters
- Constructors
- Object method shorthand
- And more!

---

## Security Best Practices

⚠️ **Never commit API keys to your repository!**

- ✅ **Always** use GitHub Secrets to store your Anthropic API key
- ✅ **Always** reference secrets using `${{ secrets.ANTHROPIC_API_KEY }}`
- ❌ **Never** hardcode API keys in workflow files
- ❌ **Never** commit `.env` files containing keys

<details><summary><h3>Organization-Wide Secrets</h3></summary>
For multiple repositories:

<ol>
    <li>Go to your <strong>Organization Settings</strong></li>
    <li>Navigate to <strong>Secrets and variables</strong> → <strong>Actions</strong></li>
    <li>Create an organization-level secret named <pre>ANTHROPIC_API_KEY</pre></li>
    <li>Select which repositories can access it</li>
</ol>
</details>

---

## Troubleshooting

<details><summary><h3>"GitHub token not provided"</h3></summary>
<strong>Solution:</strong> The action should automatically use <pre>${{ github.token }}</pre>. If this fails, explicitly provide it:

```yaml
with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
```
</details>

<details><summary><h3>"Anthropic API key not provided"</h3></summary>
<strong>Solution:</strong> Ensure you've added the secret to your repository:
<ol>
    <li>Check <strong>Settings</strong> → <strong>Secrets</strong> → <strong>Actions</strong></li>
    <li>Verify the secret is named exactly <pre>ANTHROPIC_API_KEY</pre></li>
    <li>Confirm your workflow references it correctly</li>
</ol>
</details>

<details><summary><h3>No documentation generated</h3></summary>
<strong>Possible causes:</strong>
<ul>
    <li>No functions were modified in the PR</li>
    <li>Changes were too minor to warrant documentation updates</li>
    <li>Claude determined existing documentation was sufficient</li>
</ul>
</details>

<details><summary><h3>Permission errors</h3></summary>
<strong>Solution:</strong> Ensure your workflow has the correct permissions:

```yaml
permissions:
  contents: write
  pull-requests: read
```
</details>

---

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

---

## License

[GNU AGPLv3](https://choosealicense.com/licenses/agpl-3.0/#)

---

## Authors

- [Sefi Potashnik](https://github.com/JosephPotashnik)
- [Connor Rowland](https://github.com/FortyTwoFortyTwo)
- [Jason Warren](https://github.com/JasonWarrenUK)

---

**Powered by** [Claude](https://www.anthropic.com/claude) by Anthropic
