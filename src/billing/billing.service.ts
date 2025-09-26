import { Injectable, Logger } from '@nestjs/common';

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
}
