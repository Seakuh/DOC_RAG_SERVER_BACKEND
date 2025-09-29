import { Body, Controller, Get, Post, Req, Res, BadRequestException, Logger } from '@nestjs/common';
import { BillingService } from './billing.service';
import Stripe from 'stripe';
import { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';

function readClientId(req: Request, billing: BillingService): string {
  const hdr = (req.headers['x-client-id'] || req.headers['X-Client-Id']) as string | undefined;
  try {
    return billing.validateClientIdOrThrow(hdr);
  } catch {
    throw new BadRequestException('Invalid X-Client-Id');
  }
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
    const clientId = readClientId(req, this.billing);
    this.billing.ensureClient(clientId, 5);
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
    const clientId = readClientId(req, this.billing);
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

      this.logger.log(`Create checkout: clientId=${clientId} quantity=${quantity} priceId=${priceId}`);
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
      const payload = process.env.NODE_ENV === 'production' ? { error: 'Failed to create checkout' } : { error: 'Failed to create checkout', detail: message };
      this.logger.error(`Checkout error: ${message}`);
      return res.status(500).json(payload);
    }
  }
}
