# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

ReDoT is a **GitHub Action** designed for the GitHub Marketplace. All changes must maintain compatibility with GitHub Actions runtime requirements:
- Must compile to a single bundled file (`dist/index.js`)
- Runs on Node.js 20 runtime
- Cannot rely on external files at runtime (everything must be in the bundle)
- Must work in GitHub's Ubuntu runners without additional setup

## Build & Development

```bash
# Build the action (required before testing or deploying)
npm run build

# This compiles TypeScript and bundles to dist/index.js using @vercel/ncc
```

**Testing locally**: Use the workflow dispatch in `.github/workflows/test.yml`
- Push your changes
- Go to Actions → "ReDoT package test" → Run workflow
- Provide: owner, repo, pull request number

**Before committing**: Always run `npm run build` to update `dist/index.js`

## Architecture

### Entry Flow
1. **`src/index.ts`** (47 lines) - GitHub Action entry point
   - Validates inputs from `action.yml` (owner, repo, pull, tokens)
   - Calls `getChanges()` from server.ts

2. **`src/server.ts`** (846 lines) - Core business logic
   - `getChanges()`: Main orchestrator (lines 16-339)
   - `identifyAffectedFunctions()`: Function detection engine (lines 341-648)
   - `applyDocumentationToFile()`: File update logic (lines 651-793)
   - `commitDocMdUpdate()`: DOC.MD commit logic (lines 796-845)

### Processing Pipeline

```
PR Event → Fetch PR Details → Get Changed Files → Parse Diffs
    ↓
For each changed file:
  ↓
  Identify Functions in Changes (using 10 regex patterns)
  ↓
  Batch process ALL affected functions in file at once:
    - Extract existing documentation for each
    - Build full file context
    - Ask Claude for updated docs for ALL functions (lines 111-123)
    - Returns array of function updates
    ↓
Aggregate all updates → Ask Claude to update DOC.MD (lines 221-224)
    ↓
Apply changes to files (bottom-up to preserve line numbers)
    ↓
Commit to PR branch (unless from fork)
```

**Key Optimization**: Instead of making one Claude API call per function, the pipeline now batches all functions in a file into a single API call, significantly reducing API usage and improving performance.

### Function Detection (lines 380-464)

The `identifyAffectedFunctions()` uses 10 patterns to catch all JS/TS function styles:
1. Named functions: `function myFunc()`
2. Assigned anonymous: `const myFunc = function()`
3. Arrow functions: `const myFunc = () => {}`
4. Single-param arrow: `const myFunc = x => x`
5. Class methods: `async myMethod()`, `static myMethod()`
6. Constructors: `constructor()`
7. Getters/setters: `get myProp()`, `set myProp()`
8. Generators: `*myGenerator()`, `async *myGen()`
9. Object shorthand: `{ myMethod() {} }`
10. Private methods: `#myPrivateMethod()`

**Brace Matching** (lines 506-560): Tracks opening/closing braces while handling:
- String literals (respects `"`, `'`, `` ` ``)
- Comments (both `//` and `/* */`)
- Escape characters

### Critical Implementation Details

**Bottom-Up Updates** (line 685):
```typescript
const sortedUpdates = [...updates].sort((a, b) => b.line - a.line);
```
Modifies files from bottom to top so earlier updates don't shift line numbers for later updates.

**Fork Safety** (lines 43-50):
Detects PRs from forks and disables auto-commit (can't push to external repos), but still returns documentation updates.

**Indentation Preservation** (lines 722-725):
Extracts indentation from the function line and applies it to generated docs to match code style.

**JSON Parsing Resilience** (lines 143-146):
Strips code fences from Claude's responses before parsing JSON:
```typescript
const cleaned = textBlock.text
  .replace(/```json\s*/i, '')
  .replace(/```$/, '')
  .trim();
```

## Prompt Templates

All Claude prompts use XML structure for improved semantic clarity and model understanding. Templates are located in `src/prompts/`:

- **Batch function documentation prompt** (currently used): `src/prompts/functionDocumentation.ts`
  - Function: `buildBatchFunctionDocPrompt(params)`
  - Used in: `src/server.ts:111-115`
  - Processes multiple functions in a single API call
  - XML tags: `<role>`, `<context>`, `<affected_functions>` (with nested `<function>` tags), `<task>`, `<response_format>`
  - Returns: JSON array with `{ functions: [...] }` structure

- **Single function documentation prompt** (legacy/unused): `src/prompts/functionDocumentation.ts`
  - Function: `buildFunctionDocPrompt(params)`
  - Kept for backward compatibility or single-function use cases
  - XML tags: `<role>`, `<context>`, `<existing_documentation>`, `<changes>`, `<function_context>`, `<task>`, `<response_format>`

- **DOC.MD update prompt**: `src/prompts/docMdUpdate.ts`
  - Function: `buildDocMdUpdatePrompt(params)`
  - Used in: `src/server.ts:221-224`
  - XML tags: `<role>`, `<existing_doc>`, `<function_updates>` (with nested `<update>` tags), `<task>`

All templates are exported via `src/prompts/index.ts` for clean imports.

## Model Configuration

Claude calls use:
- Model: `claude-sonnet-4-20250514`
- Temperature: `0.3` (deterministic documentation)
- Max tokens: `4096` (function docs) / `8192` (DOC.MD)

## Input/Output

**Inputs** (from `action.yml`):
- `owner`, `repo`, `pull`: PR identification
- `anthropic_api_key`: Required for Claude API
- `github_token`: Optional, defaults to `${{ github.token }}`

**Output** (returned from `getChanges()`):
```typescript
{
  pullRequest: { number, headBranch, baseBranch, headRepo, isFromFork },
  functionDocumentationUpdates: Array<{filename, functionName, line, needsUpdate, reason, inlineDocumentation, docMdSummary}>,
  updatedDocMd: string,
  docMdPath: string,
  commitResults: Array<{filename, success, commitSha?, error?}>,
  summary: { totalFunctionsAnalyzed, functionsNeedingUpdate, filesUpdated, autoCommitEnabled }
}
```

## GitHub API Usage

All GitHub API calls use native `fetch()` with:
- Base URL: `https://api.github.com`
- Headers: `Accept: application/vnd.github+json`, `Authorization: Bearer {token}`, `X-GitHub-Api-Version: 2022-11-28`

Key endpoints:
- `/repos/{owner}/{repo}/pulls/{pull_number}` - PR details
- `/repos/{owner}/{repo}/pulls/{pull_number}/files` - Changed files
- `/repos/{owner}/{repo}/contents/{path}?ref={branch}` - File content
- `PUT /repos/{owner}/{repo}/contents/{path}` - Commit changes

## Dependencies

**Runtime** (`dependencies`):
- `@actions/core` - GitHub Actions integration
- `@anthropic-ai/sdk` - Claude API client
- `dotenv` - Environment variables (dev only)

**Build** (`devDependencies`):
- `@vercel/ncc` - Bundles TypeScript + node_modules into single file
- `typescript`, `ts-node` - TypeScript compilation

Note: `axios` and `@octokit/rest` are listed but unused (native `fetch` is used instead).
