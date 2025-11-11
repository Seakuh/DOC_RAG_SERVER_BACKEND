# 🚀 Deployment Checklist

## Schnellstart für Server-Deployment

### ✅ **Vorbereitung (5 Minuten)**

#### 1. Qdrant lokal starten
```bash
# Prüfe ob Qdrant läuft
curl http://localhost:6333

# Falls nicht, starte Qdrant
docker run -d --name qdrant -p 6333:6333 -v $(pwd)/qdrant_storage:/qdrant/storage qdrant/qdrant

# Verifiziere
curl http://localhost:6333
# Erwartete Response: {"title":"qdrant - vector search engine",...}
```

#### 2. .env Datei prüfen
```bash
# Zeige Qdrant-Konfiguration
grep QDRANT .env
```

**Soll sein:**
```env
QDRANT_API_URL=http://localhost:6333
# QDRANT_API_KEY auskommentiert oder leer
```

**Falls noch Cloud-URL:**
```bash
# Automatisch anpassen
sed -i 's|QDRANT_API_URL=https://.*|QDRANT_API_URL=http://localhost:6333|' .env
sed -i 's|^QDRANT_API_KEY=|# QDRANT_API_KEY=|' .env
```

#### 3. Dependencies installieren
```bash
npm install
```

#### 4. Build erstellen
```bash
npm run build
```

---

### 🔧 **Deployment**

#### **Option A: Development Mode**
```bash
npm run start:dev
```

#### **Option B: Production Mode**
```bash
npm run build
npm run start:prod
```

#### **Option C: Docker**
```bash
docker-compose up -d
```

---

### ✅ **Tests durchführen**

#### Test 1: Server erreichbar
```bash
curl http://localhost:3007/api/v1
```
**Erwartete Response:** `{"message":"RAG Backend API is running!",...}`

#### Test 2: OpenAI Endpoint
```bash
curl -X POST http://localhost:3007/api/v1/openai/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "Was ist 2+2?"}'
```
**Erwartete Response:** `{"answer":"2+2 ist 4.","model":"gpt-4",...}`

#### Test 3: Qdrant Upload
```bash
# Test-Datei erstellen
echo "This is a test document" > /tmp/test.txt

# Upload
curl -X POST http://localhost:3007/api/v1/qdrant/upload \
  -F "collectionName=test-collection" \
  -F "files=@/tmp/test.txt"
```
**Erwartete Response:** `{"success":true,"collectionName":"test-collection",...}`

#### Test 4: Qdrant Collection prüfen
```bash
curl http://localhost:6333/collections/test-collection
```
**Erwartete Response:** Collection mit `"points_count": 1` oder mehr

---

### 📊 **Deployment-Status**

- [ ] Qdrant läuft auf Port 6333
- [ ] `.env` zeigt auf `http://localhost:6333`
- [ ] Dependencies installiert (`npm install`)
- [ ] Build erfolgreich (`npm run build`)
- [ ] Server läuft auf Port 3007
- [ ] OpenAI Endpoint funktioniert
- [ ] Qdrant Upload funktioniert
- [ ] Collections werden erstellt

---

### 🔍 **Troubleshooting**

#### Server startet nicht (Port 3007 belegt)
```bash
# Finde Prozess
lsof -i :3007

# Beende Prozess
kill -9 <PID>

# Oder ändere Port in .env
PORT=3008
```

#### Qdrant Connection Failed
```bash
# Prüfe Qdrant Status
docker ps | grep qdrant

# Starte Qdrant neu
docker restart qdrant

# Prüfe Logs
docker logs qdrant
```

#### Module Build Error
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

### 📚 **Dokumentation**

- **Qdrant Setup:** `QDRANT_LOCAL_SETUP.md`
- **OpenAI Modul:** `src/openai/README.md`
- **Qdrant Upload:** `src/qdrant/QDRANT_UPLOAD_README.md`
- **Swagger API:** `http://localhost:3007/api`

---

### 🎯 **Production Settings**

```env
# .env für Production
NODE_ENV=production
PORT=3007

QDRANT_API_URL=http://localhost:6333
# QDRANT_API_KEY=<optional-if-auth-enabled>

OPENAI_API_KEY=<your-production-key>
OPENAI_MODEL=gpt-4o-mini

# Logging
LOG_LEVEL=info
```

---

### 🔐 **Security Checklist**

- [ ] `.env` nicht in Git committed (bereits in .gitignore)
- [ ] Production API Keys rotiert
- [ ] CORS auf Frontend-Domain beschränkt
- [ ] Rate Limiting aktiviert
- [ ] Qdrant Data Backup eingerichtet
- [ ] SSL/TLS für Production (Nginx/Caddy)

---

### 📝 **Nützliche Befehle**

```bash
# Logs anzeigen
npm run start:dev  # Live logs

# Background starten
npm run start:prod > logs/app.log 2>&1 &

# Prozess finden
ps aux | grep node

# Server neustarten
pkill -f "node.*main.js" && npm run start:prod

# Qdrant Collections auflisten
curl http://localhost:6333/collections

# Qdrant Collection löschen
curl -X DELETE http://localhost:6333/collections/test-collection

# Disk Usage prüfen
du -sh qdrant_storage/
```

---

## 🎉 **Fertig!**

Dein Backend ist jetzt bereit für Production auf dem Server mit lokalem Qdrant auf Port 6333!
