# Qdrant Upload Module

## Overview
Upload and process PDFs, images (with OCR), and text files directly to Qdrant collections with automatic embedding generation.

## Endpoint

**POST** `/api/v1/qdrant/upload`

## Features
- ✅ Multi-file upload (up to 10 files, 50MB each)
- ✅ Supports PDF, DOCX, TXT, and images (JPG, PNG, GIF, BMP, TIFF, WEBP)
- ✅ Automatic OCR for images (German + English)
- ✅ Text extraction and chunking (700 chars with 100 overlap)
- ✅ OpenAI embedding generation (text-embedding-3-small, 1536 dimensions)
- ✅ Custom collection names
- ✅ Configurable vector dimensions
- ✅ Optional tagging system
- ✅ Automatic collection creation

---

## Request Parameters

### Form Data (multipart/form-data)

| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| `collectionName` | string | Yes | Name of the Qdrant collection to store documents | - |
| `vectorDimension` | number | No | Vector dimension for embeddings | 1536 |
| `tags` | string | No | Comma-separated tags for metadata | - |
| `files` | file[] | Yes | Files to upload (1-10 files, max 50MB each) | - |

### Supported File Types

- **PDF**: `application/pdf`
- **DOCX**: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- **TXT**: `text/plain`
- **Images**: `image/jpeg`, `image/png`, `image/jpg`, `image/gif`, `image/bmp`, `image/tiff`, `image/webp`

---

## Response

```json
{
  "success": true,
  "collectionName": "my-documents",
  "filesProcessed": 3,
  "vectorsCreated": 15,
  "details": [
    {
      "filename": "contract.pdf",
      "fileType": "application/pdf",
      "chunks": 5,
      "vectorsCreated": 5
    },
    {
      "filename": "invoice.jpg",
      "fileType": "image/jpeg",
      "ocrApplied": true,
      "chunks": 2,
      "vectorsCreated": 2
    },
    {
      "filename": "notes.txt",
      "fileType": "text/plain",
      "chunks": 8,
      "vectorsCreated": 8
    }
  ],
  "processingTime": 4532,
  "timestamp": "2025-11-11T10:30:00.000Z"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Overall success status |
| `collectionName` | string | Name of the collection used |
| `filesProcessed` | number | Number of files successfully processed |
| `vectorsCreated` | number | Total vectors created across all files |
| `details` | array | Per-file processing details |
| `details[].filename` | string | Original filename |
| `details[].fileType` | string | MIME type of the file |
| `details[].chunks` | number | Number of text chunks created |
| `details[].vectorsCreated` | number | Number of vectors created from this file |
| `details[].ocrApplied` | boolean | Whether OCR was used (images only) |
| `details[].error` | string | Error message if processing failed |
| `processingTime` | number | Total processing time in milliseconds |
| `timestamp` | string | ISO 8601 timestamp |

---

## cURL Examples

### 1. Upload Single PDF to Collection

```bash
curl -X POST http://localhost:3007/api/v1/qdrant/upload \
  -F "collectionName=legal-documents" \
  -F "files=@/path/to/contract.pdf"
```

**Response:**
```json
{
  "success": true,
  "collectionName": "legal-documents",
  "filesProcessed": 1,
  "vectorsCreated": 12,
  "details": [
    {
      "filename": "contract.pdf",
      "fileType": "application/pdf",
      "chunks": 12,
      "vectorsCreated": 12
    }
  ],
  "processingTime": 2341,
  "timestamp": "2025-11-11T10:30:00.000Z"
}
```

---

### 2. Upload Multiple Files (PDF + Images + Text)

```bash
curl -X POST http://localhost:3007/api/v1/qdrant/upload \
  -F "collectionName=my-documents" \
  -F "files=@./document1.pdf" \
  -F "files=@./invoice.jpg" \
  -F "files=@./notes.txt"
```

---

### 3. Upload with Tags

```bash
curl -X POST http://localhost:3007/api/v1/qdrant/upload \
  -F "collectionName=company-docs" \
  -F "tags=legal,2024,confidential" \
  -F "files=@./contract.pdf" \
  -F "files=@./nda.pdf"
```

---

### 4. Upload Image with OCR (German + English)

```bash
curl -X POST http://localhost:3007/api/v1/qdrant/upload \
  -F "collectionName=scanned-docs" \
  -F "files=@./scanned_invoice.jpg"
```

**Response:**
```json
{
  "success": true,
  "collectionName": "scanned-docs",
  "filesProcessed": 1,
  "vectorsCreated": 3,
  "details": [
    {
      "filename": "scanned_invoice.jpg",
      "fileType": "image/jpeg",
      "ocrApplied": true,
      "chunks": 3,
      "vectorsCreated": 3
    }
  ],
  "processingTime": 5120,
  "timestamp": "2025-11-11T10:35:00.000Z"
}
```

---

### 5. Upload with Custom Vector Dimension

```bash
curl -X POST http://localhost:3007/api/v1/qdrant/upload \
  -F "collectionName=custom-embeddings" \
  -F "vectorDimension=768" \
  -F "files=@./document.txt"
```

**Note:** Make sure your embedding service generates vectors with matching dimensions!

---

### 6. Upload DOCX Files

```bash
curl -X POST http://localhost:3007/api/v1/qdrant/upload \
  -F "collectionName=word-documents" \
  -F "files=@./report.docx" \
  -F "files=@./presentation.docx"
```

---

### 7. Upload to Existing Collection

```bash
# Collection is auto-created if it doesn't exist
# If it exists, vectors are simply added (upserted)

curl -X POST http://localhost:3007/api/v1/qdrant/upload \
  -F "collectionName=existing-collection" \
  -F "files=@./new_document.pdf"
```

---

### 8. Batch Upload (Maximum 10 Files)

```bash
curl -X POST http://localhost:3007/api/v1/qdrant/upload \
  -F "collectionName=batch-upload" \
  -F "tags=batch,2024-11" \
  -F "files=@./doc1.pdf" \
  -F "files=@./doc2.pdf" \
  -F "files=@./doc3.pdf" \
  -F "files=@./doc4.pdf" \
  -F "files=@./doc5.pdf" \
  -F "files=@./doc6.pdf" \
  -F "files=@./doc7.pdf" \
  -F "files=@./doc8.pdf" \
  -F "files=@./doc9.pdf" \
  -F "files=@./doc10.pdf"
```

---

## Processing Pipeline

```
1. File Upload
   ↓
2. Text Extraction
   ├─ PDF: pdf-parse
   ├─ DOCX: mammoth
   ├─ TXT: direct read
   └─ Images: Sharp preprocessing + Tesseract OCR
   ↓
3. Text Chunking
   - Chunk size: 700 characters
   - Overlap: 100 characters
   ↓
4. Embedding Generation
   - OpenAI text-embedding-3-small
   - Dimension: 1536
   ↓
5. Qdrant Storage
   - Collection auto-created if needed
   - Vectors upserted with metadata
   - Payload includes: filename, fileType, text, tags, timestamps
```

---

## Error Handling

### Unsupported File Type

**Request:**
```bash
curl -X POST http://localhost:3007/api/v1/qdrant/upload \
  -F "collectionName=test" \
  -F "files=@./file.exe"
```

**Response (400):**
```json
{
  "statusCode": 400,
  "message": "File type application/x-msdownload not supported. Allowed: PDF, images (JPG, PNG, GIF, BMP, TIFF, WEBP), TXT, DOCX",
  "error": "Bad Request"
}
```

---

### No Files Provided

**Request:**
```bash
curl -X POST http://localhost:3007/api/v1/qdrant/upload \
  -F "collectionName=test"
```

**Response (400):**
```json
{
  "statusCode": 400,
  "message": "No files provided",
  "error": "Bad Request"
}
```

---

### File Too Large

```bash
# Max file size: 50MB per file
curl -X POST http://localhost:3007/api/v1/qdrant/upload \
  -F "collectionName=test" \
  -F "files=@./large_file.pdf"  # > 50MB
```

**Response (400):**
```json
{
  "statusCode": 400,
  "message": "File size exceeds 50MB limit",
  "error": "Bad Request"
}
```

---

### Missing Collection Name

**Request:**
```bash
curl -X POST http://localhost:3007/api/v1/qdrant/upload \
  -F "files=@./document.pdf"
```

**Response (400):**
```json
{
  "statusCode": 400,
  "message": ["Collection name cannot be empty"],
  "error": "Bad Request"
}
```

---

### Partial Success (Some Files Failed)

**Response:**
```json
{
  "success": true,
  "collectionName": "test-collection",
  "filesProcessed": 2,
  "vectorsCreated": 10,
  "details": [
    {
      "filename": "valid.pdf",
      "fileType": "application/pdf",
      "chunks": 10,
      "vectorsCreated": 10
    },
    {
      "filename": "corrupted.pdf",
      "fileType": "application/pdf",
      "chunks": 0,
      "vectorsCreated": 0,
      "error": "Failed to extract text from PDF: Invalid PDF structure"
    }
  ],
  "processingTime": 3200,
  "timestamp": "2025-11-11T10:40:00.000Z"
}
```

---

## Metadata Structure

Each vector stored in Qdrant contains the following payload:

```json
{
  "filename": "contract.pdf",
  "fileType": "application/pdf",
  "chunkIndex": 0,
  "totalChunks": 12,
  "text": "This is the first chunk of text extracted from the document...",
  "tags": "legal,2024,confidential",
  "uploadedAt": "2025-11-11T10:30:00.000Z"
}
```

You can filter searches based on these fields:

```bash
# Example: Query Qdrant with metadata filter
curl -X POST http://localhost:6333/collections/my-documents/points/search \
  -H "Content-Type: application/json" \
  -d '{
    "vector": [0.1, 0.2, ...],
    "limit": 5,
    "filter": {
      "must": [
        {
          "key": "tags",
          "match": {
            "value": "legal"
          }
        },
        {
          "key": "fileType",
          "match": {
            "value": "application/pdf"
          }
        }
      ]
    }
  }'
```

---

## Production Usage Tips

### 1. Environment Variables

```env
QDRANT_API_KEY=your-api-key
QDRANT_API_URL=http://localhost:6333  # or cloud URL
OPENAI_API_KEY=your-openai-key
```

### 2. Collection Naming Convention

```bash
# Good naming examples:
- legal-documents-2024
- customer-support-tickets
- product-manuals-v2
- scanned-invoices-q4

# Avoid:
- Test
- temp
- collection1
```

### 3. Bulk Upload Strategy

```bash
# For large batches, process in groups of 10 files
for i in {1..5}; do
  curl -X POST http://localhost:3007/api/v1/qdrant/upload \
    -F "collectionName=bulk-upload" \
    -F "files=@./batch_${i}_file1.pdf" \
    -F "files=@./batch_${i}_file2.pdf" \
    # ... up to 10 files
  sleep 2  # Brief pause between batches
done
```

### 4. Monitoring Processing Time

```bash
# Extract processing time for analysis
curl -X POST http://localhost:3007/api/v1/qdrant/upload \
  -F "collectionName=test" \
  -F "files=@./doc.pdf" \
  | jq '.processingTime'
```

---

## Swagger Documentation

Once the server is running, visit:

**http://localhost:3007/api**

Navigate to the **Qdrant** section to test the endpoint interactively.

---

## Module Structure

```
src/qdrant/
├── dto/
│   └── upload-to-qdrant.dto.ts      # Request validation
├── qdrant.service.ts                # Core Qdrant operations
├── qdrant-upload.service.ts         # File processing & upload logic
├── qdrant-upload.controller.ts      # Upload endpoint
├── vectorization.service.ts         # Vectorization utilities
├── qdrant.module.ts                 # Module definition
└── QDRANT_UPLOAD_README.md          # This file
```

---

## Troubleshooting

### OCR Not Working

**Issue:** Images uploaded but no text extracted

**Solution:**
- Ensure Tesseract language packs are installed: `eng.traineddata`, `deu.traineddata`
- Place them in the project root or configure Tesseract path
- Check image quality (low resolution or poor contrast affects OCR)

---

### Embedding Dimension Mismatch

**Issue:** `Vector dimension mismatch for ID ...`

**Solution:**
- Ensure `vectorDimension` matches your embedding model
- OpenAI text-embedding-3-small = 1536 dimensions
- text-embedding-ada-002 = 1536 dimensions
- If using custom embeddings, adjust accordingly

---

### Connection to Qdrant Failed

**Issue:** `Failed to ensure collection: connect ECONNREFUSED`

**Solution:**
- Verify Qdrant is running: `curl http://localhost:6333/collections`
- Check `QDRANT_API_URL` in `.env`
- For local Qdrant: `docker run -p 6333:6333 qdrant/qdrant`

---

### File Upload Timeout

**Issue:** Large files timeout during processing

**Solution:**
- Increase timeout in `main.ts`:
  ```typescript
  app.use((req, res, next) => {
    req.setTimeout(600000); // 10 minutes
    next();
  });
  ```
- Process files in smaller batches
- Consider async job queue for very large uploads

---

## Performance Benchmarks

| File Type | Size | Processing Time | Vectors Created |
|-----------|------|----------------|-----------------|
| PDF (10 pages) | 2MB | ~2-3s | 15-20 |
| DOCX (5 pages) | 500KB | ~1-2s | 8-12 |
| Image (JPG, A4) | 1.5MB | ~4-6s (OCR) | 3-5 |
| TXT | 100KB | ~0.5-1s | 10-15 |

*Benchmarks based on OpenAI text-embedding-3-small with 1536 dimensions*

---

## License

This module is part of the RAG Backend project.
