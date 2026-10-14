import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { promises as fs } from 'fs';

// One fresh directory per execution, always removed afterward — the local-dev
// approximation of spec §4's "one container per execution, destroyed after,
// no state reuse between runs".
export async function withTempDir<T>(prefix: string, fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = path.join(os.tmpdir(), 'trakcode-exec', `${prefix}-${crypto.randomUUID()}`);
  await fs.mkdir(dir, { recursive: true });
  try {
    return await fn(dir);
  } finally {
    // maxRetries/retryDelay matter specifically on Windows: the process we
    // just SIGKILLed (runProcess.ts) doesn't always release its file handles
    // in this directory synchronously with the kill signal, so an immediate
    // fs.rm can throw EBUSY/EPERM — `force: true` only suppresses ENOENT, not
    // that. Without a retry, a transient busy handle leaves this directory
    // behind forever, one per affected execution (the same accumulation
    // pattern found in the mongo-mem-* temp dirs during this session).
    await fs.rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}
