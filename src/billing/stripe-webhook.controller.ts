import { Controller, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import Stripe from 'stripe';
import { BillingService } from './billing.service';

@Controller('stripe')
export class StripeWebhookController {
  private stripe?: Stripe;

  constructor(private readonly billing: BillingService) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (key) this.stripe = new Stripe(key);
  }

  @Post('webhook')
  async handle(@Req() req: Request, @Res() res: Response) {
    try {
      if (!this.stripe) return res.status(500).send('Stripe not configured');
      const sig = req.headers['stripe-signature'] as string | undefined;
      const secret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!sig || !secret) return res.status(400).send('Missing signature or secret');

      // req.body is raw Buffer due to express.raw middleware in main.ts
      const event = this.stripe.webhooks.constructEvent(req.body as any, sig, secret);

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const uid = (session.client_reference_id || session.metadata?.uid) as string | undefined;
        let quantity = Number(session.metadata?.quantity || 0);
        try {
          const full = await this.stripe.checkout.sessions.retrieve(session.id, { expand: ['line_items'] });
          const items = full.line_items?.data || [];
          const sum = items.reduce((acc, li) => acc + (li.quantity || 0), 0);
          if (sum > 0) quantity = sum;
        } catch {}

        if (uid && quantity > 0) {
          this.billing.increment(uid, quantity);
        }
      }

      return res.status(200).send('ok');
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${(err as Error).message}`);
    }
  }
}
