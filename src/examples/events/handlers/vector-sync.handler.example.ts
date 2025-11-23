import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserEvent } from '../dto/user-event.dto';
import { QdrantService } from '../../../qdrant/qdrant.service';
import { EmbeddingsService } from '../../../embeddings/embeddings.service';
import { EventCategorizerService } from '../../user-events/categorizers/event-categorizer.service';

/**
 * VectorSyncHandler - Synchronisiert Events zu Qdrant
 *
 * Dieser Handler vektorisiert User-Events und speichert sie in Qdrant
 * für spätere Similarity-Searches und Verhaltensanalyse.
 */
@Injectable()
export class VectorSyncHandler {
  private readonly logger = new Logger(VectorSyncHandler.name);

  constructor(
    private readonly qdrant: QdrantService,
    private readonly embeddings: EmbeddingsService,
    private readonly categorizer: EventCategorizerService,
  ) {}

  /**
   * Syncs all user events to Qdrant
   */
  @OnEvent('user.event', { async: true })
  async syncEventToVectorDB(event: UserEvent): Promise<void> {
    try {
      this.logger.log(
        `Syncing event to Qdrant: ${event.eventType} for user ${event.userId}`,
      );

      // 1. Kategorisiere Event (falls nicht schon geschehen)
      let classification = null;
      if (!event.intent) {
        classification = await this.categorizer.categorize(event);
        event.intent = classification.intent;
      }

      // 2. Erstelle Text-Repräsentation des Events
      const eventText = this.buildEventText(event);

      // 3. Generiere Embedding
      const vector = await this.embeddings.generateEmbedding(eventText);

      // 4. Speichere in Qdrant
      await this.qdrant.upsert('user-events', {
        id: event.id,
        vector,
        payload: {
          userId: event.userId,
          eventType: event.eventType,
          category: event.category,
          intent: event.intent,
          timestamp: event.timestamp.toISOString(),
          sessionId: event.sessionId,
          sourceApp: event.sourceApp,
          ...(classification && {
            sentiment: classification.sentiment,
            complexity: classification.complexity,
            engagementLevel: classification.engagementLevel,
          }),
        },
      });

      this.logger.log(`Event synced to Qdrant: ${event.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to sync event to Qdrant: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Builds a text representation of the event for embedding
   */
  private buildEventText(event: UserEvent): string {
    const parts: string[] = [
      `User action: ${event.eventType}`,
      `Category: ${event.category}`,
    ];

    if (event.intent) {
      parts.push(`Intent: ${event.intent}`);
    }

    if (event.sourceApp) {
      parts.push(`From app: ${event.sourceApp}`);
    }

    // Add relevant metadata
    if (event.metadata) {
      if (event.metadata.query) {
        parts.push(`Query: ${event.metadata.query}`);
      }
      if (event.metadata.documentName) {
        parts.push(`Document: ${event.metadata.documentName}`);
      }
      if (event.metadata.matchedUserId) {
        parts.push(`Matched with user: ${event.metadata.matchedUserId}`);
      }
      // Add more relevant metadata fields as needed
    }

    return parts.join('. ');
  }

  /**
   * Handles high-engagement events separately
   */
  @OnEvent('user.category.learning', { async: true })
  async handleLearningEventSync(event: UserEvent): Promise<void> {
    // Spezielle Behandlung für Learning-Events
    // z.B. höheres Gewicht, zusätzliche Metadaten, etc.
    this.logger.log(`High-priority sync for learning event: ${event.id}`);
  }
}
