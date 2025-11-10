import { Body, Controller, Get, Logger, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import Stripe from 'stripe';
import { BillingService } from './billing.service';

function getClientIdFromCookieOrFail(req: Request, res: Response, billing: BillingService): string {
  // Prefer signed cookie. If invalid/missing, a new one is minted and set.
  return billing.getOrCreateSignedClientId(req, res);
}

@Controller()
export class BillingController {
  private stripe?: Stripe;
  private readonly logger = new Logger('BillingController');

  constructor(private readonly billing: BillingService) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (key) {
      this.stripe = new Stripe(key);
    }
  }

  @Get('tokens')
  @Throttle({ short: { limit: 5, ttl: 1000 } })
  async getTokens(@Req() req: Request, @Res() res: Response) {
    const clientId = getClientIdFromCookieOrFail(req, res, this.billing);
    this.billing.ensureClient(clientId, 1);
    const tokens = this.billing.getTokens(clientId);
    this.logger.log(`Get tokens: clientId=${clientId} tokens=${tokens}`);
    return res.json({ tokens });
  }

  @Post('checkout')
  @Throttle({ short: { limit: 3, ttl: 1000 }, medium: { limit: 20, ttl: 60000 } })
  async createCheckout(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: { quantity?: number },
  ) {
    const clientId = getClientIdFromCookieOrFail(req, res, this.billing);
    try {
      if (!this.stripe) {
        return res.status(500).json({ error: 'Stripe not configured' });
      }
      const priceId = process.env.STRIPE_PRICE_ID;
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const quantity = Math.max(1, Math.floor(body?.quantity ?? 100));

      if (!priceId) {
        return res.status(500).json({ error: 'Missing STRIPE_PRICE_ID' });
      }

      this.logger.log(
        `Create checkout: clientId=${clientId} quantity=${quantity} priceId=${priceId}`,
      );
      const session = await this.stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [
          {
            price: priceId,
            quantity,
          },
        ],
        success_url: `${frontendUrl}/?success=1&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${frontendUrl}/?canceled=1`,
        client_reference_id: clientId,
        metadata: { clientId, quantity: String(quantity) },
      });

      this.logger.log(`Checkout created: sessionId=${session.id} url=${session.url}`);
      return res.json({ url: session.url });
    } catch (err) {
      const message = (err as any)?.message || 'Failed to create checkout';
      // Avoid leaking details in prod
      const payload =
        process.env.NODE_ENV === 'production'
          ? { error: 'Failed to create checkout' }
          : { error: 'Failed to create checkout', detail: message };
      this.logger.error(`Checkout error: ${message}`);
      return res.status(500).json(payload);
    }
  }
}
