# GitHub Secrets Checkliste für CI/CD Deployment

## 📋 Alle benötigten GitHub Repository Secrets

Gehe zu: **GitHub Repository → Settings → Secrets and variables → Actions → New repository secret**

---

## ✅ Checkliste

### **1. Bereits vorhanden (vermutlich):**

- [ ] `SSH_PRIVATE_KEY_BACKEND_B64` - SSH Private Key (Base64 encoded)
- [ ] `MONGODB_URI` - MongoDB Connection String
- [ ] `JWT_SECRET` - JWT Secret für Authentication
- [ ] `HETZNER_ACCESS_KEY` - Hetzner S3 Access Key
- [ ] `HETZNER_SECRET_KEY` - Hetzner S3 Secret Key

---

### **2. NEU hinzufügen:**

#### **OpenAI**
- [ ] `OPENAI_API_KEY` - OpenAI API Key (sk-proj-...)
- [ ] `OPENAI_MODEL` - Standard: `gpt-4o-mini` oder `gpt-4`
- [ ] `EMBEDDING_MODEL` - Standard: `text-embedding-3-small`

#### **Pinecone**
- [ ] `PINECONE_API_KEY` - Pinecone API Key (pcsk_...)
- [ ] `PINECONE_INDEX_NAME` - Index Name (z.B. `doc`)
- [ ] `PINECONE_ENVIRONMENT` - Region (z.B. `us-east-1`)

#### **Qdrant**
- [ ] `QDRANT_API_URL` - Qdrant URL (z.B. `http://localhost:6333`)
- [ ] `QDRANT_API_KEY` - Optional: Qdrant API Key (falls aktiviert)

#### **Hetzner (zusätzlich)**
- [ ] `HETZNER_BUCKET_NAME` - Bucket Name (z.B. `imagebucket`)

#### **Stripe**
- [ ] `STRIPE_SECRET_KEY` - Stripe Secret Key (sk_test_... oder sk_live_...)
- [ ] `STRIPE_PRICE_ID` - Stripe Price ID (price_...)
- [ ] `STRIPE_WEBHOOK_SECRET` - Stripe Webhook Secret (whsec_...)

#### **Replicate**
- [ ] `REPLICATE_API_TOKEN` - Replicate API Token (r8_...)

#### **Cognee (Optional)**
- [ ] `COGNEE_API_KEY` - Cognee API Key (falls verwendet)

---

## 📝 Beispiel-Werte für Secrets

### **OpenAI Secrets**

```bash
Name: OPENAI_API_KEY
Value: sk-proj-YOUR_OPENAI_API_KEY_HERE

Name: OPENAI_MODEL
Value: gpt-4o-mini

Name: EMBEDDING_MODEL
Value: text-embedding-3-small
```

### **Pinecone Secrets**

```bash
Name: PINECONE_API_KEY
Value: pcsk_YOUR_PINECONE_API_KEY_HERE

Name: PINECONE_INDEX_NAME
Value: doc

Name: PINECONE_ENVIRONMENT
Value: us-east-1
```

### **Qdrant Secrets**

#### **Option A: Ohne API Key (lokales Qdrant)**
```bash
Name: QDRANT_API_URL
Value: http://localhost:6333

Name: QDRANT_API_KEY
Value: (leer lassen oder nicht erstellen)
```

#### **Option B: Mit API Key**
```bash
Name: QDRANT_API_URL
Value: http://localhost:6333

Name: QDRANT_API_KEY
Value: 7Kx9mP3vN2Qa5Rb8Wc1Yd6Ze4Uf0Tg2Sh5Vj1Mn9Lp7=
```

### **Hetzner Secrets**

```bash
Name: HETZNER_BUCKET_NAME
Value: imagebucket
```

### **Stripe Secrets**

```bash
Name: STRIPE_SECRET_KEY
Value: sk_test_YOUR_STRIPE_SECRET_KEY_HERE

Name: STRIPE_PRICE_ID
Value: price_YOUR_STRIPE_PRICE_ID_HERE

Name: STRIPE_WEBHOOK_SECRET
Value: whsec_YOUR_STRIPE_WEBHOOK_SECRET_HERE
```

### **Replicate Secrets**

```bash
Name: REPLICATE_API_TOKEN
Value: r8_YOUR_REPLICATE_API_TOKEN_HERE
```

### **Cognee Secrets (Optional)**

```bash
Name: COGNEE_API_KEY
Value: YOUR_COGNEE_API_KEY_HERE
```

---

## 🚀 Schritt-für-Schritt Anleitung

### **1. GitHub Repository öffnen**
Gehe zu deinem Repository auf GitHub

### **2. Settings öffnen**
Klicke auf **Settings** (oben rechts)

### **3. Secrets and variables navigieren**
- Linke Sidebar → **Secrets and variables**
- Klicke auf **Actions**

### **4. Secrets hinzufügen**
Für jedes Secret:
1. Klicke **New repository secret**
2. **Name:** Eingeben (z.B. `OPENAI_API_KEY`)
3. **Value:** Secret-Wert einfügen
4. Klicke **Add secret**

### **5. Secrets verifizieren**
Nach dem Hinzufügen solltest du sehen:
```
OPENAI_API_KEY          ********    Updated X minutes ago
OPENAI_MODEL            ********    Updated X minutes ago
EMBEDDING_MODEL         ********    Updated X minutes ago
PINECONE_API_KEY        ********    Updated X minutes ago
...
```

---

## ⚠️ Wichtige Hinweise

### **1. Secrets sind verschlüsselt**
- ✅ Secrets werden verschlüsselt gespeichert
- ✅ Nicht sichtbar nach dem Speichern
- ✅ Nur in Workflows verfügbar via `${{ secrets.NAME }}`

### **2. Niemals in Logs ausgeben**
❌ **NIEMALS:**
```yaml
- name: Debug Secrets (FALSCH!)
  run: echo "API Key: ${{ secrets.OPENAI_API_KEY }}"
```

✅ **Stattdessen:**
```yaml
- name: Check Secrets (sicher)
  run: |
    if [ -z "${{ secrets.OPENAI_API_KEY }}" ]; then
      echo "ERROR: OPENAI_API_KEY not set"
      exit 1
    else
      echo "✓ OPENAI_API_KEY is set"
    fi
```

### **3. Test vs. Production Keys**
- **Test:** Nutze Stripe Test Keys (`sk_test_...`)
- **Production:** Separate GitHub Secrets für Production Branch

### **4. Secrets aktualisieren**
Falls Keys rotiert wurden:
1. Gehe zu Secrets
2. Klicke auf Secret Namen
3. **Update secret**
4. Neuen Wert eingeben
5. **Update secret** klicken

---

## 🔍 Secrets aus lokaler .env extrahieren

Schnell alle Werte aus `.env` kopieren:

```bash
# Zeige alle relevanten Secrets
grep -E "OPENAI|PINECONE|QDRANT|STRIPE|REPLICATE|COGNEE|HETZNER_BUCKET" .env

# Oder formatiert:
echo "=== OpenAI ==="
grep "OPENAI" .env

echo "=== Pinecone ==="
grep "PINECONE" .env

echo "=== Qdrant ==="
grep "QDRANT" .env

echo "=== Stripe ==="
grep "STRIPE" .env

echo "=== Replicate ==="
grep "REPLICATE" .env

echo "=== Hetzner Bucket ==="
grep "HETZNER_BUCKET" .env

echo "=== Cognee ==="
grep "COGNEE" .env
```

---

## 📊 Zusammenfassung

### **Anzahl Secrets:**
- ✅ Bereits vorhanden: 5 Secrets
- 🆕 Neu hinzufügen: 13 Secrets
- 📝 **Total:** 18 Secrets

### **Geschätzte Zeit:** 10-15 Minuten

### **Nach Hinzufügen:**
- ✅ Workflow läuft fehlerfrei
- ✅ `.env` wird korrekt generiert
- ✅ Backend startet mit allen Features

---

## ✅ Verifikation

Nach dem Hinzufügen aller Secrets:

### **1. Workflow triggern**
```bash
git add .github/workflows/deploy-backend.yml
git commit -m "Update deployment workflow with all env vars"
git push origin master
```

### **2. Workflow Logs prüfen**
- Gehe zu **Actions** Tab
- Klicke auf neuesten Workflow Run
- Prüfe "Deploy Backend via SSH" Step
- Sollte sehen: `Schreibe .env...` → Erfolg

### **3. Server prüfen**
```bash
ssh root@87.106.45.41

cd /root/RAG-SERVER/DOC_RAG_SERVER_BACKEND

# .env prüfen (Werte sind maskiert)
ls -la .env
# -rw------- 1 root root <size> .env

# PM2 Status
pm2 status
# RAG-SERVER | online

# Logs prüfen
pm2 logs RAG-SERVER --lines 50
```

---

## 🎯 Quick Copy-Paste Commands

### **Secrets aus lokaler .env extrahieren und anzeigen:**

```bash
#!/bin/bash
echo "=== GitHub Secrets aus .env ==="
echo ""

# OpenAI
echo "OPENAI_API_KEY=$(grep '^OPENAI_API_KEY=' .env | cut -d'=' -f2)"
echo "OPENAI_MODEL=$(grep '^OPENAI_MODEL=' .env | cut -d'=' -f2)"
echo "EMBEDDING_MODEL=$(grep '^EMBEDDING_MODEL=' .env | cut -d'=' -f2)"
echo ""

# Pinecone
echo "PINECONE_API_KEY=$(grep '^PINECONE_API_KEY=' .env | cut -d'=' -f2)"
echo "PINECONE_INDEX_NAME=$(grep '^PINECONE_INDEX_NAME=' .env | cut -d'=' -f2)"
echo "PINECONE_ENVIRONMENT=$(grep '^PINECONE_ENVIRONMENT=' .env | cut -d'=' -f2)"
echo ""

# Qdrant
echo "QDRANT_API_URL=$(grep '^QDRANT_API_URL=' .env | cut -d'=' -f2)"
echo "QDRANT_API_KEY=$(grep '^QDRANT_API_KEY=' .env | cut -d'=' -f2)"
echo ""

# Hetzner
echo "HETZNER_BUCKET_NAME=$(grep '^HETZNER_BUCKET_NAME=' .env | cut -d'=' -f2)"
echo ""

# Stripe
echo "STRIPE_SECRET_KEY=$(grep '^STRIPE_SECRET_KEY=' .env | cut -d'=' -f2)"
echo "STRIPE_PRICE_ID=$(grep '^STRIPE_PRICE_ID=' .env | cut -d'=' -f2)"
echo "STRIPE_WEBHOOK_SECRET=$(grep '^STRIPE_WEBHOOK_SECRET=' .env | cut -d'=' -f2)"
echo ""

# Replicate
echo "REPLICATE_API_TOKEN=$(grep '^REPLICATE_API_TOKEN=' .env | cut -d'=' -f2)"
echo ""

# Cognee
echo "COGNEE_API_KEY=$(grep '^COGNEE_API_KEY=' .env | cut -d'=' -f2)"
```

Speichere als `extract-secrets.sh`, dann:
```bash
chmod +x extract-secrets.sh
./extract-secrets.sh
```

---

## 🔐 Security Best Practices

1. ✅ **Nie Secrets in Code committen**
2. ✅ **Separate Secrets für Dev/Staging/Prod**
3. ✅ **Regelmäßige Key-Rotation (90 Tage)**
4. ✅ **Minimale Permissions für API Keys**
5. ✅ **Monitoring von Secret Usage**
6. ✅ **Secrets Review bei Onboarding neuer Devs**

---

**Fertig!** 🎉 Alle Secrets sind dokumentiert und bereit für GitHub Actions!
