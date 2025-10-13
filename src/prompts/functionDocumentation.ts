/**
 * Function Documentation Prompt Template
 *
 * Generates a structured XML prompt for Claude to analyze function changes
 * and determine if documentation updates are needed.
 */

export interface FunctionDocPromptParams {
  filename: string;
  functionName: string;
  startLine: number;
  endLine: number;
  existingDoc?: string;
  changes: string[];
  functionCode: string;
}

/**
 * Builds a function documentation analysis prompt using XML structure
 * for improved semantic clarity and model understanding.
 */
export function buildFunctionDocPrompt(params: FunctionDocPromptParams): string {
  const {
    filename,
    functionName,
    startLine,
    endLine,
    existingDoc,
    changes,
    functionCode
  } = params;

  return `
  <role>
    You are a technical documentation expert analyzing changes in a pull request.
  </role>

  <context>
    <file>${filename}</file>
    <function>${functionName}</function>
    <lines_changed>${startLine}-${endLine}</lines_changed>
  </context>

  <existing_documentation>
    ${existingDoc || 'No existing documentation found'}
  </existing_documentation>

  <changes>
    ${changes.join('\n')}
  </changes>

  <function_context>
    ${functionCode}
  </function_context>

  <task>
    1. Determine if the changes warrant updating the function documentation
    2. If yes, provide updated JSDoc/comment block that should precede this function
    3. Provide a brief summary suitable for the DOC.MD file
  </task>

  <response_format>
    <json_schema>
      {
        "needsUpdate": true/false,
        "reason": "Brief explanation of why documentation needs/doesn't need update",
        "inlineDocumentation": "Updated JSDoc comment block (or null if no update needed)",
        "docMdSummary": "Brief summary for DOC.MD (or null if no update needed)"
      }
    </json_schema>
  </response_format>`;
}
