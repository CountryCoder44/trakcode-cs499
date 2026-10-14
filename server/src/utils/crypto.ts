import crypto from 'crypto';
import { env } from '../config/env';

// Encrypts githubAccessToken at rest (§3.1). AES-256-GCM with a random IV per call;
// output is `iv:authTag:ciphertext`, all hex, so it's a single string column-friendly value.
const ALGORITHM = 'aes-256-gcm';

function getKey(): Buffer {
  const secret = env.ENCRYPTION_KEY || env.JWT_SECRET;
  return crypto.createHash('sha256').update(secret).digest(); // 32 bytes, required by aes-256
}

export function encrypt(plainText: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':');
}

export function decrypt(payload: string): string {
  const [ivHex, authTagHex, dataHex] = payload.split(':');
  if (!ivHex || !authTagHex || !dataHex) {
    throw new Error('Malformed encrypted payload');
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
  return decrypted.toString('utf8');
}
