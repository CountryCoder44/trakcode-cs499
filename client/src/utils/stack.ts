import type { Stack, ExecutionLanguage } from '../api/types';

// Shared by every page that runs code against a Problem
// (PracticeWorkspacePage, FlashCardSessionPage) — was
// previously duplicated locally in each page.
export const STACK_TO_LANGUAGE: Record<Stack, ExecutionLanguage> = {
  python: 'python',
  typescript: 'typescript',
  cpp: 'cpp',
  java: 'java',
};
