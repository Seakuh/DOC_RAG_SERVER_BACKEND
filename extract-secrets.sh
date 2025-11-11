#!/bin/bash

# GitHub Secrets Extractor für CI/CD
# Extrahiert alle benötigten Secrets aus .env Datei

echo "================================================"
echo "GitHub Secrets aus .env extrahieren"
echo "================================================"
echo ""

if [ ! -f .env ]; then
    echo "❌ ERROR: .env Datei nicht gefunden!"
    exit 1
fi

echo "✅ .env gefunden, extrahiere Secrets..."
echo ""

# OpenAI
echo "=== OpenAI Secrets ==="
OPENAI_API_KEY=$(grep '^OPENAI_API_KEY=' .env | cut -d'=' -f2)
OPENAI_MODEL=$(grep '^OPENAI_MODEL=' .env | cut -d'=' -f2)
EMBEDDING_MODEL=$(grep '^EMBEDDING_MODEL=' .env | cut -d'=' -f2)

echo "Name: OPENAI_API_KEY"
echo "Value: $OPENAI_API_KEY"
echo ""
echo "Name: OPENAI_MODEL"
echo "Value: $OPENAI_MODEL"
echo ""
echo "Name: EMBEDDING_MODEL"
echo "Value: $EMBEDDING_MODEL"
echo ""

# Pinecone
echo "=== Pinecone Secrets ==="
PINECONE_API_KEY=$(grep '^PINECONE_API_KEY=' .env | cut -d'=' -f2)
PINECONE_INDEX_NAME=$(grep '^PINECONE_INDEX_NAME=' .env | cut -d'=' -f2)
PINECONE_ENVIRONMENT=$(grep '^PINECONE_ENVIRONMENT=' .env | cut -d'=' -f2)

echo "Name: PINECONE_API_KEY"
echo "Value: $PINECONE_API_KEY"
echo ""
echo "Name: PINECONE_INDEX_NAME"
echo "Value: $PINECONE_INDEX_NAME"
echo ""
echo "Name: PINECONE_ENVIRONMENT"
echo "Value: $PINECONE_ENVIRONMENT"
echo ""

# Qdrant
echo "=== Qdrant Secrets ==="
QDRANT_API_URL=$(grep '^QDRANT_API_URL=' .env | cut -d'=' -f2)
QDRANT_API_KEY=$(grep '^QDRANT_API_KEY=' .env | grep -v '^#' | cut -d'=' -f2)

echo "Name: QDRANT_API_URL"
echo "Value: $QDRANT_API_URL"
echo ""
echo "Name: QDRANT_API_KEY"
if [ -z "$QDRANT_API_KEY" ]; then
    echo "Value: (leer - kein API Key benötigt)"
else
    echo "Value: $QDRANT_API_KEY"
fi
echo ""

# Hetzner
echo "=== Hetzner Secrets ==="
HETZNER_ACCESS_KEY=$(grep '^HETZNER_ACCESS_KEY=' .env | cut -d'=' -f2)
HETZNER_SECRET_KEY=$(grep '^HETZNER_SECRET_KEY=' .env | cut -d'=' -f2)
HETZNER_BUCKET_NAME=$(grep '^HETZNER_BUCKET_NAME=' .env | cut -d'=' -f2)

echo "Name: HETZNER_ACCESS_KEY"
echo "Value: $HETZNER_ACCESS_KEY"
echo ""
echo "Name: HETZNER_SECRET_KEY"
echo "Value: $HETZNER_SECRET_KEY"
echo ""
echo "Name: HETZNER_BUCKET_NAME"
echo "Value: $HETZNER_BUCKET_NAME"
echo ""

# Stripe
echo "=== Stripe Secrets ==="
STRIPE_SECRET_KEY=$(grep '^STRIPE_SECRET_KEY=' .env | cut -d'=' -f2)
STRIPE_PRICE_ID=$(grep '^STRIPE_PRICE_ID=' .env | cut -d'=' -f2)
STRIPE_WEBHOOK_SECRET=$(grep '^STRIPE_WEBHOOK_SECRET=' .env | cut -d'=' -f2)

echo "Name: STRIPE_SECRET_KEY"
echo "Value: $STRIPE_SECRET_KEY"
echo ""
echo "Name: STRIPE_PRICE_ID"
echo "Value: $STRIPE_PRICE_ID"
echo ""
echo "Name: STRIPE_WEBHOOK_SECRET"
echo "Value: $STRIPE_WEBHOOK_SECRET"
echo ""

# Replicate
echo "=== Replicate Secrets ==="
REPLICATE_API_TOKEN=$(grep '^REPLICATE_API_TOKEN=' .env | cut -d'=' -f2)

echo "Name: REPLICATE_API_TOKEN"
echo "Value: $REPLICATE_API_TOKEN"
echo ""

# Cognee (optional)
echo "=== Cognee Secrets (Optional) ==="
COGNEE_API_KEY=$(grep '^COGNEE_API_KEY=' .env | cut -d'=' -f2)

echo "Name: COGNEE_API_KEY"
if [ -z "$COGNEE_API_KEY" ]; then
    echo "Value: (nicht gesetzt - optional)"
else
    echo "Value: $COGNEE_API_KEY"
fi
echo ""

# MongoDB & JWT (bereits vorhanden)
echo "=== Bereits vorhandene Secrets (prüfen!) ==="
MONGODB_URI=$(grep '^MONGODB_URI=' .env | cut -d'=' -f2)
JWT_SECRET=$(grep '^JWT_SECRET=' .env | cut -d'=' -f2)

echo "Name: MONGODB_URI"
echo "Value: $MONGODB_URI"
echo ""
echo "Name: JWT_SECRET"
if [ -z "$JWT_SECRET" ]; then
    echo "Value: (nicht gesetzt in .env)"
else
    echo "Value: $JWT_SECRET"
fi
echo ""

echo "================================================"
echo "✅ Secrets-Extraktion abgeschlossen!"
echo "================================================"
echo ""
echo "📝 Nächste Schritte:"
echo "1. Gehe zu GitHub Repository → Settings → Secrets and variables → Actions"
echo "2. Klicke 'New repository secret' für jedes Secret"
echo "3. Kopiere Name und Value von oben"
echo "4. Speichere jeden Secret"
echo ""
echo "📊 Anzahl Secrets: 18"
echo "⏱️  Geschätzte Zeit: 10-15 Minuten"
echo ""
