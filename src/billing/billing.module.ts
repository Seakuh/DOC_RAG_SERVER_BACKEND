import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { StripeWebhookController } from './stripe-webhook.controller';

@Module({
  controllers: [BillingController, StripeWebhookController],
  providers: [BillingService],
})
export class BillingModule {}

