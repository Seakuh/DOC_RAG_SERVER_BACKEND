# 🔑 Qdrant API Key Setup - Zusammenfassung

## ⚡ Quick Answer

### **Brauchst du einen API Key?**

#### **Lokales Qdrant (Development):** ❌ **NEIN**
```bash
docker run -d --name qdrant -p 6333:6333 qdrant/qdrant
```

**Keine weiteren Schritte nötig!** Qdrant läuft ohne Authentication.

---

#### **Production Qdrant:** ✅ **JA** (Empfohlen)
```bash
# API Key generieren
API_KEY=$(openssl rand -base64 32)

# Qdrant mit API Key starten
docker run -d --name qdrant -p 6333:6333 \
  -e QDRANT__SERVICE__API_KEY="$API_KEY" \
  -v /var/lib/qdrant:/qdrant/storage \
  --restart unless-stopped \
  qdrant/qdrant

# API Key in .env setzen
echo "QDRANT_API_KEY=$API_KEY" >> .env
```

---

## 🚀 GitHub Actions Workflow

### **Muss der Workflow angepasst werden?** ✅ **JA!**

**Problem:** Aktueller Workflow schreibt nur 5 Umgebungsvariablen, es fehlen:
- OpenAI Keys
- Pinecone Keys
- Qdrant Keys
- Stripe Keys
- Replicate Token
- etc.

### **✅ Lösung: Workflow wurde bereits angepasst!**

Die Datei `.github/workflows/deploy-backend.yml` wurde aktualisiert und enthält jetzt **alle** benötigten Umgebungsvariablen.

---

## 📋 TODO: GitHub Secrets hinzufügen

### **Schritt 1: Secrets extrahieren**
```bash
# Im Projektverzeichnis
./extract-secrets.sh

# Ausgabe: Alle Secret-Namen und Werte zum Kopieren
```

### **Schritt 2: Zu GitHub hinzufügen**

Gehe zu: **GitHub Repository → Settings → Secrets and variables → Actions**

Füge diese **13 neuen Secrets** hinzu:

#### **OpenAI (3 Secrets)**
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `EMBEDDING_MODEL`

#### **Pinecone (3 Secrets)**
- `PINECONE_API_KEY`
- `PINECONE_INDEX_NAME`
- `PINECONE_ENVIRONMENT`

#### **Qdrant (2 Secrets)**
- `QDRANT_API_URL`
- `QDRANT_API_KEY` (optional - nur wenn API Key aktiviert)

#### **Hetzner (1 Secret)**
- `HETZNER_BUCKET_NAME`

#### **Stripe (3 Secrets)**
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID`
- `STRIPE_WEBHOOK_SECRET`

#### **Replicate (1 Secret)**
- `REPLICATE_API_TOKEN`

#### **Optional:**
- `COGNEE_API_KEY`

---

## 🎯 Empfohlenes Setup

### **Für JETZT (schnelles Deployment):**

```bash
# 1. Qdrant OHNE API Key starten
docker run -d --name qdrant -p 6333:6333 \
  -v $(pwd)/qdrant_storage:/qdrant/storage \
  qdrant/qdrant

# 2. GitHub Secrets hinzufügen (siehe Checkliste)
./extract-secrets.sh  # Werte kopieren

# 3. Workflow deployen
git add .github/workflows/deploy-backend.yml
git commit -m "Update deployment workflow with all env vars"
git push origin master
```

### **Für SPÄTER (Production-Ready):**

```bash
# 1. API Key generieren
API_KEY=$(openssl rand -base64 32)
echo "Generated Qdrant API Key: $API_KEY"

# 2. Qdrant MIT API Key neu starten
docker stop qdrant && docker rm qdrant

docker run -d --name qdrant -p 6333:6333 \
  -e QDRANT__SERVICE__API_KEY="$API_KEY" \
  -v /var/lib/qdrant:/qdrant/storage \
  --restart unless-stopped \
  qdrant/qdrant

# 3. GitHub Secret aktualisieren
# Gehe zu GitHub → Settings → Secrets → QDRANT_API_KEY → Update
```

---

## 📚 Dokumentation

| Datei | Beschreibung |
|-------|-------------|
| `QDRANT_API_KEY_SETUP.md` | Komplette Anleitung für API Key Generierung |
| `GITHUB_SECRETS_CHECKLIST.md` | Detaillierte Checkliste für alle Secrets |
| `QDRANT_LOCAL_SETUP.md` | Lokales Qdrant Setup (Port 6333) |
| `DEPLOYMENT_CHECKLIST.md` | Deployment Quick-Start |
| `extract-secrets.sh` | Script zum Extrahieren der Secrets |

---

## ⚡ Quick Commands

### **Qdrant ohne API Key (jetzt):**
```bash
docker run -d --name qdrant -p 6333:6333 qdrant/qdrant
curl http://localhost:6333  # Sollte funktionieren
```

### **Qdrant mit API Key (später):**
```bash
API_KEY=$(openssl rand -base64 32)
docker run -d --name qdrant -p 6333:6333 \
  -e QDRANT__SERVICE__API_KEY="$API_KEY" \
  qdrant/qdrant

curl -H "api-key: $API_KEY" http://localhost:6333/collections
```

### **Secrets extrahieren:**
```bash
chmod +x extract-secrets.sh
./extract-secrets.sh
```

### **Workflow testen:**
```bash
git add .github/workflows/deploy-backend.yml
git commit -m "Update deployment workflow"
git push origin master

# Gehe zu GitHub → Actions → Prüfe Workflow
```

---

## ✅ Deployment Checklist (Heute)

- [ ] 1. Qdrant ohne API Key starten: `docker run -d --name qdrant -p 6333:6333 qdrant/qdrant`
- [ ] 2. Secrets extrahieren: `./extract-secrets.sh`
- [ ] 3. GitHub Secrets hinzufügen (13 Secrets)
- [ ] 4. Workflow committen und pushen
- [ ] 5. Deployment in GitHub Actions prüfen
- [ ] 6. Server prüfen: `ssh root@87.106.45.41 "pm2 logs RAG-SERVER"`

**Geschätzte Zeit:** 20 Minuten

---

## 🔒 Security für später

- [ ] Qdrant API Key aktivieren (Production)
- [ ] Firewall Regeln für Port 6333
- [ ] SSL/TLS für Qdrant (bei externem Zugriff)
- [ ] API Key Rotation (alle 90 Tage)
- [ ] Monitoring & Alerts einrichten

---

## 🆘 Troubleshooting

### **Workflow schlägt fehl - "Secret not found"**
→ Prüfe ob alle 18 Secrets hinzugefügt wurden

### **Backend startet nicht - "QDRANT_API_URL must be configured"**
→ GitHub Secret `QDRANT_API_URL` fehlt

### **Qdrant Connection Failed**
→ Prüfe ob Qdrant auf Server läuft: `docker ps | grep qdrant`

---

## 📞 Support

Alle Fragen zu:
- Qdrant API Keys: `QDRANT_API_KEY_SETUP.md`
- GitHub Secrets: `GITHUB_SECRETS_CHECKLIST.md`
- Deployment: `DEPLOYMENT_CHECKLIST.md`

---

**TL;DR:**
1. ❌ Kein API Key für lokales Qdrant (jetzt)
2. ✅ Workflow MUSS angepasst werden (bereits gemacht)
3. 📋 13 GitHub Secrets hinzufügen (siehe extract-secrets.sh)
4. 🚀 Deploy!
