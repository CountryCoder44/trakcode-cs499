// Creates an admin account, or resets an existing account's password and makes
// it an admin. The public API never grants the admin role, so this is the only
// way to get one on a fresh database.
//
// Run this with the dev server STOPPED — connectDB() spins its own
// mongodb-memory-server against the same persistent dbPath, and two of them
// fight over the WiredTiger lock.
//
//   npm run create:admin -w server -- --email prof@example.edu --name "Professor"
//   npm run create:admin -w server -- --email prof@example.edu --password "..."
//
// With no --password, a random one is generated and printed once.
import crypto from 'crypto';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User';
import { hashPassword } from '../utils/password';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = arg('email')?.trim().toLowerCase();
  if (!email) throw new Error('Usage: --email <address> [--name <name>] [--password <password>]');
  const name = arg('name') ?? 'Admin';
  const password = arg('password') ?? crypto.randomBytes(12).toString('base64url');
  if (password.length < 8) throw new Error('The password must be at least 8 characters.');

  await connectDB();
  const passwordHash = await hashPassword(password);
  const existing = await User.findOne({ email });
  if (existing) {
    if (arg('name')) existing.name = name;
    existing.role = 'admin';
    existing.passwordHash = passwordHash;
    existing.emailVerified = true;
    await existing.save();
  } else {
    await User.create({ email, name, passwordHash, role: 'admin', emailVerified: true });
  }
  // Flush to disk before disconnectDB() stops the local mongod. Stopping it right
  // after a write otherwise loses the write (it's still in the journal buffer).
  await mongoose.connection.db!.admin().command({ fsync: 1 });
  // eslint-disable-next-line no-console
  console.log(`\n${existing ? 'Updated' : 'Created'} admin account\n  Email:    ${email}\n  Password: ${password}\n`);
  await disconnectDB();
}

main().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to create the admin account:', err instanceof Error ? err.message : err);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
