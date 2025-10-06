import express, { Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import 'dotenv/config';

import * as core from '@actions/core';
import * as github from '@actions/github';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to Express + TypeScript API' });
});

interface FunctionChange {
  filename: string;
  functionName: string;
  startLine: number;
  endLine: number;
  changes: string[];
  existingDoc?: string;
  functionCode: string;
}

export async function getChanges(owner: string, repo: string, pull_number: number, anthropic_api_key: string, github_token: string, autoCommit: boolean = true) {
  if (!owner || !repo || !pull_number) {
    throw new Error('Missing required parameters: owner, repo, and pull_number are required');
  }

  try {
    // Step 1: Fetch PR details to get the head branch
    const prUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${pull_number}`;
    const prResponse = await fetch(prUrl, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${github_token}`,
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    if (!prResponse.ok) {
      throw new Error(`GitHub API error fetching PR: ${prResponse.statusText}`);
    }

    const prData = await prResponse.json();
    const headBranch = prData.head.ref; // The branch being merged FROM
    const baseBranch = prData.base.ref; // The branch being merged INTO (usually 'main')
    const headRepo = prData.head.repo.full_name; // Could be from a fork
    const headOwner = prData.head.repo.owner.login;
    const headRepoName = prData.head.repo.name;

    // Check if PR is from a fork
    const isFromFork = headRepo !== `${owner}/${repo}`;

    if (isFromFork && autoCommit) {
      core.warning('PR is from a fork. Cannot auto-commit documentation updates to fork.');
      core.warning('Documentation updates will be returned but not committed.');
      autoCommit = false; // Disable auto-commit for forks
    }

    // Step 2: Fetch PR file changes
    const filesUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${pull_number}/files`;
    const filesResponse = await fetch(filesUrl, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${github_token}`,
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    if (!filesResponse.ok) {
      throw new Error(`GitHub API error fetching files: ${filesResponse.statusText}`);
    }

    const files = await filesResponse.json();

    // Step 3: For each changed file, get the full content to find existing docs
    const documentationUpdates = [];

    for (const file of files) {
      if (file.status === 'removed') continue;

      // Get the current file content from the PR's head branch
      const contentUrl = `https://api.github.com/repos/${headOwner}/${headRepoName}/contents/${file.filename}?ref=${headBranch}`;
      const contentResponse = await fetch(contentUrl, {
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${github_token}`,
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });

      let currentFileContent = '';
      if (contentResponse.ok) {
        const contentData = await contentResponse.json();
        currentFileContent = Buffer.from(contentData.content, 'base64').toString('utf-8');
      }

      // Step 4: Identify functions affected by changes
      const affectedFunctions = identifyAffectedFunctions(file.patch, currentFileContent, file.filename);

      if (affectedFunctions.length === 0) continue;

      // Step 5: Ask Claude to update documentation for each function
      const anthropic = new Anthropic({
        apiKey: anthropic_api_key,
      });

      for (const func of affectedFunctions) {
        const prompt = `You are a technical documentation expert. A pull request has made changes to a function.

**File**: ${file.filename}
**Function**: ${func.functionName}
**Lines Changed**: ${func.startLine}-${func.endLine}

**Existing Documentation** (if any):
${func.existingDoc || 'No existing documentation found'}

**Changes Made**:
${func.changes.join('\n')}

**Full Function Context**:
${func.functionCode}

**Task**:
1. Determine if the changes warrant updating the function documentation
2. If yes, provide updated JSDoc/comment block that should precede this function
3. Provide a brief summary suitable for the DOC.MD file

**Response Format** (JSON):
{
  "needsUpdate": true/false,
  "reason": "Brief explanation of why documentation needs/doesn't need update",
  "inlineDocumentation": "Updated JSDoc comment block (or null if no update needed)",
  "docMdSummary": "Brief summary for DOC.MD (or null if no update needed)"
}`;

        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          temperature: 0.3,
          messages: [{ role: "user", content: prompt }],
        });
        
        try {
          const textBlock = response.content[0];
          if (textBlock.type !== 'text') {
            throw new Error('Expected text response from Claude');
          }
          const parsed = JSON.parse(textBlock.text);
          documentationUpdates.push({
            filename: file.filename,
            functionName: func.functionName,
            line: func.startLine,
            ...parsed
          });
        } catch (parseError) {
          // If Claude doesn't return valid JSON, store raw response
          documentationUpdates.push({
            filename: file.filename,
            functionName: func.functionName,
            line: func.startLine,
            rawResponse: response.content.toString()
          });
        }
      }
    }

    // Step 6: Get existing DOC.MD - look in common locations
    let existingDocMd = '';
    let docMdPath = '';
    let docMdSha = '';

    // Try common documentation paths in the head branch
    const commonDocPaths = ['DOC.MD', 'docs/DOC.MD', 'README.md', 'DOCUMENTATION.md'];

    for (const path of commonDocPaths) {
      const docMdUrl = `https://api.github.com/repos/${headOwner}/${headRepoName}/contents/${path}?ref=${headBranch}`;

      const docMdResponse = await fetch(docMdUrl, {
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${github_token}`,
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });

      if (docMdResponse.ok) {
        const docMdData = await docMdResponse.json();
        existingDocMd = Buffer.from(docMdData.content, 'base64').toString('utf-8');
        docMdPath = path;
        docMdSha = docMdData.sha;
        break;
      }
    }

    // Ask Claude to update DOC.MD only if there are updates
    let updatedDocMd = existingDocMd;

    if (documentationUpdates.filter(u => u.needsUpdate).length > 0) {
      const anthropic = new Anthropic({
        apiKey: anthropic_api_key,
      });

      const docMdPrompt = `You are updating a DOC.MD file based on changes from a pull request.

**Existing DOC.MD**:
${existingDocMd || 'No existing DOC.MD found'}

**Function Updates**:
${documentationUpdates
  .filter(u => u.needsUpdate)
  .map(u => `- ${u.filename} :: ${u.functionName}: ${u.docMdSummary}`)
  .join('\n')}

**Task**: Update the DOC.MD to reflect these changes. Maintain the existing structure and only update relevant sections or add new entries as needed.

Provide the complete updated DOC.MD content.`;

      const docMdUpdateResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        temperature: 0.3,
        messages: [{ role: "user", content: docMdPrompt }],
      });
      const docTextBlock = docMdUpdateResponse.content[0];
      if (docTextBlock.type !== 'text') {
        throw new Error('Expected text response from Claude');
      }
      updatedDocMd = docTextBlock.text;
    }

    // Step 7: Apply documentation updates to files (optional based on autoCommit flag)
    const commitResults = [];

    if (autoCommit && documentationUpdates.filter(u => u.needsUpdate).length > 0) {
      core.info(`Applying documentation updates to ${documentationUpdates.filter(u => u.needsUpdate).length} functions...`);

      // Group updates by file
      const updatesByFile = new Map<string, typeof documentationUpdates>();
      for (const update of documentationUpdates.filter(u => u.needsUpdate)) {
        if (!updatesByFile.has(update.filename)) {
          updatesByFile.set(update.filename, []);
        }
        updatesByFile.get(update.filename)!.push(update);
      }

      // Process each file
      for (const [filename, updates] of updatesByFile) {
        try {
          core.info(`Updating documentation in ${filename}...`);
          const result = await applyDocumentationToFile(
            headOwner,
            headRepoName,
            filename,
            updates,
            headBranch,
            github_token
          );
          commitResults.push(result);

          if (result.success) {
            core.info(`✓ Successfully updated ${filename} (commit: ${result.commitSha})`);
          } else {
            core.error(`✗ Failed to update ${filename}: ${result.error}`);
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          core.error(`✗ Exception updating ${filename}: ${errorMsg}`);
          commitResults.push({
            filename,
            success: false,
            error: errorMsg
          });
        }
      }

      // Commit the updated DOC.MD file if it changed
      if (updatedDocMd !== existingDocMd && docMdPath) {
        try {
          core.info(`Updating ${docMdPath}...`);
          const docMdResult = await commitDocMdUpdate(
            headOwner,
            headRepoName,
            docMdPath,
            updatedDocMd,
            docMdSha,
            headBranch,
            github_token
          );

          if (docMdResult.success) {
            core.info(`✓ Successfully updated ${docMdPath} (commit: ${docMdResult.commitSha})`);
          } else {
            core.error(`✗ Failed to update ${docMdPath}: ${docMdResult.error}`);
          }

          commitResults.push(docMdResult);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          core.error(`✗ Exception updating ${docMdPath}: ${errorMsg}`);
          commitResults.push({
            filename: docMdPath,
            success: false,
            error: errorMsg
          });
        }
      }
    }

    // Return structured response
    return {
      pullRequest: {
        number: pull_number,
        headBranch,
        baseBranch,
        headRepo: `${headOwner}/${headRepoName}`,
        isFromFork
      },
      functionDocumentationUpdates: documentationUpdates,
      updatedDocMd: updatedDocMd,
      docMdPath: docMdPath || 'Not found',
      commitResults: autoCommit ? commitResults : null,
      summary: {
        totalFunctionsAnalyzed: documentationUpdates.length,
        functionsNeedingUpdate: documentationUpdates.filter(u => u.needsUpdate).length,
        filesUpdated: autoCommit ? commitResults.filter(r => r.success).length : 0,
        autoCommitEnabled: autoCommit
      }
    };

  } catch (error) {
    if (error instanceof Error) {
      core.error(error.message);
      throw error;
    } else {
      core.error('Failed to update documentation');
      throw new Error('Failed to update documentation');
    }
  }
}

// Helper function to identify affected functions from patch
function identifyAffectedFunctions(patch: string, fileContent: string, filename: string): FunctionChange[] {
  const functions: FunctionChange[] = [];

  if (!patch || !fileContent) return functions;

  const lines = patch.split('\n');
  const fileLines = fileContent.split('\n');
  const changedLines: number[] = [];

  // Parse the unified diff to find changed line numbers
  let currentLine = 0;

  for (const line of lines) {
    if (line.startsWith('@@')) {
      // Extract the starting line number from the new file
      // Format: @@ -old_start,old_count +new_start,new_count @@
      const match = line.match(/@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        currentLine = parseInt(match[1], 10);
      }
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      // This is an added line
      changedLines.push(currentLine);
      currentLine++;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      // This is a deleted line - don't increment currentLine
      // We'll track the line after deletion
      continue;
    } else if (line.startsWith(' ')) {
      // Context line - increment
      currentLine++;
    }
  }

  if (changedLines.length === 0) return functions;

  // Find functions that contain these changed lines
  // Support all possible function declaration styles
  const functionPatterns = [
    // 1. Named function declarations (with any modifiers)
    // export async function* myFunc()
    // export default async function myFunc()
    {
      pattern: /(export\s+(?:default\s+)?)?(?:async\s+)?(function\s*\*?)\s+(\w+)\s*\(/g,
      nameIndex: 3
    },

    // 2. Anonymous functions assigned to variables
    // const myFunc = function() {}
    // const myFunc = async function() {}
    // const myFunc = function*() {}
    {
      pattern: /(export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function\s*\*?\s*\(/g,
      nameIndex: 2
    },

    // 3. Arrow functions (all variations)
    // const myFunc = () => {}
    // const myFunc = async () => {}
    // const myFunc = (x) => x * 2
    // const myFunc = async (x) => { return x; }
    {
      pattern: /(export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g,
      nameIndex: 2
    },

    // 4. Arrow functions without parentheses (single param)
    // const myFunc = x => x * 2
    // const myFunc = async x => x * 2
    {
      pattern: /(export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(\w+)\s*=>/g,
      nameIndex: 2
    },

    // 5. Class methods (with modifiers)
    // async myMethod() {}
    // static myMethod() {}
    // static async myMethod() {}
    // private myMethod() {}
    // public async myMethod() {}
    {
      pattern: /(?:public|private|protected|static|readonly)?\s*(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*\w+\s*)?\{/g,
      nameIndex: 1
    },

    // 6. Constructor
    {
      pattern: /(constructor)\s*\([^)]*\)\s*\{/g,
      nameIndex: 1
    },

    // 7. Getters and Setters
    // get myProp() {}
    // set myProp(value) {}
    {
      pattern: /(get|set)\s+(\w+)\s*\(/g,
      nameIndex: 2,
      prefix: (match: RegExpExecArray) => match[1] // 'get' or 'set'
    },

    // 8. Generator methods in classes
    // *myGenerator() {}
    // async *myAsyncGenerator() {}
    {
      pattern: /(?:async\s+)?\*\s*(\w+)\s*\([^)]*\)\s*\{/g,
      nameIndex: 1
    },

    // 9. Object method shorthand
    // { myMethod() {} }
    // { async myMethod() {} }
    {
      pattern: /(\w+)\s*\([^)]*\)\s*\{/g,
      nameIndex: 1
    },

    // 10. Private class methods (TypeScript/JavaScript)
    // #myPrivateMethod() {}
    {
      pattern: /(?:async\s+)?(#\w+)\s*\([^)]*\)\s*\{/g,
      nameIndex: 1
    }
  ];

  const foundFunctions: Array<{name: string, start: number, index: number}> = [];

  for (const patternConfig of functionPatterns) {
    const { pattern, nameIndex, prefix } = patternConfig;
    let match;

    while ((match = pattern.exec(fileContent)) !== null) {
      let functionName = match[nameIndex];
      if (!functionName) continue;

      // Add prefix if applicable (e.g., "get" or "set")
      if (prefix && typeof prefix === 'function') {
        const prefixValue = prefix(match);
        functionName = `${prefixValue} ${functionName}`;
      }

      // Skip common control flow keywords that might match patterns
      const keywords = ['if', 'for', 'while', 'switch', 'catch', 'with'];
      if (keywords.includes(functionName)) continue;

      const functionStartLine = fileContent.substring(0, match.index).split('\n').length;
      foundFunctions.push({
        name: functionName,
        start: functionStartLine,
        index: match.index
      });
    }
  }

  // Sort by position in file
  foundFunctions.sort((a, b) => a.index - b.index);

  for (const func of foundFunctions) {
    const functionStartLine = func.start;

    // Find the end of this function using brace matching
    let braceCount = 0;
    let functionEndLine = functionStartLine;
    let inString = false;
    let inComment = false;
    let stringChar = '';

    for (let i = functionStartLine - 1; i < fileLines.length; i++) {
      const line = fileLines[i];

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        const nextChar = line[j + 1];

        // Handle comments
        if (!inString && char === '/' && nextChar === '/') {
          break; // Rest of line is comment
        }
        if (!inString && char === '/' && nextChar === '*') {
          inComment = true;
          j++;
          continue;
        }
        if (inComment && char === '*' && nextChar === '/') {
          inComment = false;
          j++;
          continue;
        }
        if (inComment) continue;

        // Handle strings
        if ((char === '"' || char === "'" || char === '`') && (j === 0 || line[j - 1] !== '\\')) {
          if (!inString) {
            inString = true;
            stringChar = char;
          } else if (char === stringChar) {
            inString = false;
            stringChar = '';
          }
        }
        if (inString) continue;

        // Count braces
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;

        if (braceCount === 0 && char === '}') {
          functionEndLine = i + 1;
          break;
        }
      }

      if (braceCount === 0 && functionEndLine !== functionStartLine) {
        break;
      }
    }

    // Check if any changed lines fall within this function
    const functionsChangedLines = changedLines.filter(line =>
      line >= functionStartLine && line <= functionEndLine
    );

    if (functionsChangedLines.length > 0) {
      // Extract existing documentation by looking backwards until we hit:
      // 1. Another function/class/statement, OR
      // 2. The beginning of the file
      let existingDoc = '';
      let docStartLine = -1;
      let docEndLine = -1;
      let foundDocBlock = false;

      // Start from the line before the function
      for (let i = functionStartLine - 2; i >= 0; i--) {
        const line = fileLines[i];
        const trimmed = line.trim();

        // Check if this is a comment line
        const isComment = trimmed.startsWith('/**') ||
                         trimmed.startsWith('/*') ||
                         trimmed.startsWith('*') ||
                         trimmed.startsWith('//') ||
                         trimmed.startsWith('*/');

        if (isComment) {
          // We're in a comment block
          if (docEndLine === -1) {
            docEndLine = i;
          }
          docStartLine = i;
          foundDocBlock = true;

          // If we hit the start of a JSDoc block, we can stop
          if (trimmed.startsWith('/**')) {
            break;
          }
        } else if (trimmed === '') {
          // Empty line - continue if we haven't found a doc block yet
          // or if we're between the doc block and function (acceptable whitespace)
          if (!foundDocBlock || docEndLine === -1) {
            continue;
          }
          // If we already found a doc block and hit an empty line before it, stop
          if (docStartLine !== -1) {
            break;
          }
        } else {
          // Non-empty, non-comment line
          // This could be:
          // - A decorator (e.g., @override, @deprecated)
          // - An export statement
          // - The previous function/statement (stop here)

          // Check if it's a decorator or export modifier
          if (trimmed.startsWith('@') || trimmed.startsWith('export') || trimmed.startsWith('async')) {
            // Part of the function declaration, keep going
            if (!foundDocBlock) continue;
            // If we found a doc block, this might be between doc and function
            if (docEndLine !== -1) continue;
          }

          // We hit something else (likely previous function/statement)
          break;
        }
      }

      // Extract the documentation if found
      if (docStartLine !== -1 && docEndLine !== -1) {
        existingDoc = fileLines.slice(docStartLine, docEndLine + 1).join('\n');
      }

      functions.push({
        filename: filename,
        functionName: func.name,
        startLine: functionStartLine,
        endLine: functionEndLine,
        changes: functionsChangedLines.map(l => `Line ${l}: ${fileLines[l - 1] || ''}`),
        existingDoc: existingDoc.trim() || undefined,
        functionCode: fileLines.slice(functionStartLine - 1, functionEndLine).join('\n')
      });
    }
  }

  return functions;
}

// Helper function to apply documentation updates to a file
async function applyDocumentationToFile(
  owner: string,
  repo: string,
  filename: string,
  updates: Array<{
    functionName: string;
    line: number;
    inlineDocumentation: string;
    existingDoc?: string;
  }>,
  branch: string,
  githubToken: string
): Promise<{ filename: string; success: boolean; commitSha?: string; error?: string }> {
  try {
    // Get the current file content
    const contentUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filename}?ref=${branch}`;
    const contentResponse = await fetch(contentUrl, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${githubToken}`,
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    if (!contentResponse.ok) {
      throw new Error(`Failed to fetch file: ${contentResponse.statusText}`);
    }

    const fileData = await contentResponse.json();
    const fileContent = Buffer.from(fileData.content, 'base64').toString('utf-8');
    const fileLines = fileContent.split('\n');

    // Sort updates by line number (descending) so we modify from bottom to top
    // This prevents line number shifts from affecting subsequent updates
    const sortedUpdates = [...updates].sort((a, b) => b.line - a.line);

    for (const update of sortedUpdates) {
      const { line, inlineDocumentation, functionName } = update;

      if (!inlineDocumentation) continue;

      // Find if there's existing documentation to replace
      let docStartLine = -1;
      let docEndLine = -1;

      // Look backwards from the function line to find existing docs
      for (let i = line - 2; i >= 0; i--) {
        const trimmed = fileLines[i].trim();

        const isComment = trimmed.startsWith('/**') ||
                         trimmed.startsWith('/*') ||
                         trimmed.startsWith('*') ||
                         trimmed.startsWith('//') ||
                         trimmed.startsWith('*/');

        if (isComment) {
          if (docEndLine === -1) docEndLine = i;
          docStartLine = i;
          if (trimmed.startsWith('/**')) break;
        } else if (trimmed === '') {
          if (docEndLine === -1) continue;
          break;
        } else {
          if (trimmed.startsWith('@') || trimmed.startsWith('export') || trimmed.startsWith('async')) {
            continue;
          }
          break;
        }
      }

      // Prepare the new documentation with proper indentation
      const functionLine = fileLines[line - 1];
      const indentation = functionLine.match(/^(\s*)/)?.[1] || '';
      const docLines = inlineDocumentation.split('\n').map(l => indentation + l);

      if (docStartLine !== -1 && docEndLine !== -1) {
        // Replace existing documentation
        fileLines.splice(docStartLine, docEndLine - docStartLine + 1, ...docLines);
      } else {
        // Insert new documentation before the function
        // Find the actual start of the function declaration (might have decorators/exports)
        let insertLine = line - 1;
        for (let i = line - 2; i >= 0; i--) {
          const trimmed = fileLines[i].trim();
          if (trimmed.startsWith('@') || trimmed.startsWith('export') ||
              trimmed.startsWith('async') || trimmed.startsWith('static') ||
              trimmed.startsWith('public') || trimmed.startsWith('private') ||
              trimmed.startsWith('protected')) {
            insertLine = i;
          } else if (trimmed === '') {
            continue;
          } else {
            break;
          }
        }

        // Insert the documentation
        fileLines.splice(insertLine, 0, ...docLines, '');
      }
    }

    // Create a new commit with the updated file
    const newContent = fileLines.join('\n');
    const newContentBase64 = Buffer.from(newContent, 'utf-8').toString('base64');

    const commitUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filename}`;
    const commitResponse = await fetch(commitUrl, {
      method: 'PUT',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${githubToken}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `docs: Update documentation for ${filename}`,
        content: newContentBase64,
        sha: fileData.sha,
        branch: branch
      })
    });

    if (!commitResponse.ok) {
      const errorData = await commitResponse.json();
      throw new Error(`Failed to commit: ${JSON.stringify(errorData)}`);
    }

    const commitData = await commitResponse.json();

    return {
      filename,
      success: true,
      commitSha: commitData.commit.sha
    };

  } catch (error) {
    return {
      filename,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Helper function to commit DOC.MD updates
async function commitDocMdUpdate(
  owner: string,
  repo: string,
  docMdPath: string,
  updatedContent: string,
  currentSha: string,
  branch: string,
  githubToken: string
): Promise<{ filename: string; success: boolean; commitSha?: string; error?: string }> {
  try {
    const newContentBase64 = Buffer.from(updatedContent, 'utf-8').toString('base64');

    const commitUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${docMdPath}`;
    const commitResponse = await fetch(commitUrl, {
      method: 'PUT',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${githubToken}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `docs: Update ${docMdPath} with PR changes`,
        content: newContentBase64,
        sha: currentSha,
        branch: branch
      })
    });

    if (!commitResponse.ok) {
      const errorData = await commitResponse.json();
      throw new Error(`Failed to commit: ${JSON.stringify(errorData)}`);
    }

    const commitData = await commitResponse.json();

    return {
      filename: docMdPath,
      success: true,
      commitSha: commitData.commit.sha
    };

  } catch (error) {
    return {
      filename: docMdPath,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
