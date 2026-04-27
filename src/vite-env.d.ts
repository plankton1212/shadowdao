/// <reference types="vite/client" />

// All frontend env vars go here (VITE_ prefix = exposed to browser).
// PINATA_JWT and other secrets are server-side (Vercel Functions) — NOT here.
interface ImportMetaEnv {
  readonly MODE: string;
  readonly BASE_URL: string;
  readonly PROD: boolean;
  readonly DEV: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
