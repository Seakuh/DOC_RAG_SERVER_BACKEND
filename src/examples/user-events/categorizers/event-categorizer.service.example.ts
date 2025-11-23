import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  UserEvent,
  EventClassification,
  EventCategory,
  EventIntent,
} from '../../events/dto/user-event.dto';

/**
 * EventCategorizerService - KI-basierte Event-Kategorisierung
 *
 * Nutzt GPT-4 um Events automatisch zu kategorisieren und Intent zu erkennen.
 * Verwendet Caching um Kosten zu reduzieren.
 */
@Injectable()
export class EventCategorizerService {
  private readonly logger = new Logger(EventCategorizerService.name);
  private openai: OpenAI;
  private cache: Map<string, EventClassification> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  /**
   * Kategorisiert ein User-Event mittels GPT-4
   *
   * @param event - Das zu kategorisierende Event
   * @returns EventClassification mit Category, Intent, Sentiment, etc.
   */
  async categorize(event: UserEvent): Promise<EventClassification> {
    try {
      // Check cache
      const cacheKey = this.getCacheKey(event);
      if (this.cache.has(cacheKey)) {
        this.logger.log(`Using cached classification for ${event.eventType}`);
        return this.cache.get(cacheKey);
      }

      // Build prompt
      const prompt = this.buildCategorizationPrompt(event);

      // Call GPT-4
      const response = await this.openai.chat.completions.create({
        model: this.configService.get<string>('OPENAI_MODEL', 'gpt-4o-mini'),
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(),
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3, // Low temperature for consistent results
        max_tokens: 200,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from GPT-4');
      }

      const classification: EventClassification = JSON.parse(content);

      // Validate classification
      this.validateClassification(classification);

      // Cache result
      this.cache.set(cacheKey, classification);

      this.logger.log(
        `Classified ${event.eventType}: ${classification.category} / ${classification.intent}`,
      );

      return classification;
    } catch (error) {
      this.logger.error(`Failed to categorize event: ${error.message}`);

      // Fallback to rule-based classification
      return this.ruleBasedClassification(event);
    }
  }

  /**
   * System prompt für GPT-4
   */
  private getSystemPrompt(): string {
    return `Du bist ein Experte für Nutzerverhalten-Analyse.
Kategorisiere User-Events präzise nach folgenden Kategorien:

Categories:
- learning: Wissensaufnahme, Queries, Dokumente lesen
- social: Soziale Interaktionen, Matches, Networking
- gaming: Spiele, Turniere, Wettbewerbe
- creative: Content-Erstellung, Bildgenerierung
- commerce: Käufe, Token-Transaktionen
- system: Login, Logout, technische Events
- wellness: Gesundheit, Cannabis-Empfehlungen

Intents:
- explore: Nutzer erkundet/sucht
- decide: Nutzer trifft Entscheidung
- create: Nutzer erstellt etwas
- connect: Nutzer verbindet sich mit anderen
- consume: Nutzer konsumiert Content
- transact: Nutzer kauft/verkauft

Sentiment:
- positive: Erfolgreiche/positive Aktion
- neutral: Neutrale Aktion
- negative: Fehler/Abbruch

Complexity:
- low: Einfache Aktion (z.B. Klick)
- medium: Moderate Aktion (z.B. Formular ausfüllen)
- high: Komplexe Aktion (z.B. Dokument erstellen)

Engagement Level: 1-10 (wie engagiert ist der Nutzer?)

Tags: Zusätzliche beschreibende Tags

Antworte immer als JSON mit diesem Format:
{
  "category": "learning",
  "intent": "explore",
  "sentiment": "positive",
  "complexity": "medium",
  "engagementLevel": 7,
  "tags": ["tag1", "tag2"]
}`;
  }

  /**
   * Baut Prompt für ein spezifisches Event
   */
  private buildCategorizationPrompt(event: UserEvent): string {
    return `
Analysiere folgende Nutzeraktion:

Event Type: ${event.eventType}
Metadata: ${JSON.stringify(event.metadata, null, 2)}
Source App: ${event.sourceApp || 'unknown'}

Kategorisiere dieses Event.
    `.trim();
  }

  /**
   * Validiert die Classification-Response
   */
  private validateClassification(classification: EventClassification): void {
    const validCategories = Object.values(EventCategory);
    const validIntents = Object.values(EventIntent);
    const validSentiments = ['positive', 'neutral', 'negative'];
    const validComplexities = ['low', 'medium', 'high'];

    if (!validCategories.includes(classification.category as EventCategory)) {
      throw new Error(`Invalid category: ${classification.category}`);
    }

    if (!validIntents.includes(classification.intent as EventIntent)) {
      throw new Error(`Invalid intent: ${classification.intent}`);
    }

    if (!validSentiments.includes(classification.sentiment)) {
      throw new Error(`Invalid sentiment: ${classification.sentiment}`);
    }

    if (!validComplexities.includes(classification.complexity)) {
      throw new Error(`Invalid complexity: ${classification.complexity}`);
    }

    if (
      classification.engagementLevel &&
      (classification.engagementLevel < 1 || classification.engagementLevel > 10)
    ) {
      throw new Error(
        `Invalid engagement level: ${classification.engagementLevel}`,
      );
    }
  }

  /**
   * Fallback: Rule-based classification ohne GPT-4
   */
  private ruleBasedClassification(event: UserEvent): EventClassification {
    this.logger.warn(`Using fallback rule-based classification for ${event.eventType}`);

    // Simple rule-based logic
    let category = event.category || EventCategory.SYSTEM;
    let intent = EventIntent.EXPLORE;

    // Map event types to categories
    if (event.eventType.includes('query') || event.eventType.includes('document')) {
      category = EventCategory.LEARNING;
      intent = EventIntent.EXPLORE;
    } else if (event.eventType.includes('match') || event.eventType.includes('profile')) {
      category = EventCategory.SOCIAL;
      intent = EventIntent.CONNECT;
    } else if (event.eventType.includes('game') || event.eventType.includes('tournament')) {
      category = EventCategory.GAMING;
      intent = EventIntent.CONSUME;
    } else if (event.eventType.includes('image') || event.eventType.includes('generate')) {
      category = EventCategory.CREATIVE;
      intent = EventIntent.CREATE;
    } else if (event.eventType.includes('tokens') || event.eventType.includes('purchase')) {
      category = EventCategory.COMMERCE;
      intent = EventIntent.TRANSACT;
    }

    return {
      category,
      intent,
      sentiment: 'neutral',
      complexity: 'medium',
      engagementLevel: 5,
      tags: [event.eventType],
    };
  }

  /**
   * Cache key basiert auf Event-Type und wichtigen Metadaten
   */
  private getCacheKey(event: UserEvent): string {
    // Simplified cache key - you might want to make this more sophisticated
    return `${event.eventType}`;
  }

  /**
   * Clears the cache (call periodically or when cache gets too large)
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.log('Classification cache cleared');
  }
}
