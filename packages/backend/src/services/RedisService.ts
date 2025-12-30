import { createClient, RedisClientType } from 'redis';
import { config } from '../config';

class RedisService {
  private client: RedisClientType;
  private isConnected: boolean = false;

  constructor() {
    this.client = createClient({
      url: config.redis.url || `redis://${config.redis.host}:${config.redis.port}`,
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      console.log('Redis Client Connected');
      this.isConnected = true;
    });

    this.client.on('disconnect', () => {
      console.log('Redis Client Disconnected');
      this.isConnected = false;
    });
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
    }
  }

  async set(key: string, value: string, expireInSeconds?: number): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Redis client not connected');
    }

    if (expireInSeconds) {
      await this.client.setEx(key, expireInSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.isConnected) {
      throw new Error('Redis client not connected');
    }

    return await this.client.get(key);
  }

  async del(key: string): Promise<number> {
    if (!this.isConnected) {
      throw new Error('Redis client not connected');
    }

    return await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isConnected) {
      throw new Error('Redis client not connected');
    }

    const result = await this.client.exists(key);
    return result === 1;
  }

  async setJson(key: string, value: any, expireInSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), expireInSeconds);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      console.error('Error parsing JSON from Redis:', error);
      return null;
    }
  }

  async setHash(key: string, field: string, value: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Redis client not connected');
    }

    await this.client.hSet(key, field, value);
  }

  async getHash(key: string, field: string): Promise<string | undefined> {
    if (!this.isConnected) {
      throw new Error('Redis client not connected');
    }

    return await this.client.hGet(key, field);
  }

  async getAllHash(key: string): Promise<Record<string, string>> {
    if (!this.isConnected) {
      throw new Error('Redis client not connected');
    }

    return await this.client.hGetAll(key);
  }

  async delHash(key: string, field: string): Promise<number> {
    if (!this.isConnected) {
      throw new Error('Redis client not connected');
    }

    return await this.client.hDel(key, field);
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.isConnected) {
      throw new Error('Redis client not connected');
    }

    const result = await this.client.expire(key, seconds);
    return result;
  }

  async ttl(key: string): Promise<number> {
    if (!this.isConnected) {
      throw new Error('Redis client not connected');
    }

    return await this.client.ttl(key);
  }

  // Session management helpers
  async setSession(sessionId: string, userId: string, expireInSeconds: number = 7 * 24 * 60 * 60): Promise<void> {
    await this.set(`session:${sessionId}`, userId, expireInSeconds);
  }

  async getSession(sessionId: string): Promise<string | null> {
    return await this.get(`session:${sessionId}`);
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.del(`session:${sessionId}`);
  }

  // Cache helpers
  async cache<T>(key: string, fetchFunction: () => Promise<T>, expireInSeconds: number = 300): Promise<T> {
    const cached = await this.getJson<T>(key);

    if (cached !== null) {
      return cached;
    }

    const fresh = await fetchFunction();
    await this.setJson(key, fresh, expireInSeconds);

    return fresh;
  }

  async invalidateCache(pattern: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Redis client not connected');
    }

    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(keys);
    }
  }

  getClient(): RedisClientType {
    return this.client;
  }

  isClientConnected(): boolean {
    return this.isConnected;
  }
}

export const redisService = new RedisService();
export default redisService;