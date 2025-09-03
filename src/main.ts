import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as cors from 'cors';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Enable CORS
  app.use(cors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:4200',
      'https://your-frontend-domain.com'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  }));

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('RAG Backend API')
    .setDescription(`
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
    `)
    .setVersion('1.0.0')
    .addTag('Health', 'API health and status endpoints')
    .addTag('Documents', 'Document upload and management')
    .addTag('Query', 'Question answering and search')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const port = configService.get<number>('PORT', 3000);
  
  await app.listen(port);
  
  logger.log(`🚀 RAG Backend API is running on: http://localhost:${port}`);
  logger.log(`📚 Swagger documentation: http://localhost:${port}/api`);
  logger.log(`🔍 Health check: http://localhost:${port}/api/v1`);
  
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