import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { BillingService } from './billing.service';
import Stripe from 'stripe';
import { Request, Response } from 'express';
import * as crypto from 'crypto';

function parseCookies(header?: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx > -1) {
      const key = pair.slice(0, idx).trim();
      const val = decodeURIComponent(pair.slice(idx + 1).trim());
      out[key] = val;
    }
  });
  return out;
}

function ensureUid(req: Request, res: Response): string {
  const cookies = parseCookies(req.headers.cookie);
  let uid = cookies['uid'];
  if (!uid) {
    uid = crypto.randomUUID();
    res.cookie('uid', uid, { httpOnly: true, sameSite: 'lax' });
  }
  return uid;
}

@Controller()
export class BillingController {
  private stripe?: Stripe;

  constructor(private readonly billing: BillingService) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (key) {
      this.stripe = new Stripe(key);
    }
  }

  @Get('tokens')
  async getTokens(@Req() req: Request, @Res() res: Response) {
    const uid = ensureUid(req, res);
    const tokens = this.billing.getTokens(uid);
    return res.json({ tokens });
  }

  @Post('checkout')
  async createCheckout(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: { quantity?: number },
  ) {
    const uid = ensureUid(req, res);
    if (!this.stripe) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }
    const priceId = process.env.STRIPE_PRICE_ID;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const quantity = Math.max(1, Math.floor(body?.quantity ?? 10));

    if (!priceId) {
      return res.status(500).json({ error: 'Missing STRIPE_PRICE_ID' });
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price: priceId,
          quantity,
        },
      ],
      success_url: `${frontendUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/cancel`,
      client_reference_id: uid,
      metadata: { uid, quantity: String(quantity) },
    });

    return res.json({ url: session.url });
  }
}
