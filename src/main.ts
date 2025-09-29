import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';
import { join } from 'path';
import Stripe from 'stripe';
import { AppModule } from './app.module';
import { BillingService } from './billing/billing.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // Serve static files
  app.useStaticAssets(join(__dirname, '..', 'public'));

  // Enable CORS with more permissive settings for development
  app.enableCors({
    origin: [
      /^https?:\/\/(localhost|127\.0\.0\.1):5173$/,
      /^https:\/\/(www\.)?vibestylerai\.com$/,
      /^https:\/\/localhost:5173$/,
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'Accept',
      'Origin',
      'X-Requested-With',
      'X-Client-Id',
      'If-Modified-Since',
      'Cache-Control',
      'Range',
    ],
    maxAge: 86400,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Stripe webhook needs raw body for signature verification
  app.use('/api/v1/stripe/webhook', express.raw({ type: 'application/json' }));
  app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
  app.use('/webhook', express.raw({ type: 'application/json' }));

  // Lightweight alias routes to support /api/* (non-versioned)
  const billing = app.get(BillingService);
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const stripe = stripeKey ? new Stripe(stripeKey) : undefined;
  const priceId = process.env.STRIPE_PRICE_ID;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  const server = app.getHttpAdapter().getInstance() as express.Express;

  server.get('/api/tokens', async (req, res) => {
    try {
      const clientId = (req.headers['x-client-id'] as string | undefined) || undefined;
      try {
        const id = billing.validateClientIdOrThrow(clientId);
        billing.ensureClient(id, 5);
        return res.json({ tokens: billing.getTokens(id) });
      } catch {
        return res.status(400).json({ error: 'Invalid X-Client-Id' });
      }
    } catch (err) {
      return res.status(500).json({ error: 'Internal error' });
    }
  });

  server.post('/api/checkout', express.json(), async (req, res) => {
    try {
      const clientHeader = (req.headers['x-client-id'] as string | undefined) || undefined;
      let clientId: string;
      try {
        clientId = billing.validateClientIdOrThrow(clientHeader);
      } catch {
        return res.status(400).json({ error: 'Invalid X-Client-Id' });
      }
      if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });
      if (!priceId) return res.status(500).json({ error: 'Missing STRIPE_PRICE_ID' });
      const quantityRaw = (req.body && req.body.quantity) || undefined;
      const quantity = Math.max(1, Math.floor(quantityRaw ?? 100));
      logger.log(
        `(Alias) Create checkout: clientId=${clientId} quantity=${quantity} priceId=${priceId}`,
      );
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{ price: priceId, quantity }],
        success_url: `${frontendUrl}/?success=1&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${frontendUrl}/?canceled=1`,
        client_reference_id: clientId,
        metadata: { clientId, quantity: String(quantity) },
      });
      logger.log(`(Alias) Checkout created: sessionId=${session.id} url=${session.url}`);
      return res.json({ url: session.url });
    } catch (err) {
      const message = (err as any)?.message || 'Failed to create checkout';
      const payload =
        process.env.NODE_ENV === 'production'
          ? { error: 'Failed to create checkout' }
          : { error: 'Failed to create checkout', detail: message };
      logger.error(`Checkout error (alias route): ${message}`);
      return res.status(500).json(payload);
    }
  });

  server.post('/api/stripe/webhook', async (req: any, res) => {
    try {
      if (!stripe) return res.status(500).send('Stripe not configured');
      const sig = req.headers['stripe-signature'] as string | undefined;
      const secret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!sig || !secret) return res.status(400).send('Missing signature or secret');
      const event = stripe.webhooks.constructEvent(req.body, sig, secret);
      logger.log(`(Alias) Received webhook event type=${event.type} id=${event.id}`);
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const clientId = (session.metadata?.clientId || session.client_reference_id) as
          | string
          | undefined;
        let quantity = Number(session.metadata?.quantity || 0);
        try {
          const full = await stripe.checkout.sessions.retrieve(session.id, {
            expand: ['line_items'],
          });
          const items = full.line_items?.data || [];
          const sum = items.reduce((acc, li) => acc + (li.quantity || 0), 0);
          if (sum > 0) quantity = sum;
        } catch {}
        if (clientId && quantity > 0) {
          logger.log(
            `(Alias) Fulfill session: id=${session.id} clientId=${clientId} quantity=${quantity}`,
          );
          await billing.safeIncrementFromSession(session.id, clientId, quantity);
        }
      }
      return res.status(200).send('ok');
    } catch (err) {
      logger.error(`(Alias) Webhook error: ${(err as Error).message}`);
      return res.status(400).send(`Webhook Error: ${(err as Error).message}`);
    }
  });

  // Additional compatibility endpoint for Stripe CLI default path
  server.post('/webhook', async (req: any, res) => {
    try {
      if (!stripe) return res.status(500).send('Stripe not configured');
      const sig = req.headers['stripe-signature'] as string | undefined;
      const secret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!sig || !secret) return res.status(400).send('Missing signature or secret');
      const event = stripe.webhooks.constructEvent(req.body, sig, secret);
      logger.log(`(Compat) Received webhook event type=${event.type} id=${event.id}`);
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const clientId = (session.metadata?.clientId || session.client_reference_id) as
          | string
          | undefined;
        let quantity = Number(session.metadata?.quantity || 0);
        try {
          const full = await stripe.checkout.sessions.retrieve(session.id, {
            expand: ['line_items'],
          });
          const items = full.line_items?.data || [];
          const sum = items.reduce((acc, li) => acc + (li.quantity || 0), 0);
          if (sum > 0) quantity = sum;
        } catch {}
        if (clientId && quantity > 0) {
          logger.log(
            `(Compat) Fulfill session: id=${session.id} clientId=${clientId} quantity=${quantity}`,
          );
          await billing.safeIncrementFromSession(session.id, clientId, quantity);
        }
      }
      return res.status(200).send('ok');
    } catch (err) {
      logger.error(`(Compat) Webhook error: ${(err as Error).message}`);
      return res.status(400).send(`Webhook Error: ${(err as Error).message}`);
    }
  });

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('RAG Backend API')
    .setDescription(
      `
      ## NestJS RAG Backend with Pinecone and OpenAI Integration
      
      This API provides document upload, processing, and AI-powered question answering capabilities.
      
      ### Features:
      - **Document Upload**: Support for PDF, TXT, and DOCX files
      - **Semantic Search**: Vector-based document similarity search using Pinecone
      - **AI Question Answering**: Generate contextual answers using OpenAI GPT models
      - **Rate Limiting**: Built-in protection against API abuse
      - **File Processing**: Automatic text extraction and chunking
      
      ### Getting Started:
      1. Upload documents via \`POST /api/v1/documents/upload\`
      2. Ask questions via \`POST /api/v1/query\`
      3. Find similar documents via \`POST /api/v1/query/similar\`
      
      ### Authentication:
      Currently, no authentication is required. In production, implement proper API key authentication.
    `,
    )
    .setVersion('1.0.0')
    .addTag('Health', 'API health and status endpoints')
    .addTag('Documents', 'Document upload and management')
    .addTag('Query', 'Question answering and search')
    .addTag('cannabis', 'Cannabis strain management and mood-based recommendations')
    .addTag('cognee', 'Cognee knowledge graph processing and semantic search')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const port = configService.get<number>('PORT', 3007);

  await app.listen(port);

  logger.log(`🚀 RAG Backend API is running on: http://localhost:${port}`);
  logger.log(`📚 Swagger documentation: http://localhost:${port}/api`);
  logger.log(`🔍 Health check: http://localhost:${port}/api/v1`);
  logger.log(`🌿 Strain Finder: http://localhost:${port}/strain-finder.html`);

  // Log environment status
  const requiredEnvVars = ['PINECONE_API_KEY', 'PINECONE_INDEX_NAME', 'OPENAI_API_KEY'];
  const missingVars = requiredEnvVars.filter(varName => !configService.get(varName));

  if (missingVars.length > 0) {
    logger.warn(`⚠️  Missing environment variables: ${missingVars.join(', ')}`);
    logger.warn('Please check your .env file configuration');
  } else {
    logger.log('✅ All required environment variables are configured');
  }
}

bootstrap().catch(error => {
  const logger = new Logger('Bootstrap');
  logger.error('Failed to start application:', error);
  process.exit(1);
});
