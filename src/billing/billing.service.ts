import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import type { Request, Response } from 'express';

function isValidClientId(id?: string): id is string {
  if (!id) return false;
  if (typeof id !== 'string') return false;
  if (id.length < 8 || id.length > 64) return false;
  // Only lowercase letters, digits and dash per contract
  if (!/^[a-z0-9-]+$/.test(id)) return false;
  return true;
}

@Injectable()
export class BillingService {
  private balances = new Map<string, number>();
  private processedSessions = new Set<string>();
  private locks = new Map<string, Promise<void>>();
  private readonly logger = new Logger('BillingService');
  private readonly secret: string = process.env.CLIENT_ID_SECRET || crypto.randomBytes(32).toString('hex');

  private async withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.locks.get(key) || Promise.resolve();
    let release!: () => void;
    const next = new Promise<void>((res) => (release = res));
    this.locks.set(key, prev.then(() => next));
    await prev;
    try {
      return await fn();
    } finally {
      release();
      // Best-effort cleanup
      if (this.locks.get(key) === next) this.locks.delete(key);
    }
  }

  ensureClient(clientId: string, initial = 5) {
    if (!this.balances.has(clientId)) {
      this.balances.set(clientId, Math.max(0, Math.floor(initial)));
    }
  }

  getTokens(uid: string): number {
    return this.balances.get(uid) ?? 0;
  }

  setTokens(uid: string, tokens: number) {
    this.balances.set(uid, Math.max(0, Math.floor(tokens)));
  }

  increment(uid: string, by: number) {
    const current = this.getTokens(uid);
    const next = current + Math.max(0, Math.floor(by || 0));
    this.balances.set(uid, next);
    return next;
  }

  async safeIncrementFromSession(sessionId: string, clientId: string, by: number) {
    if (!isValidClientId(clientId)) return;
    if (this.processedSessions.has(sessionId)) {
      this.logger.log(`Skip duplicate fulfillment for session=${sessionId} clientId=${clientId}`);
      return; // idempotent
    }
    await this.withLock(clientId, async () => {
      if (this.processedSessions.has(sessionId)) return;
      this.ensureClient(clientId);
      const before = this.getTokens(clientId);
      const after = this.increment(clientId, by);
      this.logger.log(`Credited tokens via Stripe: clientId=${clientId} +${by} (before=${before} after=${after}) session=${sessionId}`);
      this.processedSessions.add(sessionId);
    });
  }

  async reserveTokens(clientId: string, amount: number) {
    if (!isValidClientId(clientId)) {
      throw new Error('Invalid client id');
    }
    amount = Math.max(1, Math.floor(amount));
    await this.withLock(clientId, async () => {
      this.ensureClient(clientId);
      const current = this.getTokens(clientId);
      if (current < amount) {
        this.logger.warn(`Insufficient tokens: clientId=${clientId} balance=${current} requested=${amount}`);
        throw new Error('INSUFFICIENT_TOKENS');
      }
      this.setTokens(clientId, current - amount);
      this.logger.log(`Reserved tokens: clientId=${clientId} -${amount} (before=${current} after=${current - amount})`);
    });
  }

  async refundTokens(clientId: string, amount: number) {
    if (!isValidClientId(clientId)) return;
    amount = Math.max(1, Math.floor(amount));
    await this.withLock(clientId, async () => {
      this.ensureClient(clientId);
      const before = this.getTokens(clientId);
      const after = this.increment(clientId, amount);
      this.logger.log(`Refunded tokens after failure: clientId=${clientId} +${amount} (before=${before} after=${after})`);
    });
  }

  validateClientIdOrThrow(id?: string): string {
    if (!isValidClientId(id)) {
      throw new Error('Invalid X-Client-Id');
    }
    return id!;
  }

  // Signed client id helpers (cookie-based)
  private base64url(buf: Buffer) {
    return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  private signId(id: string): string {
    const h = crypto.createHmac('sha256', this.secret).update(id).digest();
    return this.base64url(h);
  }

  private makeNewClientId(): string {
    // 16 random bytes as hex => 32 chars, matches allowed charset (a-f0-9)
    return crypto.randomBytes(16).toString('hex');
  }

  verifySignedClientCookie(val?: string): string | null {
    if (!val) return null;
    const dot = val.lastIndexOf('.');
    if (dot <= 0) return null;
    const id = val.slice(0, dot);
    const sig = val.slice(dot + 1);
    if (!isValidClientId(id)) return null;
    const expected = this.signId(id);
    if (sig !== expected) return null;
    return id;
  }

  getOrCreateSignedClientId(req: Request, res: Response, initialTokens = 1): string {
    const rawCookie = req.headers['cookie'] as string | undefined;
    const cookies: Record<string, string> = {};
    if (rawCookie) {
      for (const part of rawCookie.split(';')) {
        const [k, ...rest] = part.split('=');
        const key = (k || '').trim();
        const value = rest.join('=').trim();
        if (key) cookies[key] = decodeURIComponent(value || '');
      }
    }
    const current = cookies['cid'];
    const verified = this.verifySignedClientCookie(current);
    if (verified) {
      this.ensureClient(verified, initialTokens);
      return verified;
    }
    const id = this.makeNewClientId();
    const token = `${id}.${this.signId(id)}`;
    // Cookie options: 1 year, HttpOnly, SameSite=Lax, Secure in production
    const secure = process.env.NODE_ENV === 'production';
    const maxAge = 365 * 24 * 60 * 60 * 1000; // 1y
    (res as Response).cookie('cid', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      maxAge,
      path: '/',
    } as any);
    this.ensureClient(id, initialTokens);
    return id;
  }
}
