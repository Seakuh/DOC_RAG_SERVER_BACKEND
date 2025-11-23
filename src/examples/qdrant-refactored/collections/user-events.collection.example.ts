import { Injectable } from '@nestjs/common';
import { BaseCollection } from './base.collection';
import { UserEvent } from '../../events/dto/user-event.dto';

/**
 * UserEventsCollection - Qdrant Collection für User Events
 *
 * Speichert alle User-Aktionen als Vektoren für:
 * - Verhaltensanalyse
 * - Similarity Search (ähnliche Nutzer finden)
 * - Pattern Recognition
 * - Personalisierung
 *
 * Usage:
 * ```typescript
 * await qdrantService.upsert('user-events', {
 *   id: event.id,
 *   data: event,
 * });
 * ```
 */
@Injectable()
export class UserEventsCollection extends BaseCollection {
  collectionName = 'user-events';
  vectorSize = 1536; // OpenAI text-embedding-3-small
  distance = 'Cosine' as const;

  /**
   * Build payload from UserEvent
   */
  buildPayload(event: UserEvent): Record<string, any> {
    return {
      userId: event.userId,
      eventType: event.eventType,
      category: event.category,
      intent: event.intent || null,
      timestamp: event.timestamp.toISOString(),
      sessionId: event.sessionId || null,
      sourceApp: event.sourceApp || 'unknown',

      // Metadata flattening for easier filtering
      ...(event.metadata?.query && { query: event.metadata.query }),
      ...(event.metadata?.documentId && {
        documentId: event.metadata.documentId,
      }),
      ...(event.metadata?.matchedUserId && {
        matchedUserId: event.metadata.matchedUserId,
      }),
    };
  }

  /**
   * Build search text for embedding
   */
  buildSearchText(event: UserEvent): string {
    const parts: string[] = [
      `User action: ${event.eventType}`,
      `Category: ${event.category}`,
    ];

    if (event.intent) {
      parts.push(`Intent: ${event.intent}`);
    }

    if (event.sourceApp) {
      parts.push(`Application: ${event.sourceApp}`);
    }

    // Add relevant metadata
    if (event.metadata) {
      if (event.metadata.query) {
        parts.push(`Query: "${event.metadata.query}"`);
      }

      if (event.metadata.documentName) {
        parts.push(`Document: ${event.metadata.documentName}`);
      }

      if (event.metadata.description) {
        parts.push(event.metadata.description);
      }
    }

    return parts.join('. ');
  }

  /**
   * Validate event before upserting
   */
  validate(event: UserEvent): void {
    if (!event.userId) {
      throw new Error('UserEvent must have userId');
    }

    if (!event.eventType) {
      throw new Error('UserEvent must have eventType');
    }

    if (!event.category) {
      throw new Error('UserEvent must have category');
    }
  }
}
