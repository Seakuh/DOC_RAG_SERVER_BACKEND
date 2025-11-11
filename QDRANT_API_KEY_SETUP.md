# Qdrant API Key Setup Guide

## 🔑 Qdrant API Key Konfiguration

Es gibt **zwei Szenarien** für Qdrant API Keys:

---

## Szenario 1: Lokales Qdrant **OHNE** API Key (Empfohlen für Entwicklung)

### ✅ **Standard Docker Setup - Kein API Key nötig**

Wenn du Qdrant mit Docker startest **ohne** zusätzliche Konfiguration, ist **keine Authentication** aktiviert:

```bash
docker run -d --name qdrant -p 6333:6333 qdrant/qdrant
```

**In diesem Fall:**
- ❌ **KEIN** API Key erforderlich
- ✅ Qdrant ist offen zugänglich auf localhost:6333
- ✅ Perfekt für lokale Entwicklung
- ⚠️ **NICHT für Production** (unsicher wenn Port öffentlich ist)

**.env Konfiguration:**
```env
QDRANT_API_URL=http://localhost:6333
# QDRANT_API_KEY nicht setzen oder auskommentieren
```

---

## Szenario 2: Qdrant **MIT** API Key (Production-ready)

### 📋 **Variante A: API Key bei Qdrant-Start generieren**

#### **Option 1: Docker mit Custom Config**

**1. Qdrant Config erstellen:**
```yaml
# qdrant-config.yaml
service:
  api_key: "mein-sicherer-api-key-hier"  # Dein gewählter Key

storage:
  storage_path: /qdrant/storage
```

**2. Docker mit Config starten:**
```bash
docker run -d \
  --name qdrant \
  -p 6333:6333 \
  -v $(pwd)/qdrant-config.yaml:/qdrant/config/config.yaml \
  -v $(pwd)/qdrant_storage:/qdrant/storage \
  qdrant/qdrant
```

**3. .env anpassen:**
```env
QDRANT_API_URL=http://localhost:6333
QDRANT_API_KEY=mein-sicherer-api-key-hier
```

---

#### **Option 2: Docker mit Environment Variable**

```bash
docker run -d \
  --name qdrant \
  -p 6333:6333 \
  -e QDRANT__SERVICE__API_KEY="mein-sicherer-api-key" \
  -v $(pwd)/qdrant_storage:/qdrant/storage \
  qdrant/qdrant
```

**.env:**
```env
QDRANT_API_URL=http://localhost:6333
QDRANT_API_KEY=mein-sicherer-api-key
```

---

#### **Option 3: Random API Key generieren**

**Sicheren Random Key generieren:**
```bash
# Linux/Mac
openssl rand -base64 32

# Ausgabe z.B.:
# 7Kx9mP3vN2Qa5Rb8Wc1Yd6Ze4Uf0Tg2Sh5Vj1Mn9Lp7=

# Oder mit Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Docker starten mit generiertem Key:**
```bash
API_KEY=$(openssl rand -base64 32)
echo "Generated API Key: $API_KEY"

docker run -d \
  --name qdrant \
  -p 6333:6333 \
  -e QDRANT__SERVICE__API_KEY="$API_KEY" \
  -v $(pwd)/qdrant_storage:/qdrant/storage \
  qdrant/qdrant

echo "QDRANT_API_KEY=$API_KEY" >> .env
```

---

### 📋 **Variante B: Qdrant Cloud API Key**

Falls du **Qdrant Cloud** verwendest:

**1. Gehe zu:** https://cloud.qdrant.io/
**2. Login/Signup**
**3. Erstelle Cluster:**
   - Region wählen (z.B. eu-central-1)
   - Cluster Name vergeben

**4. API Key generieren:**
   - Gehe zu: "Cluster Settings" → "API Keys"
   - Klicke "Create API Key"
   - Key kopieren (wird nur einmal angezeigt!)

**5. .env konfigurieren:**
```env
QDRANT_API_URL=https://your-cluster-id.eu-central-1.aws.cloud.qdrant.io
QDRANT_API_KEY=your-generated-api-key-here
```

---

## 🔐 API Key testen

### **Test 1: Ohne API Key (sollte fehlschlagen)**
```bash
curl http://localhost:6333/collections
```

**Mit API Key geschützt:**
```json
{
  "status": {
    "error": "Unauthorized"
  }
}
```

### **Test 2: Mit API Key (sollte funktionieren)**
```bash
curl -H "api-key: mein-sicherer-api-key" \
  http://localhost:6333/collections
```

**Erfolg:**
```json
{
  "result": {
    "collections": []
  }
}
```

---

## 🚀 GitHub Actions Workflow Integration

### **Ja, du MUSST den Workflow anpassen!**

Die aktuelle `.github/workflows/deploy-backend.yml` schreibt die `.env` Datei mit **fehlenden Umgebungsvariablen**.

### **Aktueller Workflow (Zeile 54-61):**
```yaml
echo "Schreibe .env..."
cat > .env <<EOF
PORT=4001
MONGODB_URI=${{ secrets.MONGODB_URI }}
JWT_SECRET=${{ secrets.JWT_SECRET }}
HETZNER_ACCESS_KEY=${{ secrets.HETZNER_ACCESS_KEY }}
HETZNER_SECRET_KEY=${{ secrets.HETZNER_SECRET_KEY }}
EOF
```

### ⚠️ **Problem:**
- Fehlende `OPENAI_API_KEY`
- Fehlende `PINECONE_*` Variablen
- Fehlende `QDRANT_*` Variablen
- Fehlende `STRIPE_*` Variablen
- Fehlende `REPLICATE_API_TOKEN`

---

## ✅ **Angepasster Workflow**

### **Schritt 1: GitHub Secrets hinzufügen**

Gehe zu: **GitHub Repository → Settings → Secrets and variables → Actions → New repository secret**

Füge folgende Secrets hinzu:

```
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o-mini
EMBEDDING_MODEL=text-embedding-3-small

PINECONE_API_KEY=pcsk_...
PINECONE_INDEX_NAME=doc
PINECONE_ENVIRONMENT=us-east-1

QDRANT_API_URL=http://localhost:6333
QDRANT_API_KEY=<optional-wenn-authentication-enabled>

STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...

REPLICATE_API_TOKEN=r8_...
COGNEE_API_KEY=<optional>

MONGODB_URI=<bereits vorhanden>
JWT_SECRET=<bereits vorhanden>
HETZNER_ACCESS_KEY=<bereits vorhanden>
HETZNER_SECRET_KEY=<bereits vorhanden>
HETZNER_BUCKET_NAME=imagebucket
```

### **Schritt 2: Workflow-Datei aktualisieren**

Ich erstelle dir gleich die angepasste Version!

---

## 🔍 Zusammenfassung

### **Für lokale Entwicklung (Empfohlung):**
```bash
# Qdrant OHNE API Key
docker run -d --name qdrant -p 6333:6333 qdrant/qdrant

# .env
QDRANT_API_URL=http://localhost:6333
# QDRANT_API_KEY auskommentiert
```

### **Für Production (Empfohlung):**
```bash
# API Key generieren
API_KEY=$(openssl rand -base64 32)

# Qdrant MIT API Key
docker run -d \
  --name qdrant \
  -p 6333:6333 \
  -e QDRANT__SERVICE__API_KEY="$API_KEY" \
  -v /var/lib/qdrant:/qdrant/storage \
  --restart unless-stopped \
  qdrant/qdrant

# .env
QDRANT_API_URL=http://localhost:6333
QDRANT_API_KEY=$API_KEY
```

### **GitHub Actions:**
- ✅ Ja, Workflow muss aktualisiert werden
- ✅ Alle API Keys als GitHub Secrets hinzufügen
- ✅ .env Generierung im Workflow erweitern

---

## 📚 Nächste Schritte

1. **Entscheide:** Mit oder ohne API Key?
2. **Falls mit API Key:** Key generieren (siehe oben)
3. **GitHub Secrets:** Alle fehlenden Secrets hinzufügen
4. **Workflow anpassen:** Siehe angepasste Version (folgt gleich)

---

## 🔒 Security Best Practices

### ✅ **DO:**
- ✅ Verwende starke, zufällige API Keys (min. 32 Zeichen)
- ✅ Rotiere API Keys regelmäßig (alle 90 Tage)
- ✅ Verwende unterschiedliche Keys für Dev/Staging/Prod
- ✅ Speichere Keys in GitHub Secrets, nie im Code
- ✅ Aktiviere API Key Authentication in Production

### ❌ **DON'T:**
- ❌ Verwende keine einfachen Keys wie "password123"
- ❌ Committe nie API Keys ins Git Repository
- ❌ Teile API Keys nicht in Chat/Email
- ❌ Verwende in Production keine ungeschützten Endpoints
- ❌ Lasse Qdrant ohne Firewall offen im Internet

---

## 🆘 Troubleshooting

### **Problem: 401 Unauthorized**
```bash
curl http://localhost:6333/collections
# Response: {"status":{"error":"Unauthorized"}}
```

**Lösung:**
```bash
# API Key im Header mitgeben
curl -H "api-key: dein-api-key" http://localhost:6333/collections
```

**Oder in .env setzen:**
```env
QDRANT_API_KEY=dein-api-key
```

---

### **Problem: Backend startet nicht - "QDRANT_API_URL must be configured"**

**Lösung:**
```bash
# Prüfe .env Datei
grep QDRANT .env

# Sollte enthalten:
QDRANT_API_URL=http://localhost:6333
```

---

### **Problem: "fetch failed" beim Qdrant-Connect**

**Mögliche Ursachen:**
1. Qdrant läuft nicht
2. Falsche URL/Port
3. Firewall blockiert

**Lösung:**
```bash
# Prüfe ob Qdrant läuft
docker ps | grep qdrant
curl http://localhost:6333

# Falls nicht, starte Qdrant
docker start qdrant
# oder
docker run -d --name qdrant -p 6333:6333 qdrant/qdrant
```

---

## ✅ Quick Commands

```bash
# API Key generieren
openssl rand -base64 32

# Qdrant mit API Key starten
docker run -d --name qdrant -p 6333:6333 \
  -e QDRANT__SERVICE__API_KEY="$(openssl rand -base64 32)" \
  qdrant/qdrant

# API Key aus Docker Container auslesen
docker inspect qdrant | grep QDRANT__SERVICE__API_KEY

# Test mit API Key
curl -H "api-key: YOUR_KEY" http://localhost:6333/collections
```
