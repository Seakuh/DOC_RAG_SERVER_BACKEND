# RAG Backend mit NestJS & Qdrant

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Qdrant](https://img.shields.io/badge/Qdrant-FF6B6B?style=flat&logo=qdrant&logoColor=white)](https://qdrant.tech/)
[![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=flat&logo=openai&logoColor=white)](https://openai.com/)

Ein vollständiges Retrieval-Augmented-Generation-Backend auf Basis von **NestJS**, **OpenAI-Embeddings** und einer **lokalen Qdrant-Instanz**. Dokumente (z. B. Amazon-Exporte) werden in Vektoren überführt, in Qdrant gespeichert und für semantische Suche sowie Q&A genutzt.

## ✨ Highlights

- 📄 Upload & Chunking von Amazon-Daten (CSV, JSON, TXT)
- 🔍 Semantische Suche via Qdrant (Cosine Similarity, HNSW)
- 🤖 Kontextuelle Antworten über LLM (OpenAI)
- 🌿 Cannabis-Features (Strain-Vektorisierung & Empfehlung)
- 📚 Vollständige Swagger-Dokumentation unter `/api`
- 🛡️ Guards, Validation Pipes und Throttling out-of-the-box

## 🗂️ Projektstruktur (Auszug)

```
src/
├── amazon/          # Amazon-Ingest & Query Endpoints
├── cannabis/        # Cannabis-spezifische Services
├── documents/       # Upload & Verarbeitung generischer Dokumente
├── embeddings/      # OpenAI Embeddings Wrapper
├── llm/             # LLM-Service für Antwortgenerierung
├── qdrant/          # Qdrant Service + Vectorization Utilities
├── query/           # Zentrale RAG-Logik
└── main.ts          # Bootstrap mit globalem Prefix /api/v1
```

## ✅ Voraussetzungen

- Node.js ≥ 18 und npm
- Docker & Docker Compose v2 (für die lokale Qdrant-Instanz)
- OpenAI API-Key (für Embeddings + Antworten)
- Amazon-Daten im Ordner `AMAZON_DATA/` (oder eigene Dokumente)

## ⚙️ Installation

```bash
git clone <repository-url>
cd DOC_RAG_SERVER_BACKEND
npm install
cp .env.example .env
```

Wichtige `.env`-Variablen:

```
OPENAI_API_KEY=sk-...
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION=amazon_export
QDRANT_VECTOR_SIZE=1536        # optional (abhängig vom Embedding-Modell)
EMBEDDING_MODEL=text-embedding-3-small
PORT=3000
```

## 🧱 Qdrant lokal starten

Im Projekt liegen Docker-Compose-Definitionen für Qdrant. Über die neuen npm-Skripte steuerst du den Container direkt:

```bash
npm run qdrant:start   # Startet Qdrant im Hintergrund
npm run qdrant:logs    # Zeigt die Logs
npm run qdrant:stop    # Stoppt den Container
```

Der Start-Skript bedient sich der Datei `scripts/start-qdrant.sh` und nutzt standardmäßig das Compose-Profil `with-qdrant`.

> Ausführliche Schritt-für-Schritt-Anleitung inklusive curl-Beispielen findest du in `docs/QDRANT_LOCAL.md`.

## 🚀 Backend starten

```bash
npm run start:dev
```

Die API läuft anschließend unter `http://localhost:3000` und verwendet das Präfix `/api/v1`. Relevante URLs:

- Health-Check: `http://localhost:3000/api/v1/health`
- Swagger UI: `http://localhost:3000/api`
- Amazon-Ingest: `POST http://localhost:3000/api/v1/amazon/ingest`
- Amazon-Query: `POST http://localhost:3000/api/v1/amazon/query`

## 🧪 Quickstart mit curl

```bash
# 1. API-Health prüfen
curl http://localhost:3000/api/v1/health

# 2. Qdrant-Readiness checken
curl http://localhost:6333/readyz

# 3. Amazon-Daten ingestieren (liest aus AMAZON_DATA/)
curl -X POST http://localhost:3000/api/v1/amazon/ingest

# 4. Frage stellen (kontext aus Qdrant)
curl -X POST http://localhost:3000/api/v1/amazon/query \
  -H 'Content-Type: application/json' \
  -d '{"question":"Welche Bestellungen habe ich 2023 aufgegeben?","maxResults":5,"minScore":0.55}'

# 5. Punkte zählen (direkt via Qdrant HTTP-API)
curl -X POST http://localhost:6333/collections/amazon_export/points/count \
  -H 'Content-Type: application/json' \
  -d '{"exact": false}'
```

Weitere Beispiele (Scroll, Filter, etc.) findest du ebenfalls in `docs/QDRANT_LOCAL.md`.

## 🔧 Nützliche Developer-Kommandos

```bash
npm run lint         # ESLint
npm run test         # Jest Unit Tests
npm run build        # Nest Build
```

## 🛠️ Troubleshooting

- **Qdrant nicht erreichbar:** sicherstellen, dass Docker läuft und `npm run qdrant:start` ohne Fehler durchlief. Health-Check `curl http://localhost:6333/readyz`.
- **Dimension mismatch:** Wenn du das Embedding-Modell wechselst, lösche die Collection (`curl -X DELETE http://localhost:6333/collections/amazon_export`) oder setze `QDRANT_VECTOR_SIZE` neu.
- **OpenAI-Fehler (401):** `.env` prüfen und das Backend neu starten.
- **Keine Quellen im Ergebnis:** Prüfe, ob `AMAZON_DATA/` Dateien enthält und `curl /points/count` > 0 zurückliefert.

## 📚 Weiterführende Ressourcen

- [`docs/QDRANT_LOCAL.md`](docs/QDRANT_LOCAL.md) – Lokales Setup inkl. curl-Cheatsheet
- [Qdrant HTTP API](https://qdrant.tech/documentation/) – Referenz für erweiterte Queries
- [NestJS Docs](https://docs.nestjs.com/) – Framework-Dokumentation

Happy hacking! 💻🧠

