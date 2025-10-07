#!/usr/bin/env bash
set -euo pipefail

echo "[1/4] Health:" && curl -s http://localhost:8000/health | jq . || true

echo "\n[2/4] Ingest:" && curl -s -X POST http://localhost:8000/ingest | jq . || true

echo "\n[3/4] Search:" && curl -s 'http://localhost:8000/search?q=Meine%20Bestellung%20Buch&k=5' | jq . || true

echo "\n[4/4] Chat:" && curl -s -X POST http://localhost:8000/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"Welche Bestellungen habe ich 2021 gemacht?","top_k":5}' | jq . || true

echo "\nDone."

