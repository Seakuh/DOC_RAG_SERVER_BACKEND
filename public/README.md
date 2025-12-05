# 🌿 Terpene & Cannabis RAG System Frontend

Eine umfassende HTML-Webanwendung für das Cannabis- und Terpenen-RAG-System.

## Features

### 🔍 Strain-Suche
- **Name-basierte Suche**: Suchen Sie Cannabis-Strains nach Namen
- **Mood-basierte Empfehlungen**: Beschreiben Sie Ihre Stimmung und erhalten Sie personalisierte Strain-Empfehlungen
- **Detaillierte Informationen**: THC/CBD-Gehalt, Effekte, Aromen, Terpene-Profile

### 📄 Dokument-Upload
- **Drag & Drop**: Einfaches Hochladen von Dokumenten per Drag & Drop
- **Multi-Format-Support**: PDF, DOCX, TXT und Bilder (JPG, PNG, GIF, BMP, TIFF, WEBP)
- **OCR-Verarbeitung**: Automatische Texterkennung aus Bildern
- **Dokumentenverwaltung**: Übersicht aller hochgeladenen Dokumente

### 💬 Terpenen-Fragen
- **KI-gestützte Antworten**: Stellen Sie Fragen zu Terpenen und erhalten Sie intelligente Antworten
- **Semantische Suche**: Vector-basierte Suche in der Terpenen-Datenbank
- **Quellen-Referenzen**: Antworten mit Relevanz-Scores und Quellennachweisen

### 📚 Terpenen-Browser
- **Alle Terpene anzeigen**: Vollständige Übersicht aller Terpene in der Datenbank
- **Name-basierte Suche**: Suchen Sie spezifische Terpene nach Namen
- **Detaillierte Profile**: Aromen, Effekte, medizinische Vorteile, Siedepunkte, molekulare Formeln

## Technologie

### Frontend
- **Pure HTML/CSS/JavaScript**: Keine Framework-Abhängigkeiten
- **Responsive Design**: Funktioniert auf Desktop und Mobile
- **Modern UI**: Gradient-Design mit Animationen und Transitions
- **Tab-basierte Navigation**: Intuitive Benutzeroberfläche

### Backend-Integration
- **REST API**: Vollständige Integration mit NestJS Backend
- **Real-time Updates**: Sofortige Anzeige von Ergebnissen
- **Error Handling**: Benutzerfreundliche Fehlermeldungen
- **Loading States**: Visuelle Feedback-Elemente

## Verwendung

### Server starten
```bash
npm run start:dev
```

Die Anwendung ist dann verfügbar unter:
```
http://localhost:3000/index.html
```

### API-Endpunkte

Die App nutzt folgende Backend-Endpunkte:

#### Strains
- `GET /api/v1/cannabis/strains` - Alle Strains abrufen
- `POST /api/v1/cannabis/recommendations` - Mood-basierte Empfehlungen

#### Dokumente
- `POST /api/v1/documents/upload` - Dokument hochladen
- `GET /api/v1/documents` - Alle Dokumente auflisten

#### Terpenen
- `GET /api/v1/terpenes` - Alle Terpene abrufen
- `GET /api/v1/terpenes/search?name=xyz` - Terpene nach Name suchen
- `POST /api/v1/terpenes/query` - Frage zu Terpenen stellen

## Konfiguration

### API-Basis-URL ändern
Bearbeiten Sie die `API_BASE` Konstante in der `index.html`:

```javascript
const API_BASE = 'http://localhost:3000/api/v1';
```

## Features im Detail

### Strain-Suche
1. Geben Sie einen Strain-Namen ein (z.B. "Blue Dream")
2. Klicken Sie auf "Suchen"
3. Erhalten Sie detaillierte Informationen zu passenden Strains

### Mood-Empfehlung
1. Beschreiben Sie Ihre aktuelle Stimmung und gewünschte Effekte
2. Das System analysiert Ihre Eingabe mit GPT-4
3. Vector-basierte Ähnlichkeitssuche findet passende Strains
4. Erhalten Sie personalisierte Empfehlungen mit Match-Scores

### Dokument-Upload
1. Ziehen Sie eine Datei in den Upload-Bereich oder klicken Sie zum Auswählen
2. Unterstützte Formate:
   - **PDF**: Automatische Textextraktion
   - **DOCX**: Word-Dokument-Verarbeitung
   - **TXT**: Plain-Text-Dateien
   - **Bilder**: OCR-Texterkennung (Tesseract.js)
3. Dokument wird automatisch verarbeitet und in Chunks aufgeteilt
4. Chunks werden als Embeddings in Qdrant gespeichert

### Terpenen-Fragen
1. Stellen Sie eine Frage zu Terpenen
2. Wählen Sie die Anzahl der Ergebnisse (3, 5 oder 10)
3. System sucht in der Vector-Datenbank
4. GPT-4 generiert eine detaillierte Antwort
5. Quellen werden mit Relevanz-Scores angezeigt

### Terpenen-Browser
- **Alle Terpene**: Grid-Ansicht aller Terpene mit wichtigsten Informationen
- **Detailsuche**: Suchen Sie spezifische Terpene nach exaktem Namen
- **Vollständige Profile**: Alle Eigenschaften und verwandte Strains

## UI-Komponenten

### Cards
Grid-basierte Darstellung für Terpene und Dokumente mit Hover-Effekten

### Result Items
Detaillierte Ergebnisanzeige mit farbigen Badges und Chips

### Badges & Chips
- **Badges**: Wichtige Informationen (Effekte, medizinische Vorteile)
- **Chips**: Listen-Elemente (Aromen, Tags)
- **Scores**: Relevanz-Anzeigen mit Farb-Coding

### Loading States
Animierte Spinner mit beschreibenden Texten für alle asynchronen Operationen

### Alerts
- **Success**: Grün für erfolgreiche Operationen
- **Error**: Rot für Fehlermeldungen
- Auto-Hide nach 5 Sekunden

## Styling

### Farbschema
- **Primary**: `#667eea` (Violett)
- **Secondary**: `#764ba2` (Lila)
- **Success**: `#4caf50` (Grün)
- **Warning**: `#ffc107` (Orange)
- **Error**: `#f44336` (Rot)

### Gradienten
- Header: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- Buttons: Gleicher Gradient mit Box-Shadow-Effekten

### Animationen
- **fadeIn**: Smooth fade-in für Tab-Inhalte
- **slideIn**: Slide-in für Ergebnisse
- **spin**: Rotate-Animation für Loading-Spinner
- **Hover-Effekte**: Transform und Box-Shadow Transitions

## Browser-Unterstützung

- Chrome/Edge (empfohlen)
- Firefox
- Safari
- Mobile Browser (iOS Safari, Chrome Mobile)

## Entwicklung

### Struktur
```
public/
├── index.html          # Haupt-Anwendung
└── README.md          # Diese Datei
```

### Anpassungen
Alle Funktionen sind in der `index.html` enthalten. Für Anpassungen:
1. HTML-Struktur in den Tab-Content-Bereichen
2. CSS-Styles im `<style>`-Tag
3. JavaScript-Funktionen im `<script>`-Tag

## Tipps

### Beste Ergebnisse
- **Mood-Empfehlungen**: Je detaillierter die Beschreibung, desto besser die Empfehlungen
- **Dokument-Upload**: Hochqualitative PDFs und Bilder liefern bessere OCR-Ergebnisse
- **Terpenen-Fragen**: Stellen Sie spezifische Fragen für präzisere Antworten

### Performance
- Die App lädt Daten nur auf Anfrage (lazy loading)
- Große Dokumentenlisten können paginated werden (zukünftige Verbesserung)

## Fehlerbehebung

### API-Verbindung
- Stellen Sie sicher, dass der Backend-Server läuft
- Überprüfen Sie die CORS-Konfiguration
- Prüfen Sie die Browser-Konsole auf Fehler

### Dokument-Upload
- Maximale Dateigröße: Check Backend-Konfiguration
- Unterstützte Formate: PDF, DOCX, TXT, Bilder
- Bei OCR-Fehlern: Bildqualität verbessern

### Terpenen-Fragen
- Stellen Sie sicher, dass Terpene in der Datenbank vorhanden sind
- Überprüfen Sie Qdrant-Verbindung
- OpenAI API-Key muss konfiguriert sein

## Zukünftige Features

- [ ] Pagination für große Ergebnislisten
- [ ] Filter und Sortierung
- [ ] Favoriten-System
- [ ] Dark Mode
- [ ] Export-Funktionen (PDF, CSV)
- [ ] Erweiterte Suche mit Filtern
- [ ] Benutzer-Profile und Verlauf
- [ ] Strain-Vergleich Side-by-Side
- [ ] Terpene-Visualisierungen (Charts)
- [ ] Mobile App (PWA)

## Support

Bei Fragen oder Problemen:
1. Überprüfen Sie die Swagger-Dokumentation: http://localhost:3000/api
2. Prüfen Sie die Backend-Logs
3. Schauen Sie in die Browser-Konsole

---

**Version**: 1.0.0
**Letzte Aktualisierung**: 2024
**Lizenz**: MIT
