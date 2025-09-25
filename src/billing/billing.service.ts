import { Injectable } from '@nestjs/common';

@Injectable()
export class BillingService {
  private balances = new Map<string, number>();

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
}

