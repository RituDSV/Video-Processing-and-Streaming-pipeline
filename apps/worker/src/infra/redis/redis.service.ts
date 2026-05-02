import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  private readonly redis: Redis;

  constructor() {
    const url = process.env.REDIS_URL;
    if (!url) {
      throw new Error('REDIS_URL is not defined');
    }

    this.redis = new Redis(url);
  }

  /**
   * Acquire an idempotency lock atomically.
   * Returns true if acquired, false if already exists.
   */
  async acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.redis.eval(
      `
      if redis.call("SETNX", KEYS[1], "1") == 1 then
        redis.call("EXPIRE", KEYS[1], ARGV[1])
        return 1
      else
        return 0
      end
      `,
      1,
      key,
      ttlSeconds,
    );

    return result === 1;
  }

  async releaseLock(key: string): Promise<void> {
    await this.redis.del(key);
  }
}