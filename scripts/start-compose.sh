#!/usr/bin/env bash
set -euo pipefail

echo "▶️ Bringing up Qdrant + API (docker compose)"
docker compose up -d --build

echo "⏳ Waiting for API to be ready (http://localhost:8010/health)"
for i in {1..60}; do
  if curl -sf http://localhost:8010/health >/dev/null; then
    echo "✅ API is up"
    break
  fi
  sleep 1
done

echo "📥 Ingesting Amazon export"
curl -s -X POST http://localhost:8010/ingest | jq . || true

echo "💬 Sample chat"
curl -s -X POST http://localhost:8010/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"Welche Bestellungen habe ich 2021 gemacht?","top_k":5}' | jq . || true

echo "🔎 Check collection count"
curl -s 'http://localhost:8010/qdrant/count' | jq . || true

echo "🎉 Done."
