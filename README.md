# ReDoT

**Re**-**Do**cument with **T**echnology

GitHub Action that automatically generates and updates code documentation using AI (Claude by Anthropic) when pull requests are opened or updated.

## Features

- 🤖 **AI-Powered Documentation**: Uses Claude Sonnet 4 to analyze code changes and generate relevant documentation
- 📝 **Inline Documentation**: Automatically creates or updates JSDoc comments for modified functions
- 📚 **Central Documentation**: Maintains a DOC.MD file with aggregated documentation across your project
- 🔍 **Smart Analysis**: Only analyzes functions that were actually modified in the PR
- 🎯 **Context-Aware**: Preserves existing documentation and understands your code's context

## Prerequisites

1. **GitHub Account** with a repository
2. **Anthropic API Key** - [Get one here](https://console.anthropic.com/)

## Getting an Anthropic API Key

1. Go to [https://console.anthropic.com/](https://console.anthropic.com/)
2. Sign up or log in to your account
3. Navigate to **API Keys** in the dashboard
4. Click **Create Key**
5. Copy the key (you won't be able to see it again!)
6. Store it securely in your GitHub repository secrets (see Setup Instructions below)

## Setup Instructions

### 1. Store Your Anthropic API Key

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `ANTHROPIC_API_KEY`
5. Value: Paste your Anthropic API key
6. Click **Add secret**

### 2. Create Workflow File

Create a file `.github/workflows/redot.yml` in your repository:

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

### 3. Open a Pull Request

Once the workflow is set up, ReDoT will automatically run on every pull request!

## Configuration

### Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `owner` | ✅ Yes | - | Owner of the repository |
| `repo` | ✅ Yes | - | Repository name |
| `pull` | ✅ Yes | - | Pull request number |
| `anthropic_api_key` | ✅ Yes | - | Your Anthropic API key for Claude |
| `github_token` | ❌ No | `${{ github.token }}` | GitHub token for API access |

### Automatic Values

For most use cases, you can use GitHub context variables:

```yaml
with:
  owner: ${{ github.repository_owner }}
  repo: ${{ github.event.repository.name }}
  pull: ${{ github.event.pull_request.number }}
  anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

## How It Works

1. **PR Triggered**: When a pull request is opened or updated, ReDoT activates
2. **Fetch Changes**: Retrieves all modified files from the PR
3. **Analyze Functions**: Identifies which functions were changed using diff analysis
4. **AI Review**: Claude analyzes each changed function to determine if documentation updates are needed
5. **Generate Docs**: Creates or updates JSDoc comments and DOC.MD entries
6. **Commit** (optional): Commits updated documentation back to the PR branch

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

## Security Best Practices

⚠️ **Never commit API keys to your repository!**

- ✅ **Always** use GitHub Secrets to store your Anthropic API key
- ✅ **Always** reference secrets using `${{ secrets.ANTHROPIC_API_KEY }}`
- ❌ **Never** hardcode API keys in workflow files
- ❌ **Never** commit `.env` files containing keys

### Organization-Wide Secrets

For multiple repositories:

1. Go to your **Organization Settings**
2. Navigate to **Secrets and variables** → **Actions**
3. Create an organization-level secret named `ANTHROPIC_API_KEY`
4. Select which repositories can access it

## Troubleshooting

### "GitHub token not provided"

**Solution**: The action should automatically use `${{ github.token }}`. If this fails, explicitly provide it:

```yaml
with:
  github_token: ${{ secrets.GITHUB_TOKEN }}
```

### "Anthropic API key not provided"

**Solution**: Ensure you've added the secret to your repository:
1. Check Settings → Secrets → Actions
2. Verify the secret is named exactly `ANTHROPIC_API_KEY`
3. Confirm your workflow references it correctly

### No documentation generated

**Possible causes**:
- No functions were modified in the PR
- Changes were too minor to warrant documentation updates
- Claude determined existing documentation was sufficient

### Permission errors

**Solution**: Ensure your workflow has the correct permissions:

```yaml
permissions:
  contents: write
  pull-requests: read
```

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

[Add your license here]

## Authors

- Sefi Potashnik
- Connor Rowland
- Jason Warren

---

**Powered by** [Claude](https://www.anthropic.com/claude) by Anthropic
