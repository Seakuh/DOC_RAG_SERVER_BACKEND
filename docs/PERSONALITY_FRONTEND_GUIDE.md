# Personality Module - Frontend Integration Guide

Dieses Dokument beschreibt, wie das Personality-Modul im Frontend integriert werden kann.

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [API-Endpunkte](#api-endpunkte)
- [Fragentypen](#fragentypen)
- [Antworten einreichen](#antworten-einreichen)
- [Profil-Matching](#profil-matching)
- [Beispiel-Implementierung](#beispiel-implementierung)

---

## Übersicht

Das Personality-Modul ermöglicht es Benutzern, ein umfassendes Persönlichkeitsprofil zu erstellen, das auf einem strukturierten Fragebogen basiert. Die Antworten werden in Vektorform gespeichert und ermöglichen intelligentes Matching mit anderen Benutzern.

**Base URL:** `http://localhost:3000/api/v1/personality`

---

## API-Endpunkte

### 1. Alle Fragen abrufen

```http
GET /api/v1/personality/questions
```

**Response:**

```json
[
  {
    "_id": "...",
    "key": "country",
    "question": "In welchem Land lebst du überwiegend?",
    "type": "free_text",
    "dimension": "region",
    "section": "demographics",
    "sectionTitle": "Basisdaten",
    "sectionDescription": "Rahmenbedingungen wie Region, Lebenssituation und Beruf.",
    "active": true,
    "order": 100
  },
  {
    "_id": "...",
    "key": "age_range",
    "question": "In welcher Altersgruppe befindest du dich?",
    "type": "single_choice",
    "dimension": "alter",
    "section": "demographics",
    "sectionTitle": "Basisdaten",
    "sectionDescription": "Rahmenbedingungen wie Region, Lebenssituation und Beruf.",
    "structuredOptions": [
      { "value": "u20", "label": "Unter 20" },
      { "value": "20_29", "label": "20–29" },
      { "value": "30_39", "label": "30–39" }
    ],
    "active": true,
    "order": 101
  }
]
```

### 2. Antworten einreichen

```http
POST /api/v1/personality/answers
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**

```json
{
  "username": "JohnPoker",
  "avatar": "https://example.com/avatar.jpg",
  "bio": "Passionierter Poker-Spieler und Unternehmer",
  "region": "Europe/Berlin",
  "answers": [
    {
      "questionKey": "country",
      "answer": "Deutschland"
    },
    {
      "questionKey": "age_range",
      "answer": "30_39"
    },
    {
      "questionKey": "poker_formats",
      "answer": ["cashgame", "mtt", "online"]
    }
  ]
}
```

### 3. Eigenes Profil abrufen

```http
GET /api/v1/personality/profile
Authorization: Bearer <JWT_TOKEN>
```

### 4. Matching-Profile finden

```http
GET /api/v1/personality/match?limit=10
Authorization: Bearer <JWT_TOKEN>
```

**Response:**

```json
{
  "matches": [
    {
      "profileId": "...",
      "userId": "...",
      "username": "PokerPro123",
      "avatar": "https://example.com/avatar2.jpg",
      "bio": "Professioneller Pokerspieler",
      "score": 0.92,
      "generatedText": "Diese Person ist ein erfahrener Poker-Spieler...",
      "region": "Europe/Berlin"
    }
  ],
  "totalMatches": 5
}
```

---

## Fragentypen

Das System unterstützt verschiedene Fragentypen. Hier ist, wie jeder Typ beantwortet werden muss:

### 1. `free_text` - Freitext

**Beschreibung:** Benutzer kann beliebigen Text eingeben.

**Beispiel:**

```json
{
  "key": "country",
  "question": "In welchem Land lebst du überwiegend?",
  "type": "free_text"
}
```

**Antwort-Format:**

```json
{
  "questionKey": "country",
  "answer": "Deutschland"
}
```

---

### 2. `single_choice` - Einfachauswahl

**Beschreibung:** Benutzer wählt genau eine Option aus einer Liste.

**Beispiel:**

```json
{
  "key": "age_range",
  "question": "In welcher Altersgruppe befindest du dich?",
  "type": "single_choice",
  "structuredOptions": [
    { "value": "u20", "label": "Unter 20" },
    { "value": "20_29", "label": "20–29" },
    { "value": "30_39", "label": "30–39" }
  ]
}
```

**Antwort-Format:**

```json
{
  "questionKey": "age_range",
  "answer": "30_39"
}
```

**Wichtig:** Verwende den `value` aus `structuredOptions`, nicht das `label`.

---

### 3. `single_choice_other` - Einfachauswahl mit "Sonstiges"

**Beschreibung:** Wie `single_choice`, aber mit Möglichkeit für freien Text bei "Sonstiges".

**Beispiel:**

```json
{
  "key": "profession_field",
  "question": "In welchem beruflichen Bereich arbeitest du überwiegend?",
  "type": "single_choice_other",
  "structuredOptions": [
    { "value": "it_tech", "label": "IT / Tech" },
    { "value": "finance", "label": "Finanzen / Banking / Trading" },
    { "value": "other", "label": "Sonstiges" }
  ]
}
```

**Antwort-Format (vordefinierte Option):**

```json
{
  "questionKey": "profession_field",
  "answer": "it_tech"
}
```

**Antwort-Format ("Sonstiges" mit Freitext):**

```json
{
  "questionKey": "profession_field",
  "answer": "other: Psychologie"
}
```

---

### 4. `multi_choice` - Mehrfachauswahl

**Beschreibung:** Benutzer kann mehrere Optionen auswählen.

**Beispiel:**

```json
{
  "key": "poker_formats",
  "question": "Welche Formate spielst du hauptsächlich?",
  "type": "multi_choice",
  "structuredOptions": [
    { "value": "cashgame", "label": "Cashgame" },
    { "value": "mtt", "label": "MTT (Multi-Table Turniere)" },
    { "value": "online", "label": "Online Poker" }
  ]
}
```

**Antwort-Format:**

```json
{
  "questionKey": "poker_formats",
  "answer": ["cashgame", "mtt", "online"]
}
```

**Wichtig:** Die Antwort muss ein Array sein, auch wenn nur eine Option gewählt wurde.

---

### 5. `scale_1_5` - Likert-Skala (1-5)

**Beschreibung:** Benutzer bewertet eine Aussage auf einer Skala von 1 bis 5.

**Beispiel:**

```json
{
  "key": "bf_offenheit_1",
  "question": "Ich probiere gerne neue Ideen, Strategien oder ungewöhnliche Lösungen aus.",
  "type": "scale_1_5",
  "scaleType": "likert_1_5",
  "scaleLabels": {
    "1": "stimme überhaupt nicht zu",
    "2": "stimme eher nicht zu",
    "3": "teils/teils",
    "4": "stimme eher zu",
    "5": "stimme voll zu"
  }
}
```

**Antwort-Format:**

```json
{
  "questionKey": "bf_offenheit_1",
  "answer": "4"
}
```

**Wichtig:** Die Antwort sollte ein String sein, der eine Zahl zwischen "1" und "5" repräsentiert.

---

### 6. `text` / `multiple_choice` - Legacy-Typen

**Beschreibung:** Diese Typen existieren für Rückwärtskompatibilität.

- `text`: Wie `free_text`
- `multiple_choice`: Wie `multi_choice`

**Behandlung:** Identisch zu den modernen Äquivalenten.

---

## Antworten einreichen

### Komplettes Beispiel

```typescript
// 1. Fragen abrufen
const response = await fetch('http://localhost:3000/api/v1/personality/questions');
const questions = await response.json();

// 2. Fragen nach Sektionen gruppieren
const sections = questions.reduce((acc, q) => {
  const section = q.section || 'other';
  if (!acc[section]) {
    acc[section] = {
      title: q.sectionTitle,
      description: q.sectionDescription,
      questions: []
    };
  }
  acc[section].questions.push(q);
  return acc;
}, {});

// 3. Antworten sammeln (Beispiel)
const answers = {
  username: "JohnPoker",
  avatar: "https://example.com/avatar.jpg",
  bio: "Passionierter Poker-Spieler",
  region: "Europe/Berlin",
  answers: [
    { questionKey: "country", answer: "Deutschland" },
    { questionKey: "age_range", answer: "30_39" },
    { questionKey: "poker_formats", answer: ["cashgame", "online"] },
    { questionKey: "bf_offenheit_1", answer: "4" }
  ]
};

// 4. Antworten einreichen
const submitResponse = await fetch('http://localhost:3000/api/v1/personality/answers', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${jwtToken}`
  },
  body: JSON.stringify(answers)
});

const profile = await submitResponse.json();
console.log('Profil erstellt:', profile);
```

---

## Profil-Matching

Nach dem Einreichen der Antworten kann das System automatisch passende Profile finden:

```typescript
const matchResponse = await fetch('http://localhost:3000/api/v1/personality/match?limit=10', {
  headers: {
    'Authorization': `Bearer ${jwtToken}`
  }
});

const { matches, totalMatches } = await matchResponse.json();

matches.forEach(match => {
  console.log(`Match: ${match.username} (Score: ${match.score})`);
  console.log(`Avatar: ${match.avatar}`);
  console.log(`Bio: ${match.bio}`);
  console.log(`Region: ${match.region}`);
  console.log(`Zusammenfassung: ${match.generatedText}`);
});
```

### Match-Score

- **Range:** 0.0 - 1.0
- **0.9 - 1.0:** Sehr hohe Übereinstimmung
- **0.7 - 0.9:** Hohe Übereinstimmung
- **0.5 - 0.7:** Moderate Übereinstimmung
- **< 0.5:** Geringe Übereinstimmung

### Regionale Boost

Profile aus derselben Region erhalten automatisch einen 10% Boost auf ihren Match-Score (maximal 1.0).

---

## Beispiel-Implementierung

### React-Komponente (Beispiel)

```typescript
import React, { useState, useEffect } from 'react';

interface Question {
  _id: string;
  key: string;
  question: string;
  type: string;
  section?: string;
  sectionTitle?: string;
  structuredOptions?: Array<{ value: string; label: string; description?: string }>;
  scaleLabels?: { [key: string]: string };
}

const PersonalityQuestionnaire: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<{ [key: string]: string | string[] }>({});

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    const response = await fetch('http://localhost:3000/api/v1/personality/questions');
    const data = await response.json();
    setQuestions(data);
  };

  const handleAnswer = (key: string, value: string | string[]) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const renderQuestion = (q: Question) => {
    switch (q.type) {
      case 'free_text':
      case 'text':
        return (
          <input
            type="text"
            value={(answers[q.key] as string) || ''}
            onChange={(e) => handleAnswer(q.key, e.target.value)}
          />
        );

      case 'single_choice':
      case 'single_choice_other':
        return (
          <div>
            {q.structuredOptions?.map(opt => (
              <label key={opt.value}>
                <input
                  type="radio"
                  name={q.key}
                  value={opt.value}
                  checked={answers[q.key] === opt.value}
                  onChange={(e) => handleAnswer(q.key, e.target.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        );

      case 'multi_choice':
      case 'multiple_choice':
        return (
          <div>
            {q.structuredOptions?.map(opt => (
              <label key={opt.value}>
                <input
                  type="checkbox"
                  checked={(answers[q.key] as string[] || []).includes(opt.value)}
                  onChange={(e) => {
                    const current = (answers[q.key] as string[]) || [];
                    const newValue = e.target.checked
                      ? [...current, opt.value]
                      : current.filter(v => v !== opt.value);
                    handleAnswer(q.key, newValue);
                  }}
                />
                {opt.label}
              </label>
            ))}
          </div>
        );

      case 'scale_1_5':
        return (
          <div>
            {[1, 2, 3, 4, 5].map(num => (
              <label key={num}>
                <input
                  type="radio"
                  name={q.key}
                  value={num.toString()}
                  checked={answers[q.key] === num.toString()}
                  onChange={(e) => handleAnswer(q.key, e.target.value)}
                />
                {num} - {q.scaleLabels?.[num.toString()]}
              </label>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  const submitAnswers = async () => {
    const payload = {
      username: 'JohnPoker',
      avatar: 'https://example.com/avatar.jpg',
      bio: 'Meine Bio',
      region: 'Europe/Berlin',
      answers: Object.entries(answers).map(([questionKey, answer]) => ({
        questionKey,
        answer
      }))
    };

    const response = await fetch('http://localhost:3000/api/v1/personality/answers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log('Profil erfolgreich erstellt!');
    }
  };

  return (
    <div>
      <h1>Persönlichkeitsfragebogen</h1>
      {questions.map(q => (
        <div key={q._id}>
          <h3>{q.question}</h3>
          {renderQuestion(q)}
        </div>
      ))}
      <button onClick={submitAnswers}>Absenden</button>
    </div>
  );
};

export default PersonalityQuestionnaire;
```

---

## Validierung

### Client-seitige Validierung

Vor dem Absenden sollten folgende Punkte überprüft werden:

1. **Pflichtfelder:** Alle aktiven Fragen sollten beantwortet sein
2. **Format:** Antworten müssen dem korrekten Format entsprechen:
   - `single_choice`: String
   - `multi_choice`: Array
   - `scale_1_5`: String mit Wert "1" bis "5"
   - `free_text`: String

3. **Strukturierte Optionen:** Bei Fragen mit `structuredOptions` muss der `value` verwendet werden, nicht das `label`

### Server-seitige Validierung

Der Server validiert:

- Existenz der Fragen
- JWT-Authentifizierung
- Datenformat
- Eindeutigkeit des Profils (pro User)

---

## Best Practices

1. **Sektionen verwenden:** Gruppiere Fragen nach `section` für bessere UX
2. **Progressive Disclosure:** Zeige Sektionen nacheinander an
3. **Zwischenspeichern:** Speichere Antworten im localStorage für bessere UX
4. **Loading States:** Zeige Ladezustände beim Abrufen und Absenden
5. **Fehlerbehandlung:** Zeige aussagekräftige Fehlermeldungen
6. **Responsive Design:** Stelle sicher, dass der Fragebogen auf allen Geräten funktioniert

---

## Fehlerbehebung

### Häufige Fehler

**400 Bad Request: "Some questions do not exist"**
- Überprüfe, ob alle `questionKey` in deinen Antworten existieren
- Rufe `/questions` auf, um die aktuellen Fragen zu sehen

**400 Bad Request: "Profile already exists"**
- Der Benutzer hat bereits ein Profil
- Verwende stattdessen die Update-Funktion (gleicher Endpunkt, wird automatisch erkannt)

**401 Unauthorized**
- JWT-Token fehlt oder ist ungültig
- Stelle sicher, dass der Token im Authorization-Header gesendet wird

---

## Support

Bei Fragen oder Problemen:
- Swagger-Dokumentation: `http://localhost:3000/api`
- Backend-Logs für detaillierte Fehlermeldungen
- GitHub Issues für Bug-Reports
