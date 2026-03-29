import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type LimitResult = { success: boolean; limit: number; remaining: number };

const memoryBuckets = new Map<
  string,
  { count: number; resetAt: number }
>();

function memoryLimit(
  key: string,
  max: number,
  windowMs: number,
): LimitResult {
  const now = Date.now();
  let b = memoryBuckets.get(key);
  if (!b || now >= b.resetAt) {
    b = { count: 0, resetAt: now + windowMs };
    memoryBuckets.set(key, b);
  }
  if (b.count >= max) {
    return { success: false, limit: max, remaining: 0 };
  }
  b.count += 1;
  return { success: true, limit: max, remaining: max - b.count };
}

let redisSingleton: Redis | null = null;

function getRedis(): Redis | null {
  if (redisSingleton) return redisSingleton;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redisSingleton = new Redis({ url, token });
  return redisSingleton;
}

let uploadRatelimit: Ratelimit | null = null;
let zipRatelimit: Ratelimit | null = null;
let studioLoginRatelimit: Ratelimit | null = null;

function getUploadRatelimit(): Ratelimit | null {
  if (uploadRatelimit) return uploadRatelimit;
  const redis = getRedis();
  if (!redis) return null;
  uploadRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, "1 m"),
    prefix: "eps-upload",
  });
  return uploadRatelimit;
}

function getZipRatelimit(): Ratelimit | null {
  if (zipRatelimit) return zipRatelimit;
  const redis = getRedis();
  if (!redis) return null;
  zipRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "10 m"),
    prefix: "eps-zip",
  });
  return zipRatelimit;
}

function getStudioLoginRatelimit(): Ratelimit | null {
  if (studioLoginRatelimit) return studioLoginRatelimit;
  const redis = getRedis();
  if (!redis) return null;
  studioLoginRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    prefix: "eps-studio-login",
  });
  return studioLoginRatelimit;
}

export async function rateLimitUploads(identifier: string): Promise<LimitResult> {
  const rl = getUploadRatelimit();
  if (rl) return rl.limit(identifier);
  return memoryLimit(`upload:${identifier}`, 25, 60_000);
}

export async function rateLimitZip(identifier: string): Promise<LimitResult> {
  const rl = getZipRatelimit();
  if (rl) return rl.limit(identifier);
  return memoryLimit(`zip:${identifier}`, 5, 600_000);
}

export async function rateLimitStudioLogin(
  identifier: string,
): Promise<LimitResult> {
  const rl = getStudioLoginRatelimit();
  if (rl) return rl.limit(identifier);
  return memoryLimit(`studio-login:${identifier}`, 10, 60_000);
}
