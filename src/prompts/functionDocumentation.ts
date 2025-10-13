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

export interface FunctionInfo {
  functionName: string;
  startLine: number;
  endLine: number;
  existingDoc?: string;
  changes: string[];
  functionCode: string;
}

export interface BatchFunctionDocPromptParams {
  filename: string;
  fileContent: string;
  affectedFunctions: FunctionInfo[];
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
    You are a technical documentation expert and code reviewer analyzing changes in a pull request.
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

  <analysis_requirements>
    Perform a thorough analysis checking for:

    <runtime_errors>
      - Division by zero (check denominators, modulo operations)
      - Null/undefined dereferencing (accessing properties on potentially null values)
      - Array index out of bounds (negative indices, length-based access issues)
      - Type coercion issues (unexpected implicit conversions)
      - Unhandled promise rejections in async functions
    </runtime_errors>

    <logical_errors>
      - Off-by-one errors (loop boundaries, array slicing)
      - Edge cases (empty arrays, zero values, negative numbers, null, undefined)
      - Infinite loops (missing/incorrect break conditions)
      - Race conditions (concurrent access issues, async/await problems)
      - Incorrect boundary conditions (>, >=, <, <=)
    </logical_errors>

    <security_and_performance>
      - Input validation gaps (missing checks on user input)
      - Resource leaks (unclosed connections, event listeners)
      - Performance issues (nested loops with high complexity, unnecessary operations)
    </security_and_performance>

    Be especially thorough with mathematical operations, array/object access, and control flow logic.
  </analysis_requirements>

  <task>
    1. Analyze the function for potential runtime errors and logical issues using the criteria above
    2. Determine if the changes warrant updating the function documentation
    3. If yes, provide updated JSDoc/comment block that should precede this function
    4. Provide a brief summary suitable for the DOC.MD file
    5. List any potential issues found with severity level (critical/high/medium/low)
  </task>

  <response_format>
    <json_schema>
      {
        "needsUpdate": true/false,
        "reason": "Brief explanation of why documentation needs/doesn't need update",
        "inlineDocumentation": "Updated JSDoc comment block (or null if no update needed)",
        "docMdSummary": "Brief summary for DOC.MD (or null if no update needed)",
        "potentialIssues": [
          {
            "type": "division-by-zero|null-reference|array-bounds|off-by-one|race-condition|edge-case|performance|other",
            "description": "Clear description of the issue",
            "severity": "critical|high|medium|low",
            "line": "line number or range where issue occurs (if identifiable)"
          }
        ]
      }
    </json_schema>
    <instruction>
      The "potentialIssues" array should be empty if no issues are found, not null.
    </instruction>
  </response_format>`;
}

/**
 * Builds a batch function documentation prompt for analyzing multiple functions
 * in a single file at once (more efficient than individual function calls).
 */
export function buildBatchFunctionDocPrompt(params: BatchFunctionDocPromptParams): string {
  const { filename, fileContent, affectedFunctions } = params;

  // Build XML structure for each affected function
  const functionsXml = affectedFunctions.map((func, index) => `
  <function index="${index + 1}">
    <name>${func.functionName}</name>
    <lines>${func.startLine}-${func.endLine}</lines>
    <existing_documentation>
${func.existingDoc || 'No existing documentation found'}
    </existing_documentation>
    <changes_made>
${func.changes.join('\n')}
    </changes_made>
    <code>
${func.functionCode}
    </code>
  </function>`).join('\n');

  return `
    <role>
      You are a technical documentation expert and code reviewer. A pull request has made changes to a file with multiple functions.
    </role>

    <context>
      <file>
        ${filename}
      </file>
      <full_file_content>
        ${fileContent}
      </full_file_content>
    </context>

    <affected_functions>
      ${functionsXml}
    </affected_functions>

    <analysis_requirements>
      For EACH function, perform a thorough analysis checking for:

      <runtime_errors>
        - Division by zero (check denominators, modulo operations)
        - Null/undefined dereferencing (accessing properties on potentially null values)
        - Array index out of bounds (negative indices, length-based access issues)
        - Type coercion issues (unexpected implicit conversions)
        - Unhandled promise rejections in async functions
      </runtime_errors>

      <logical_errors>
        - Off-by-one errors (loop boundaries, array slicing)
        - Edge cases (empty arrays, zero values, negative numbers, null, undefined)
        - Infinite loops (missing/incorrect break conditions)
        - Race conditions (concurrent access issues, async/await problems)
        - Incorrect boundary conditions (>, >=, <, <=)
      </logical_errors>

      <security_and_performance>
        - Input validation gaps (missing checks on user input)
        - Resource leaks (unclosed connections, event listeners)
        - Performance issues (nested loops with high complexity, unnecessary operations)
      </security_and_performance>

      Be especially thorough with mathematical operations, array/object access, and control flow logic.
    </analysis_requirements>

    <task>
      For EACH function listed above:
      1. Analyze the function for potential runtime errors and logical issues using the criteria above
      2. Determine if the changes warrant updating the function documentation
      3. If yes, provide updated JSDoc/comment block that should precede this function
      4. Provide a brief summary suitable for the DOC.MD file
      5. List any potential issues found with severity level (critical/high/medium/low)
    </task>

    <response_format>
      <json_schema>
        {
          "functions": [
            {
              "functionName": "name of function",
              "needsUpdate": true/false,
              "reason": "Brief explanation of why documentation needs/doesn't need update",
              "inlineDocumentation": "Updated JSDoc comment block (or null if no update needed)",
              "docMdSummary": "Brief summary for DOC.MD (or null if no update needed)",
              "potentialIssues": [
                {
                  "type": "division-by-zero|null-reference|array-bounds|off-by-one|race-condition|edge-case|performance|other",
                  "description": "Clear description of the issue",
                  "severity": "critical|high|medium|low",
                  "line": "line number or range where issue occurs (if identifiable)"
                }
              ]
            }
          ]
        }
      </json_schema>
      <instruction>
        Return a JSON object with a "functions" array containing one entry for each function in the order they were presented above.
        The "potentialIssues" array should be empty if no issues are found, not null.
      </instruction>
    </response_format>
  `;
}
