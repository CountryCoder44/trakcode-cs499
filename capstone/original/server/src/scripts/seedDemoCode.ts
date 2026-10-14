// Dev convenience script: creates a demo code directly against the configured
// database. Prefer POST /admin/demo-codes on the running server instead (see
// README.md) — that's the real endpoint and works while the server is up.
//
// This script only works when the dev server is NOT running: with
// MONGODB_URI's `?persist=true` (see server/.env.dev), both processes would
// try to open the same on-disk database, and mongod refuses a second opener
// with a DBPathInUse lock error — harmless, but the script won't create
// anything while the server holds the lock.
//
// Usage: npm run seed:demo-code -- --code=CS4900-PROF --issuedTo="Prof. Smith" --maxUses=50
import { connectDB, disconnectDB } from '../config/db';
import { DemoCode } from '../models/DemoCode';

function parseArgs() {
  const args = new Map<string, string>();
  for (const arg of process.argv.slice(2)) {
    const [key, value] = arg.replace(/^--/, '').split('=');
    if (key && value) args.set(key, value);
  }
  return {
    code: args.get('code') ?? 'CS4900-DEMO',
    issuedTo: args.get('issuedTo') ?? 'Local dev',
    maxUses: Number(args.get('maxUses') ?? 10),
    expiresInDays: args.has('expiresInDays') ? Number(args.get('expiresInDays')) : undefined,
  };
}

async function main() {
  const { code, issuedTo, maxUses, expiresInDays } = parseArgs();
  const normalizedCode = code.trim().toUpperCase();

  await connectDB();

  const demoCode = await DemoCode.findOneAndUpdate(
    { code: normalizedCode },
    {
      $setOnInsert: {
        code: normalizedCode,
        issuedTo,
        maxUses,
        usesRemaining: maxUses,
        expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : undefined,
      },
    },
    { upsert: true, new: true }
  );

  // eslint-disable-next-line no-console
  console.log('✅ Demo code ready:', {
    code: demoCode.code,
    issuedTo: demoCode.issuedTo,
    usesRemaining: demoCode.usesRemaining,
    expiresAt: demoCode.expiresAt ?? null,
  });

  await disconnectDB();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('❌ Failed to seed demo code:', err);
  process.exit(1);
});
