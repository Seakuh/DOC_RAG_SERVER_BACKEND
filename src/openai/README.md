# OpenAI Module

## Overview
Direct OpenAI API integration module for asking questions with flexible model selection.

## Endpoint

**POST** `/api/v1/openai/ask`

## Features
- ✅ Support for multiple OpenAI models (GPT-4, GPT-4 Turbo, GPT-4o, GPT-4o-mini, GPT-3.5 Turbo)
- ✅ Optional system message for context setting
- ✅ Automatic token usage tracking
- ✅ Validation with Swagger documentation
- ✅ Error handling and logging

---

## Request Body

```json
{
  "question": "What is the capital of Germany?",
  "model": "gpt-4o-mini",
  "systemMessage": "You are a helpful assistant that answers concisely."
}
```

### Parameters

| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| `question` | string | Yes | The question or prompt to send to OpenAI | - |
| `model` | enum | No | OpenAI model to use | `gpt-4o-mini` |
| `systemMessage` | string | No | System message to set context | - |

### Available Models

- `gpt-4` - Most capable model (slower, expensive)
- `gpt-4-turbo` - Faster GPT-4 with 128k context
- `gpt-4o` - Latest optimized GPT-4
- `gpt-4o-mini` - Fast and cost-effective (default)
- `gpt-3.5-turbo` - Legacy fast model

---

## Response

```json
{
  "answer": "The capital of Germany is Berlin. It has been the capital since German reunification in 1990.",
  "model": "gpt-4o-mini",
  "tokensUsed": 42,
  "finishReason": "stop",
  "timestamp": "2025-11-11T10:30:00.000Z"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `answer` | string | OpenAI's response to the question |
| `model` | string | Model used for the request |
| `tokensUsed` | number | Total tokens consumed (prompt + completion) |
| `finishReason` | string | Reason completion stopped (`stop`, `length`, `content_filter`) |
| `timestamp` | string | ISO 8601 timestamp of response |

---

## cURL Examples

### 1. Simple Question (Default Model)

```bash
curl -X POST http://localhost:3000/api/v1/openai/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is the capital of Germany?"
  }'
```

**Response:**
```json
{
  "answer": "The capital of Germany is Berlin.",
  "model": "gpt-4o-mini",
  "tokensUsed": 28,
  "finishReason": "stop",
  "timestamp": "2025-11-11T10:30:00.000Z"
}
```

---

### 2. With Specific Model (GPT-4)

```bash
curl -X POST http://localhost:3000/api/v1/openai/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Explain quantum computing in simple terms",
    "model": "gpt-4"
  }'
```

---

### 3. With System Message (Custom Context)

```bash
curl -X POST http://localhost:3000/api/v1/openai/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What are best practices for NestJS development?",
    "model": "gpt-4o-mini",
    "systemMessage": "You are a senior NestJS developer. Answer with code examples."
  }'
```

---

### 4. Technical Question with GPT-4 Turbo

```bash
curl -X POST http://localhost:3000/api/v1/openai/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "How do I implement JWT authentication in NestJS?",
    "model": "gpt-4-turbo"
  }'
```

---

### 5. Creative Writing with GPT-4o

```bash
curl -X POST http://localhost:3000/api/v1/openai/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Write a haiku about coding",
    "model": "gpt-4o",
    "systemMessage": "You are a poet who specializes in technical haikus."
  }'
```

---

### 6. Cost-Effective with GPT-3.5 Turbo

```bash
curl -X POST http://localhost:3000/api/v1/openai/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is 2+2?",
    "model": "gpt-3.5-turbo"
  }'
```

---

## Production cURL (Replace localhost with your domain)

```bash
curl -X POST https://api.yourdomain.com/api/v1/openai/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Your question here",
    "model": "gpt-4o-mini"
  }'
```

---

## Error Handling

### Invalid Model

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/openai/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Test",
    "model": "invalid-model"
  }'
```

**Response (400 Bad Request):**
```json
{
  "statusCode": 400,
  "message": ["Invalid model specified"],
  "error": "Bad Request"
}
```

---

### Empty Question

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/openai/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": ""
  }'
```

**Response (400 Bad Request):**
```json
{
  "statusCode": 400,
  "message": ["Question cannot be empty"],
  "error": "Bad Request"
}
```

---

### OpenAI API Error

**Response (400 Bad Request):**
```json
{
  "statusCode": 400,
  "message": "Failed to get response from OpenAI: Rate limit exceeded",
  "error": "Bad Request"
}
```

---

## Environment Variables Required

```env
OPENAI_API_KEY=sk-proj-your-key-here
OPENAI_MODEL=gpt-4o-mini  # Default model (optional)
```

---

## Swagger Documentation

Once the server is running, visit:

**http://localhost:3000/api**

Navigate to the **OpenAI** section to test the endpoint interactively.

---

## Testing with Different Models

### Performance Comparison

| Model | Speed | Cost | Best For |
|-------|-------|------|----------|
| `gpt-3.5-turbo` | ⚡⚡⚡ | $ | Simple Q&A, high volume |
| `gpt-4o-mini` | ⚡⚡⚡ | $$ | Balanced performance |
| `gpt-4o` | ⚡⚡ | $$$ | Complex reasoning |
| `gpt-4-turbo` | ⚡⚡ | $$$$ | Long context (128k tokens) |
| `gpt-4` | ⚡ | $$$$$ | Highest accuracy |

---

## Rate Limiting

The endpoint is protected by global throttling:
- **Short:** 10 requests/second
- **Medium:** 100 requests/minute
- **Long:** 1000 requests/hour

---

## Logging

All requests are logged with:
- Model selection
- Token usage
- Finish reason
- Error messages (if any)

Check server logs for debugging:
```bash
# Docker
docker logs rag-backend

# Direct Node
npm run start:dev
```

---

## Future Enhancements

- [ ] Streaming responses (SSE)
- [ ] Token usage billing integration
- [ ] Response caching
- [ ] Conversation history support
- [ ] Function calling support
- [ ] Image generation integration

---

## Module Structure

```
src/openai/
├── dto/
│   └── ask-openai.dto.ts       # Request validation
├── openai.controller.ts        # API endpoint
├── openai.service.ts           # OpenAI SDK integration
├── openai.module.ts            # Module definition
└── README.md                   # This file
```

---

## License

This module is part of the RAG Backend project.
