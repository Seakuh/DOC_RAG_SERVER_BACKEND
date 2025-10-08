#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker wird benötigt, um Qdrant zu starten. Bitte installiere Docker und versuche es erneut."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose v2 wird benötigt. Aktualisiere Docker oder installiere Docker Compose v2."
  exit 1
fi

cd "${PROJECT_ROOT}"

PROFILE="${QDRANT_COMPOSE_PROFILE:-with-qdrant}"
SERVICE="${QDRANT_COMPOSE_SERVICE:-qdrant}"

echo "Starte Qdrant-Service '${SERVICE}' mit Docker-Compose-Profil '${PROFILE}'..."
docker compose --profile "${PROFILE}" up -d "${SERVICE}"

echo
docker compose ps "${SERVICE}"
