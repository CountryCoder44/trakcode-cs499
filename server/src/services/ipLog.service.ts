import type { Request } from 'express';
import { UserIp, IpEvent } from '../models/UserIp';

// Records which IP address an account used (see models/UserIp.ts). Fire and
// forget: logging must never slow down or break the request it's attached to.
// req.ip is the visitor's real address because app.ts trusts one proxy (Caddy).

export function clientIp(req: Request): string | null {
  const ip = req.ip ?? req.socket?.remoteAddress ?? null;
  return ip ? ip.replace(/^::ffff:/, '') : null;
}

export async function recordIp(userId: string, ip: string | null, event: IpEvent): Promise<void> {
  if (!ip) return;
  await UserIp.updateOne(
    { userId, ip },
    {
      $setOnInsert: { firstSeenAt: new Date() },
      $set: { lastSeenAt: new Date() },
      $inc: { count: 1 },
      $addToSet: { events: event },
    },
    { upsert: true },
  );
}

/** Same as recordIp, without waiting; failures are logged, never thrown. */
export function logIp(userId: string, req: Request, event: IpEvent): void {
  recordIp(userId, clientIp(req), event).catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[ip-log] failed', err);
  });
}

/** Other accounts seen at any of these addresses (for abuse review). */
export async function accountsSharingIps(userId: string, ips: string[]): Promise<{ userId: string; ip: string }[]> {
  if (!ips.length) return [];
  const rows = await UserIp.find({ ip: { $in: ips }, userId: { $ne: userId } })
    .select('userId ip')
    .limit(50)
    .lean();
  return rows.map((r) => ({ userId: r.userId.toString(), ip: r.ip }));
}
