# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NestJS-based RAG (Retrieval-Augmented Generation) backend with multiple AI-powered features:
- Document processing and semantic search (PDFs, DOCX, images with OCR)
- Cannabis strain recommendations using vector similarity search
- Cognee Knowledge Graph integration for semantic data processing
- AI image generation via Replicate API
- Stripe billing integration with token-based usage tracking

## Development Commands

### Running the Application
```bash
npm run start:dev          # Development with hot reload
npm run start:debug        # Debug mode (port 9229)
npm run build              # Production build
npm run start:prod         # Run production build
```

### Code Quality
```bash
npm run lint               # Lint TypeScript files
npm run format             # Format code with Prettier
```

### Testing
```bash
npm run test               # Run unit tests
npm run test:watch         # Run tests in watch mode
npm run test:cov           # Generate coverage report
npm run test:e2e           # Run end-to-end tests
```

### Docker
```bash
docker build -t rag-backend .
docker-compose up          # Runs app + Qdrant
```

## Architecture

### Module Structure
The application follows NestJS module architecture with clear separation of concerns:

- **DocumentsModule**: File upload (PDF/DOCX/images), text extraction, OCR processing
- **EmbeddingsModule**: OpenAI text embeddings generation (text-embedding-3-small model)
- **PineconeModule**: Vector database operations for documents and cannabis strains
- **QdrantModule**: Alternative vector database (used alongside Pinecone)
- **LLMModule**: OpenAI GPT integration for text generation and analysis
- **QueryModule**: RAG query processing - semantic search + GPT response generation
- **CannabisModule**: Mood-based cannabis strain recommendations using vector similarity
- **CogneeModule**: Knowledge graph integration for advanced semantic analysis
- **ImageGenModule**: AI image generation via Replicate (minimax/image-01 model)
- **BillingModule**: Stripe checkout and webhook handling, token-based usage tracking
- **ImageModule**: Hetzner Object Storage integration for file uploads

### Document Processing Pipeline
1. **File Upload**: Accepts PDF, TXT, DOCX, and images (JPG, PNG, GIF, BMP, TIFF, WEBP)
2. **Text Extraction**:
   - PDFs: `pdf-parse` library
   - DOCX: `mammoth` library
   - Images: Tesseract.js OCR with Sharp preprocessing (supports German + English)
3. **Chunking**: Text split into 700-character chunks with 100-character overlap
4. **Embedding**: OpenAI text-embedding-3-small (1024 dimensions)
5. **Storage**: Vectors stored in Pinecone with rich metadata

### RAG Query Pipeline
1. User question converted to embedding vector
2. Pinecone similarity search retrieves relevant document chunks
3. Chunks filtered by relevance score threshold
4. GPT-4 generates contextual answer using retrieved chunks
5. Response enriched with source citations and confidence scores

### Cannabis Strain Recommendations
- Strains stored in both MongoDB (structured data) and Pinecone (vector embeddings)
- User mood description analyzed by GPT-4
- Vector similarity search finds matching strains based on effects/terpenes
- Generates personalized recommendation text explaining the match
- Combines semantic search with scientific metadata (THC/CBD, terpene profiles)

### Image Generation System
- **Bubble-based presets**: Frontend sends bubble IDs (e.g., "editorial_studio", "gym_fit")
- **Prompt building**: `prompt.util.ts` maps bubbles to style prompts
- **Styling options**: Gender, hairstyle, hair color, framing (face/full_body/collection)
- **Token deduction**: Uses BillingService to track and deduct tokens per generation
- **Replicate API**: Calls minimax/image-01 model with subject_reference support
- **Storage**: Generated images uploaded to Hetzner Object Storage

### Billing & Token System
- **Anonymous client identification**: Uses `X-Client-Id` header (8-64 alphanumeric chars)
- **Token allocation**: New clients get 5 starter tokens automatically
- **Stripe integration**: Creates checkout sessions, handles webhooks for fulfillment
- **Idempotency**: Webhook processing tracks session IDs to prevent double-crediting
- **Token consumption**: Image generation deducts tokens; returns error if insufficient

### Vector Databases
- **Pinecone**: Primary vector DB for documents and cannabis strains
- **Qdrant**: Secondary vector DB (configured via docker-compose for local dev)
- Both use cosine similarity metric
- Pinecone dimensions: 1024 (OpenAI text-embedding-3-small)

## Environment Configuration

Required environment variables (see `.env.example`):

### Core Services
- `OPENAI_API_KEY`: OpenAI API key for embeddings and GPT
- `OPENAI_MODEL`: Model name (e.g., gpt-4o-mini, gpt-4)
- `EMBEDDING_MODEL`: text-embedding-3-small or alternative
- `REPLICATE_API_TOKEN`: For AI image generation

### Vector Databases
- `PINECONE_API_KEY`, `PINECONE_INDEX_NAME`: Pinecone configuration
- `QDRANT_URL`, `QDRANT_COLLECTION`: Qdrant configuration (default: http://qdrant:6333)

### Billing
- `STRIPE_SECRET_KEY`: Stripe API key
- `STRIPE_PRICE_ID`: Stripe price ID for token purchases
- `STRIPE_WEBHOOK_SECRET`: Webhook signature verification
- `FRONTEND_URL`: CORS and redirect URL (default: http://localhost:5173)

### Optional
- `COGNEE_API_KEY`, `COGNEE_BASE_URL`: Knowledge graph service
- `OLLAMA_HOST`, `OLLAMA_MODEL`: Local LLM alternative to OpenAI

## API Structure

All endpoints use `/api/v1` prefix. Swagger documentation at `http://localhost:3000/api`.

### Key Endpoints
- **Documents**: `/api/v1/documents/*` - Upload, list, delete documents
- **Query**: `/api/v1/query` - RAG question answering, `/api/v1/query/similar` - Semantic search
- **Cannabis**: `/api/v1/cannabis/*` - Strain management and mood-based recommendations
- **Image Generation**: `/api/v1/generate` - Bubble-based image generation with token deduction
- **Billing**: `/api/v1/tokens`, `/api/v1/checkout`, `/api/v1/stripe/webhook`

### Backward Compatibility Routes
Non-versioned aliases exist for billing endpoints: `/api/tokens`, `/api/checkout`, `/api/stripe/webhook`, `/webhook`

## Important Implementation Details

### Rate Limiting
Global throttling configured in `app.module.ts`:
- Short: 10 requests/second
- Medium: 100 requests/minute
- Long: 1000 requests/hour

Controllers can override with `@Throttle()` decorator.

### CORS Configuration
Permissive CORS in `main.ts` allows all origins in development. Update for production.

### Stripe Webhooks
- Multiple webhook routes for compatibility: `/api/v1/stripe/webhook`, `/api/stripe/webhook`, `/webhook`
- Requires raw body parsing (configured in `main.ts`)
- Verifies signatures with `STRIPE_WEBHOOK_SECRET`
- Idempotency handled via session ID tracking in BillingService

### Image Upload Storage
- `ImageService` uploads to Hetzner Object Storage
- Fallback: Local file storage if Hetzner upload fails
- Document files accessible via returned `fileUrl`

### Client Identification
- `BillingService.getOrCreateSignedClientId()` reads `X-Client-Id` header
- Creates signed cookie for persistence
- Initializes new clients with 5 tokens

### OCR Processing
- Tesseract.js with German + English language support
- Sharp preprocessing enhances image quality before OCR
- Supports multiple image formats

## Development Workflow

### Adding a New Feature Module
1. Generate module: `nest generate module feature-name`
2. Add service and controller
3. Import in `app.module.ts`
4. Update Swagger tags in `main.ts`
5. Add DTOs with class-validator decorators
6. Test with Swagger UI at `/api`

### Working with Vector Databases
- Use `PineconeService.upsertVectors()` for bulk inserts
- Use `PineconeService.query()` for similarity search
- Metadata filtering available via `filter` parameter
- Always include meaningful metadata for debugging

### Testing Stripe Webhooks Locally
```bash
stripe listen --forward-to localhost:3000/api/v1/stripe/webhook
stripe trigger checkout.session.completed
```

### Debugging Tips
- All services use NestJS Logger - check console output
- Vector search: Log embedding dimensions and similarity scores
- Stripe webhooks: Check signature verification errors
- Token deduction: Monitor BillingService logs for client IDs

## Common Pitfalls

1. **Embedding dimension mismatch**: Pinecone index must match OpenAI model dimensions (1024 for text-embedding-3-small)
2. **Stripe webhook signature failures**: Ensure raw body parsing is configured before webhook routes
3. **CORS errors**: Check CORS settings in `main.ts` allow your frontend origin
4. **Token deduction not working**: Verify `X-Client-Id` header is sent from frontend
5. **OCR failures**: Low-quality images need high contrast and clear text for best results
6. **Image generation errors**: Check Replicate API token and ensure bubbles array is valid JSON

## External Dependencies

- **OpenAI**: Embeddings and GPT models (rate limits apply)
- **Pinecone**: Vector database (check index quota)
- **Replicate**: Image generation API (usage-based pricing)
- **Stripe**: Payment processing (test mode vs live mode)
- **Hetzner Object Storage**: File hosting (requires S3-compatible credentials)
- **Cognee**: Optional knowledge graph service

## Production Considerations

- Set `NODE_ENV=production`
- Restrict CORS to specific frontend origins
- Configure proper rate limiting for production traffic
- Monitor OpenAI and Replicate API usage/costs
- Set up proper logging and error tracking
- Use production Stripe webhook secrets
- Scale Pinecone index tier as needed
