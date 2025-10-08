# Lokales Qdrant-Setup

Diese Anleitung zeigt, wie du die lokale Qdrant-Instanz startest, prüfst und mit der NestJS-API verbindest. Alle Befehle sind so gehalten, dass du sie direkt in ein Terminal kopieren kannst.

## Voraussetzungen

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) oder Docker Engine + Docker Compose v2
- Node.js (>= 18) und npm
- Ein OpenAI API-Key in deiner `.env`

## 1. Umgebung vorbereiten

```bash
cp .env.example .env          # falls noch nicht geschehen
npm install                   # Projektabhängigkeiten installieren
```

Passe in der `.env` mindestens folgende Werte an:

```
OPENAI_API_KEY=sk-...
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION=amazon_export
```

Optional kannst du `QDRANT_VECTOR_SIZE` setzen, falls du die Dimensionen der Embeddings schon kennst (z. B. `384` oder `1536`).

## 2. Qdrant lokal starten

```bash
npm run qdrant:start
```

Der Befehl ruft `docker compose --profile with-qdrant up -d qdrant` auf. Die Container-Logs erhältst du mit:

```bash
npm run qdrant:logs
```

Stoppen kannst du Qdrant per:

```bash
npm run qdrant:stop
```

## 3. Qdrant-Status mit curl prüfen

```bash
# Bereitschaft prüfen
curl http://localhost:6333/readyz

# Collections auflisten (sollte nach dem ersten Ingest erscheinen)
curl http://localhost:6333/collections

# Details zur Standard-Collection anzeigen
curl http://localhost:6333/collections/amazon_export

# Anzahl der Vektoren zählen (exact=false nutzt den schnelleren aggregierten Zähler)
curl -X POST http://localhost:6333/collections/amazon_export/points/count \
  -H 'Content-Type: application/json' \
  -d '{"exact": false}'
```

## 4. NestJS-Backend starten

```bash
npm run start:dev
```

Standardmäßig lauscht die API auf `http://localhost:3000`. Die wichtigsten Endpunkte hängen unter `/api/v1`.

## 5. Daten ingestieren und abfragen

```bash
# Amazon-Daten in Qdrant schreiben
curl -X POST http://localhost:3000/api/v1/amazon/ingest

# Frage gegen Amazon-Korpus stellen
curl -X POST http://localhost:3000/api/v1/amazon/query \
  -H 'Content-Type: application/json' \
  -d '{"question":"Welche Bestellungen habe ich 2023 gemacht?","maxResults":5}'
```

Die Antwort enthält sowohl den generierten Text als auch die genutzten Quellen. Du kannst das Ergebnis anschließend direkt in Qdrant nachvollziehen:

```bash
# Beispiel: alle Punkte mit Quelle "amazon" zeigen
curl -X POST http://localhost:6333/collections/amazon_export/points/scroll \
  -H 'Content-Type: application/json' \
  -d '{
    "filter": { "must": [{ "key": "source", "match": { "value": "amazon" } }] },
    "limit": 5,
    "with_payload": true,
    "with_vector": false
  }'
```

## 6. Aufräumen

```bash
# Qdrant stoppen
npm run qdrant:stop

# Optional: Volumen löschen (entfernt alle lokal gespeicherten Vektoren)
docker volume rm doc_rag_server_backend_qdrant_storage
```

Damit hast du ein vollständiges lokales Setup, inklusive Diagnosen per curl, um Datenflüsse nachvollziehen zu können.

