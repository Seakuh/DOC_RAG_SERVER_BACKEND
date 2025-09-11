# RAG Backend with NestJS and Pinecone

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Pinecone](https://img.shields.io/badge/Pinecone-000000?style=flat&logo=pinecone&logoColor=white)](https://www.pinecone.io/)
[![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=flat&logo=openai&logoColor=white)](https://openai.com/)

Ein vollständiges **RAG (Retrieval-Augmented Generation)** Backend-System basierend auf **NestJS** mit **Pinecone** Vector Database und **OpenAI** Integration.

## 🚀 Features

- **📄 Document Upload & Processing**: Unterstützung für PDF, TXT, DOCX und Bilddateien (JPG, PNG, GIF, BMP, TIFF, WEBP) mit OCR
- **🔍 Semantic Search**: Vektor-basierte Dokumentensuche mit Pinecone
- **🤖 AI Question Answering**: Kontextuelle Antworten mit OpenAI GPT Modellen
- **🌿 Cannabis Strain Recommendations**: AI-powered mood-basierte Cannabis-Empfehlungen mit Knowledge Graph-ähnlicher Funktionalität
- **📊 Swagger API Documentation**: Vollständige API-Dokumentation
- **⚡ Rate Limiting**: Schutz vor API-Missbrauch
- **🔒 Input Validation**: Robuste Datenvalidierung mit class-validator
- **📈 Performance Monitoring**: Logging und Metriken für alle Requests
- **🛡️ Error Handling**: Graceful Behandlung aller API-Fehler

## 📁 Projektstruktur

```
rag-backend/
├── src/
│   ├── app.module.ts          # Haupt-Anwendungsmodul
│   ├── main.ts               # Anwendungs-Einstiegspunkt
│   ├── documents/            # Document Management
│   │   ├── documents.module.ts
│   │   ├── documents.controller.ts
│   │   ├── documents.service.ts
│   │   └── dto/             # Data Transfer Objects
│   ├── embeddings/          # Text Embeddings Service
│   │   ├── embeddings.module.ts
│   │   └── embeddings.service.ts
│   ├── pinecone/           # Pinecone Vector Database
│   │   ├── pinecone.module.ts
│   │   └── pinecone.service.ts
│   ├── llm/               # Large Language Model
│   │   ├── llm.module.ts
│   │   └── llm.service.ts
│   ├── query/             # Query & RAG Functionality
│   │   ├── query.module.ts
│   │   ├── query.controller.ts
│   │   ├── query.service.ts
│   │   └── dto/
│   └── cannabis/          # Cannabis Strain Recommendations 🌿
│       ├── cannabis.module.ts
│       ├── cannabis.controller.ts
│       ├── cannabis.service.ts
│       └── dto/           # Cannabis-specific DTOs
├── package.json
├── .env.example
└── README.md
```

## 🛠️ Installation & Setup

### 1. Projekt klonen und Dependencies installieren

```bash
git clone <repository-url>
cd rag-backend
npm install
```

### 2. Environment Variables konfigurieren

Kopiere `.env.example` zu `.env` und fülle die erforderlichen Werte aus:

```bash
cp .env.example .env
```

```env
# Server Configuration
PORT=3000

# Pinecone Configuration
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=rag-documents

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4
EMBEDDING_MODEL=text-embedding-ada-002
```

### 3. Pinecone Index erstellen

1. Gehe zu [Pinecone Console](https://app.pinecone.io/)
2. Erstelle einen neuen Index mit folgenden Einstellungen:
   - **Name**: `rag-documents` (oder wie in `.env` konfiguriert)
   - **Dimensions**: `1536` (für text-embedding-ada-002)
   - **Metric**: `cosine`
   - **Pod Type**: `starter` (für kostenlose Version)

### 4. OpenAI API Key erhalten

1. Gehe zu [OpenAI Platform](https://platform.openai.com/api-keys)
2. Erstelle einen neuen API Key
3. Füge ihn in deine `.env` Datei ein

### 5. Anwendung starten

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

Die API läuft unter: `http://localhost:3000`
Swagger Dokumentation: `http://localhost:3000/api`

## 📚 API Endpoints

### Health Check
- `GET /api/v1` - API Status
- `GET /api/v1/version` - Version Information
- `GET /api/v1/query/health` - Service Health Check

### Document Management
- `POST /api/v1/documents/upload` - Dokument hochladen
- `GET /api/v1/documents` - Alle Dokumente auflisten
- `GET /api/v1/documents/stats` - Storage Statistiken
- `GET /api/v1/documents/:id` - Spezifisches Dokument
- `PUT /api/v1/documents/:id` - Dokument aktualisieren
- `DELETE /api/v1/documents/:id` - Dokument löschen

### Query & Search
- `POST /api/v1/query` - Frage stellen (mit AI Antwort)
- `POST /api/v1/query/similar` - Ähnliche Dokumente finden
- `GET /api/v1/query/explain` - Query-Prozess erklären
- `GET /api/v1/query/stats` - Query Statistiken

### Cannabis Strain Management & Recommendations 🌿
- `POST /api/v1/cannabis/strains` - Cannabis Strain hinzufügen
- `POST /api/v1/cannabis/recommendations` - Mood-basierte Strain-Empfehlungen
- `GET /api/v1/cannabis/strains` - Alle Strains auflisten
- `DELETE /api/v1/cannabis/strains/:id` - Strain löschen
- `GET /api/v1/cannabis/health` - Cannabis Service Health Check
- `GET /api/v1/cannabis/stats` - Cannabis Knowledge Base Statistiken

## 🔧 Usage Examples

### Dokument hochladen

```bash
curl -X POST "http://localhost:3000/api/v1/documents/upload" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@document.pdf" \
  -F "name=My Document" \
  -F "description=Important project document" \
  -F "tags=project,documentation"

# Oder für Bildupload mit OCR
curl -X POST "http://localhost:3000/api/v1/documents/upload" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@screenshot.png" \
  -F "name=Screenshot Analysis" \
  -F "description=OCR text extraction from image" \
  -F "tags=image,ocr,analysis"
```

### Frage stellen

```bash
curl -X POST "http://localhost:3000/api/v1/query" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Was sind die Hauptthemen in den Dokumenten?",
    "maxResults": 5,
    "minScore": 0.7
  }'
```

### Ähnliche Dokumente finden

```bash
curl -X POST "http://localhost:3000/api/v1/query/similar" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "machine learning algorithms",
    "limit": 10,
    "minScore": 0.6
  }'
```

### Cannabis Strain hinzufügen 🌿

```bash
curl -X POST "http://localhost:3000/api/v1/cannabis/strains" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Blue Dream",
    "type": "hybrid",
    "description": "A balanced hybrid strain known for its sweet berry aroma and relaxing effects",
    "thc": 18.5,
    "cbd": 0.1,
    "effects": ["happy", "relaxed", "euphoric", "creative"],
    "flavors": ["berry", "sweet", "vanilla"],
    "medical": ["stress", "depression", "pain"],
    "terpenes": [
      {"name": "Myrcene", "percentage": 0.8},
      {"name": "Limonene", "percentage": 0.6}
    ],
    "genetics": "Blueberry x Haze",
    "breeder": "DJ Short",
    "rating": 4.2
  }'
```

### Mood-basierte Strain-Empfehlungen

```bash
curl -X POST "http://localhost:3000/api/v1/cannabis/recommendations" \
  -H "Content-Type: application/json" \
  -d '{
    "moodDescription": "I feel stressed after a long day at work and want to relax while watching Netflix",
    "timeOfDay": "evening",
    "activityContext": "relaxation",
    "targetSymptoms": ["stress", "anxiety"],
    "stressLevel": 8,
    "energyLevel": 3,
    "maxResults": 5,
    "minScore": 0.7
  }'
```

### Alle Cannabis Strains auflisten

```bash
curl -X GET "http://localhost:3000/api/v1/cannabis/strains" \
  -H "Content-Type: application/json"
```

### Cannabis Service Health Check

```bash
curl -X GET "http://localhost:3000/api/v1/cannabis/health" \
  -H "Content-Type: application/json"
```

### Cannabis Strain löschen

```bash
curl -X DELETE "http://localhost:3000/api/v1/cannabis/strains/strain-uuid-123" \
  -H "Content-Type: application/json"
```

### Cannabis Knowledge Base Statistiken

```bash
curl -X GET "http://localhost:3000/api/v1/cannabis/stats" \
  -H "Content-Type: application/json"
```

---

## 🧠 Cognee Knowledge Graph API

Das Cognee-Modul bietet erweiterte Knowledge-Graph-Funktionalitäten zur semantischen Datenverarbeitung und -analyse.

### Textdaten zu Cognee hochladen

```bash
curl -X POST "http://localhost:3000/api/v1/cognee/upload/data" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Cannabis ist eine vielseitige Pflanze mit verschiedenen medizinischen Anwendungen. THC und CBD sind die wichtigsten Cannabinoide.",
    "dataType": "text",
    "title": "Cannabis Grundlagen",
    "processingMode": "full",
    "metadata": {
      "source": "research_document",
      "tags": ["cannabis", "medizin", "forschung"],
      "author": "Dr. Cannabis",
      "createdAt": "2025-09-11"
    },
    "createRelationships": true,
    "extractEntities": true
  }'
```

### Textdatei zu Cognee hochladen

```bash
curl -X POST "http://localhost:3000/api/v1/cognee/upload/file" \
  -F "file=@cannabis_research.txt" \
  -F "author=Prof. Dr. Cannabis Forscher" \
  -F "tags=medizin,cannabis,forschung,wissenschaft"
```

### Cognee Knowledge Graph abfragen

```bash
curl -X POST "http://localhost:3000/api/v1/cognee/query" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Finde alle Informationen über THC und CBD Wirkmechanismen",
    "limit": 10
  }'
```

### Entitäten im Knowledge Graph suchen

```bash
curl -X GET "http://localhost:3000/api/v1/cognee/search?term=cannabis&type=Substance&limit=20" \
  -H "Content-Type: application/json"
```

### Cognee Service Health Check

```bash
curl -X GET "http://localhost:3000/api/v1/cognee/health" \
  -H "Content-Type: application/json"
```

### Cognee Knowledge Graph Statistiken

```bash
curl -X GET "http://localhost:3000/api/v1/cognee/stats" \
  -H "Content-Type: application/json"
```

### Unterstützte Dateiformate für Upload:

- **Text-Dateien:** `.txt`, `.csv`, `.json`, `.md`, `.rtf`
- **Maximale Dateigröße:** 10MB
- **Verarbeitung:** Automatische Entitäts-Extraktion und Relationship-Mapping

---

## 🧪 Testing

```bash
# Unit Tests
npm run test

# E2E Tests
npm run test:e2e

# Test Coverage
npm run test:cov
```

## 📝 Development

### Code Formatting & Linting

```bash
# Format code
npm run format

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### Debugging

```bash
# Start in debug mode
npm run start:debug
```

Debug-Port: `9229`

## 🏗️ Architecture

### Text Processing Pipeline

1. **File Upload**: PDF/TXT/DOCX/Bilddateien werden akzeptiert
2. **Text Extraction**: 
   - PDF: Direkter Text-Export mit pdf-parse
   - DOCX: Text-Extraktion mit mammoth
   - Bilder: OCR mit Tesseract.js (Deutsch + Englisch)
   - Bildvorverarbeitung mit Sharp für bessere OCR-Ergebnisse
3. **Text Chunking**: Dokumente werden in überlappende Chunks aufgeteilt (700 Zeichen, 100 Zeichen Überlappung)
4. **Embeddings Generation**: Jeder Chunk wird mit OpenAI's text-embedding-ada-002 in Vektoren umgewandelt
5. **Vector Storage**: Vektoren werden in Pinecone gespeichert mit Metadaten

### Query Processing Pipeline

1. **Question Embedding**: Frage wird in Vektor umgewandelt
2. **Similarity Search**: Pinecone findet ähnlichste Dokument-Chunks
3. **Context Filtering**: Chunks werden nach Relevanz-Score gefiltert
4. **Response Generation**: OpenAI GPT generiert Antwort basierend auf Kontext
5. **Response Enrichment**: Antwort wird mit Quellen und Confidence-Score angereichert

## 🔒 Security Considerations

- **Rate Limiting**: Automatischer Schutz vor API-Missbrauch
- **Input Validation**: Alle Eingaben werden validiert
- **File Upload Restrictions**: Nur erlaubte Dateitypen und Größenbeschränkungen
- **Environment Variables**: Sensible Daten in .env Dateien
- **CORS**: Konfigurierbare Cross-Origin Requests

## 📊 Monitoring & Logging

Das System bietet umfassendes Logging für:
- API Request/Response Zeiten
- Token Usage Tracking
- Embedding Generation Performance
- Pinecone Query Performance
- Error Rates und Types

## 🚀 Production Deployment

### Docker Deployment

```bash
# Build Docker Image
docker build -t rag-backend .

# Run Container
docker run -p 3000:3000 --env-file .env rag-backend
```

### Environment Variables für Production

```env
NODE_ENV=production
PORT=3000

# Security
THROTTLE_SHORT_LIMIT=5
THROTTLE_MEDIUM_LIMIT=50
THROTTLE_LONG_LIMIT=500

# Logging
LOG_LEVEL=info
```

## 📈 Performance Optimization

- **Batch Processing**: Embeddings werden in Batches verarbeitet
- **Connection Pooling**: Effiziente Pinecone Verbindungen
- **Caching**: Response Caching für häufige Queries
- **Chunking Strategy**: Optimierte Chunk-Größen für bessere Retrieval

## 🔍 Troubleshooting

### Häufige Probleme

1. **Pinecone Connection Failed**
   - Überprüfe API Key und Index Name
   - Stelle sicher, dass Index mit 1536 Dimensionen erstellt wurde

2. **OpenAI API Errors**
   - Überprüfe API Key Gültigkeit
   - Überprüfe Account Credits/Limits

3. **File Upload Issues**
   - Überprüfe Dateigröße (max 10MB)
   - Unterstützte Formate: PDF, TXT, DOCX, JPG, PNG, GIF, BMP, TIFF, WEBP

4. **OCR Processing Issues**
   - OCR kann bei schlechter Bildqualität fehlschlagen
   - Für bessere Ergebnisse: Hoher Kontrast, klare Schrift verwenden
   - Tesseract unterstützt Deutsch und Englisch

5. **Memory Issues**
   - Reduziere Batch-Größen für Embeddings
   - Überwache Heap Usage bei großen Dokumenten

## 🤝 Contributing

1. Fork das Repository
2. Erstelle einen Feature Branch (`git checkout -b feature/amazing-feature`)
3. Commite deine Changes (`git commit -m 'Add amazing feature'`)
4. Push zum Branch (`git push origin feature/amazing-feature`)
5. Öffne eine Pull Request

## 📄 License

Dieses Projekt steht unter der [MIT License](LICENSE).

## 🙋‍♂️ Support

Bei Fragen oder Problemen:
- Erstelle ein [Issue](https://github.com/your-repo/issues)
- Kontaktiere: your-email@example.com

---

**Erstellt mit ❤️ using NestJS, Pinecone, and OpenAI**