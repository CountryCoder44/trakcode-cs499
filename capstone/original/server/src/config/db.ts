import path from 'path';
import { promises as fs } from 'fs';
import mongoose from 'mongoose';
import { env } from './env';

// Lazily imported only when actually needed — mongodb-memory-server is a devDependency
// and must never be reachable from a production/capstone-submission code path.
let memoryServer: import('mongodb-memory-server').MongoMemoryServer | undefined;

export async function connectDB(): Promise<void> {
  mongoose.set('strictQuery', true);

  let uri = env.MONGODB_URI;

  if (uri.startsWith('memory://')) {
    // Local dev convenience: `MONGODB_URI=memory://<dbName>` spins up a real
    // mongod in-process so `npm run dev:server` works with zero external setup
    // (no Atlas cluster, no local install). Never allowed outside dev.
    if (env.NODE_ENV !== 'dev') {
      throw new Error('memory:// MongoDB URIs are only allowed when NODE_ENV=dev');
    }

    const [dbNameRaw, queryString] = uri.replace('memory://', '').split('?');
    const dbName = dbNameRaw || 'trakcode_dev';
    const persist = new URLSearchParams(queryString ?? '').get('persist') === 'true';

    const { MongoMemoryServer } = await import('mongodb-memory-server');

    if (persist) {
      // `dbPath` makes this a real on-disk database — the mongod process is
      // still spun up fresh each run (server restart, tsx watch reload,
      // etc.), but it loads the SAME data files every time instead of
      // starting from an empty temp directory. This is what actually fixes
      // "signed out and my demo account is gone" — the account, progress,
      // and demo codes now survive restarts, not just this one process.
      const dataDir = path.resolve(__dirname, '..', '..', '.mongo-data', dbName);
      await fs.mkdir(dataDir, { recursive: true });
      memoryServer = await MongoMemoryServer.create({
        instance: { dbName, dbPath: dataDir, storageEngine: 'wiredTiger' },
      });
      // eslint-disable-next-line no-console
      console.log(`🧪 Using PERSISTENT in-memory MongoDB for local dev (db=${dbName}, data=${dataDir})`);
    } else {
      memoryServer = await MongoMemoryServer.create({ instance: { dbName } });
      // eslint-disable-next-line no-console
      console.log(`🧪 Using EPHEMERAL in-memory MongoDB for local dev (db=${dbName}) — wipes on every restart`);
    }

    uri = memoryServer.getUri(dbName);
  }

  await mongoose.connect(uri);
  // eslint-disable-next-line no-console
  console.log(`✅ MongoDB connected [env=${env.NODE_ENV}, db=${mongoose.connection.name}]`);
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = undefined;
  }
}
