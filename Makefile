.PHONY: up down logs ingest chat search health build

up:
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f --tail=200

health:
	curl -sf http://localhost:8010/health | jq . || true

ingest:
	curl -X POST http://localhost:8010/ingest | jq . || true

	curl -X POST http://localhost:8010/chat \
	  -H 'Content-Type: application/json' \
	  -d '{"message":"Welche Bestellungen habe ich 2021 gemacht?","top_k":5}' | jq . || true

search:
	curl 'http://localhost:8010/search?q=Meine%20Bestellung%20Buch&k=5' | jq . || true

build:
	docker compose build
