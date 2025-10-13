/**
 * Prompt Templates
 *
 * Centralized exports for all AI prompt templates used in ReDoT.
 * These templates use XML structure for improved semantic clarity
 * and model understanding.
 */

export { buildFunctionDocPrompt } from './functionDocumentation';
export type { FunctionDocPromptParams } from './functionDocumentation';

export { buildDocMdUpdatePrompt } from './docMdUpdate';
export type { DocMdUpdatePromptParams } from './docMdUpdate';
