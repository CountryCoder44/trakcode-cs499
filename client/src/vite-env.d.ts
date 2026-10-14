/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Unique id of this build ("dev" in the dev server). Set in vite.config.ts. */
declare const __BUILD_ID__: string;
