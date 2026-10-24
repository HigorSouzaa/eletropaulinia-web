import { createHash } from 'node:crypto';
import AuthAttempt from '../models/AuthAttempt.js';

const WINDOW_MS = 15 * 60 * 1000;
const IP_LIMIT = 100;
const PAIR_FAILURE_LIMIT = 5;

const keyFor = (kind, value, bucket) => createHash('sha256').update(`${kind}\0${value}\0${bucket}`).digest('hex');
const windowFor = now => {
  const bucket = Math.floor(now / WINDOW_MS);
  return { bucket, expiresAt: new Date((bucket + 2) * WINDOW_MS), retryAfter: Math.max(1, Math.ceil(((bucket + 1) * WINDOW_MS - now) / 1000)) };
};

async function increment(key, expiresAt) {
  try {
    const result = await AuthAttempt.findOneAndUpdate({ _id: key },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt } }, { upsert: true, new: true, lean: true });
    return result.count;
  } catch (error) {
    if (error.code !== 11000) throw error;
    const result = await AuthAttempt.findOneAndUpdate({ _id: key }, { $inc: { count: 1 } }, { new: true, lean: true });
    if (!result) throw error;
    return result.count;
  }
}

export class LoginThrottled extends Error {
  constructor(retryAfter) {
    super('LOGIN_THROTTLED');
    this.retryAfter = retryAfter;
  }
}

export async function beforeLogin(username, remoteAddress, now = Date.now()) {
  const { bucket, expiresAt, retryAfter } = windowFor(now);
  const ip = remoteAddress || 'unknown';
  const normalized = username.trim().toLowerCase();
  const pairKey = keyFor('pair', `${ip}\0${normalized}`, bucket);
  const existing = await AuthAttempt.findById(pairKey).lean();
  if (existing?.count >= PAIR_FAILURE_LIMIT) throw new LoginThrottled(retryAfter);
  const count = await increment(keyFor('ip', ip, bucket), expiresAt);
  if (count > IP_LIMIT) throw new LoginThrottled(retryAfter);
  return { pairKey, expiresAt, retryAfter };
}

export async function failedLogin(context) {
  const count = await increment(context.pairKey, context.expiresAt);
  if (count >= PAIR_FAILURE_LIMIT) throw new LoginThrottled(context.retryAfter);
}

export async function successfulLogin(context) {
  await AuthAttempt.deleteOne({ _id: context.pairKey });
}
