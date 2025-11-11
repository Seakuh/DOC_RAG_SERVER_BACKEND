# Qdrant Local Setup Guide

## Overview
Diese Anleitung zeigt, wie du Qdrant lokal auf Port 6333 konfigurierst und mit dem Backend verbindest.

---

## 🔧 Aktuelle Konfiguration

### ❌ **Problem:** Qdrant ist auf Cloud-URL konfiguriert

**Aktuelle .env:**
```env
QDRANT_API_URL=https://be3bf75b-20bb-41e0-92e6-c7e9641e51ea.us-west-1-0.aws.cloud.qdrant.io
QDRANT_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### ✅ **Lösung:** Auf localhost:6333 umstellen

---

## 📋 Schritt-für-Schritt Anleitung

### **1. Qdrant lokal auf dem Server prüfen**

```bash
# Prüfe ob Qdrant auf Port 6333 läuft
curl http://localhost:6333

# Erwartete Response:
{
  "title": "qdrant - vector search engine",
  "version": "1.x.x"
}
```

Wenn Qdrant **nicht läuft**, starte es:

#### **Option A: Docker (empfohlen)**
```bash
# Qdrant mit Docker starten
docker run -d \
  --name qdrant \
  -p 6333:6333 \
  -p 6334:6334 \
  -v $(pwd)/qdrant_storage:/qdrant/storage \
  qdrant/qdrant

# Prüfen ob Container läuft
docker ps | grep qdrant

# Logs anzeigen
docker logs qdrant
```

#### **Option B: Docker Compose**
```yaml
# docker-compose.yml
version: '3.8'

services:
  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"  # REST API
      - "6334:6334"  # gRPC API
    volumes:
      - ./qdrant_storage:/qdrant/storage
    restart: unless-stopped
```

```bash
# Starten
docker-compose up -d qdrant

# Logs
docker-compose logs -f qdrant
```

#### **Option C: Systemd Service (Native Installation)**
```bash
# Falls Qdrant als Service läuft
sudo systemctl status qdrant
sudo systemctl start qdrant
sudo systemctl enable qdrant  # Auto-start on boot
```

---

### **2. .env Datei anpassen**

**Öffne:** `/home/dizzle/Dev/DOC_RAG_SERVER_BACKEND/.env`

**Ändere die folgenden Zeilen:**

#### **Vorher (Cloud-Qdrant):**
```env
# QDRANT
QDRANT_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.CxVZojNAqQXjC1K3At27ZwRlik6ISvWflhuVeAgZREA
QDRANT_API_URL=https://be3bf75b-20bb-41e0-92e6-c7e9641e51ea.us-west-1-0.aws.cloud.qdrant.io
QDRANT_AUTO_RECREATE=true
```

#### **Nachher (Lokales Qdrant):**

**Option 1: Qdrant OHNE Authentication (Standard bei lokalem Docker)**
```env
# ==============================================
# QDRANT (Local on Port 6333)
# ==============================================
QDRANT_API_URL=http://localhost:6333
# QDRANT_API_KEY nicht benötigt für lokales Qdrant
QDRANT_AUTO_RECREATE=true
```

**Option 2: Qdrant MIT Authentication (falls konfiguriert)**
```env
# ==============================================
# QDRANT (Local on Port 6333 with Auth)
# ==============================================
QDRANT_API_URL=http://localhost:6333
QDRANT_API_KEY=your-local-api-key-if-configured
QDRANT_AUTO_RECREATE=true
```

**Option 3: Qdrant auf externem Server**
```env
# Falls Qdrant auf separatem Server läuft
QDRANT_API_URL=http://167.235.200.242:6333
# Ersetze IP mit deiner Server-IP
```

---

### **3. Qdrant Service Code anpassen (falls API Key optional)**

**Datei:** `src/qdrant/qdrant.service.ts`

**Aktuelle Zeile 34-36:**
```typescript
if (!apiKey || !apiUrl) {
  throw new Error('QDRANT_API_KEY and QDRANT_API_URL must be configured');
}
```

**Ändere zu (API Key optional):**
```typescript
if (!apiUrl) {
  throw new Error('QDRANT_API_URL must be configured');
}

if (!apiKey) {
  this.logger.warn('QDRANT_API_KEY not set - using Qdrant without authentication');
}
```

**Zeile 38-41 anpassen:**
```typescript
this.client = new QdrantClient({
  url: apiUrl,
  ...(apiKey && { apiKey }), // API Key nur hinzufügen wenn vorhanden
});
```

Ich erstelle ein Patch dafür:

---

### **4. Server neu starten**

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod

# Docker
docker-compose restart rag-backend
```

---

### **5. Verbindung testen**

#### **Test 1: Qdrant Health Check**
```bash
curl http://localhost:6333
```

**Erwartete Response:**
```json
{
  "title": "qdrant - vector search engine",
  "version": "1.x.x"
}
```

#### **Test 2: Collections auflisten**
```bash
curl http://localhost:6333/collections
```

**Erwartete Response:**
```json
{
  "result": {
    "collections": []
  }
}
```

#### **Test 3: Backend Qdrant Integration testen**
```bash
# Collection erstellen und Datei hochladen
curl -X POST http://localhost:3007/api/v1/qdrant/upload \
  -F "collectionName=test-collection" \
  -F "files=@/tmp/test_document.txt"
```

**Erwartete Response:**
```json
{
  "success": true,
  "collectionName": "test-collection",
  "filesProcessed": 1,
  "vectorsCreated": 1,
  "details": [...],
  "processingTime": 1234,
  "timestamp": "2025-11-11T11:00:00.000Z"
}
```

#### **Test 4: Collection in Qdrant prüfen**
```bash
curl http://localhost:6333/collections/test-collection
```

**Erwartete Response:**
```json
{
  "result": {
    "status": "green",
    "vectors_count": 1,
    "indexed_vectors_count": 1,
    "points_count": 1
  }
}
```

---

## 🔍 Troubleshooting

### **Problem 1: Connection Refused**

**Fehler:**
```
Error: connect ECONNREFUSED 127.0.0.1:6333
```

**Lösung:**
```bash
# Prüfe ob Qdrant läuft
docker ps | grep qdrant
# oder
sudo systemctl status qdrant

# Falls nicht, starte Qdrant
docker start qdrant
# oder
sudo systemctl start qdrant
```

---

### **Problem 2: Authentication Required**

**Fehler:**
```
Error: 401 Unauthorized - API key required
```

**Lösung:**
```bash
# Prüfe Qdrant Config
curl http://localhost:6333

# Setze API Key in .env
QDRANT_API_KEY=your-api-key-here
```

---

### **Problem 3: Port bereits belegt**

**Fehler:**
```
Error: Port 6333 is already in use
```

**Lösung:**
```bash
# Finde Prozess auf Port 6333
lsof -i :6333

# Beende alten Prozess
kill -9 <PID>

# Oder nutze anderen Port
docker run -p 6334:6333 qdrant/qdrant
# Dann in .env: QDRANT_API_URL=http://localhost:6334
```

---

### **Problem 4: Collection existiert nicht**

**Fehler:**
```
Error: Collection 'xyz' does not exist
```

**Lösung:**
Collections werden automatisch erstellt beim Upload. Stelle sicher:
1. `QDRANT_AUTO_RECREATE=true` in .env
2. Backend hat Schreibrechte auf Qdrant
3. Qdrant läuft korrekt

---

## 📊 Qdrant Monitoring

### **Dashboard (optional)**

Qdrant hat ein Web-Dashboard auf Port 6333:
```
http://localhost:6333/dashboard
```

### **API Endpoints**

```bash
# Health Check
curl http://localhost:6333

# Collections auflisten
curl http://localhost:6333/collections

# Collection Info
curl http://localhost:6333/collections/{collection_name}

# Collection Stats
curl http://localhost:6333/collections/{collection_name}/cluster

# Alle Points in Collection
curl -X POST http://localhost:6333/collections/{collection_name}/points/scroll \
  -H "Content-Type: application/json" \
  -d '{"limit": 10}'
```

---

## 🚀 Production Deployment

### **1. Sichere Konfiguration**

```env
# Production .env
NODE_ENV=production
QDRANT_API_URL=http://localhost:6333
QDRANT_API_KEY=<secure-production-key>
```

### **2. Qdrant mit Persistenz**

```bash
# Docker mit Volume für Daten-Persistenz
docker run -d \
  --name qdrant-prod \
  -p 6333:6333 \
  -v /var/lib/qdrant:/qdrant/storage \
  --restart unless-stopped \
  qdrant/qdrant:latest
```

### **3. Backup Strategie**

```bash
# Qdrant Daten sichern
tar -czf qdrant_backup_$(date +%Y%m%d).tar.gz /var/lib/qdrant

# Automatisches Backup (Crontab)
0 2 * * * tar -czf /backups/qdrant_$(date +\%Y\%m\%d).tar.gz /var/lib/qdrant
```

### **4. Performance Tuning**

**Qdrant Config:** `/etc/qdrant/config.yaml`
```yaml
storage:
  # Speicher-Optimierungen
  hnsw_index:
    m: 16  # Anzahl bidirektionaler Links
    ef_construct: 100

service:
  # API Performance
  max_request_size_mb: 50

log_level: INFO
```

---

## 📚 Weitere Ressourcen

- **Qdrant Dokumentation:** https://qdrant.tech/documentation/
- **Docker Hub:** https://hub.docker.com/r/qdrant/qdrant
- **API Reference:** https://qdrant.tech/documentation/interfaces/

---

## ✅ Checkliste für Server-Deployment

- [ ] Qdrant läuft auf Port 6333
- [ ] `.env` auf `http://localhost:6333` geändert
- [ ] API Key entfernt oder optional gemacht
- [ ] Backend neu gestartet
- [ ] Verbindung getestet (curl http://localhost:6333)
- [ ] Upload-Test durchgeführt
- [ ] Collections werden korrekt erstellt
- [ ] Daten-Persistenz konfiguriert (Docker Volume)
- [ ] Backup-Strategie eingerichtet

---

## 🎯 Quick Start (Copy-Paste)

```bash
# 1. Qdrant starten
docker run -d --name qdrant -p 6333:6333 -v $(pwd)/qdrant_storage:/qdrant/storage qdrant/qdrant

# 2. .env anpassen
sed -i 's|QDRANT_API_URL=https://.*|QDRANT_API_URL=http://localhost:6333|' .env

# 3. Backend neu starten
npm run start:dev

# 4. Test
curl -X POST http://localhost:3007/api/v1/qdrant/upload \
  -F "collectionName=test" \
  -F "files=@/tmp/test_document.txt"
```

---

**Fertig! 🎉** Qdrant ist jetzt lokal auf Port 6333 konfiguriert.
