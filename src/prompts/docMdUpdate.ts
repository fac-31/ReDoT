/**
 * DOC.MD Update Prompt Template
 *
 * Generates a structured XML prompt for Claude to update the DOC.MD file
 * based on function documentation changes from a pull request.
 */

export interface DocMdUpdatePromptParams {
  existingDocMd: string;
  documentationUpdates: Array<{
    filename: string;
    functionName: string;
    docMdSummary: string;
    needsUpdate: boolean;
  }>;
}

/**
 * Builds a DOC.MD update prompt using XML structure
 * for improved semantic clarity and model understanding.
 */
export function buildDocMdUpdatePrompt(params: DocMdUpdatePromptParams): string {
  const { existingDocMd, documentationUpdates } = params;

  // Filter to only updates that need documentation
  const updatesNeeded = documentationUpdates.filter(u => u.needsUpdate);

  // Build XML structure for function updates
  const functionUpdatesXml = updatesNeeded
    .map(update => `  <update>
    <file>${update.filename}</file>
    <function>${update.functionName}</function>
    <summary>${update.docMdSummary}</summary>
  </update>`)
    .join('\n');

  return `<role>You are updating a DOC.MD file based on changes from a pull request.</role>

<existing_doc>
${existingDocMd || 'No existing DOC.MD found'}
</existing_doc>

<function_updates>
${functionUpdatesXml}
</function_updates>

<task>
Update the DOC.MD to reflect these changes. Maintain the existing structure and only update relevant sections or add new entries as needed.

Provide the complete updated DOC.MD content.
</task>`;
}
