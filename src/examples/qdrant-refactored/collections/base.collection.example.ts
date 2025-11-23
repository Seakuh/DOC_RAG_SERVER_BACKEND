import { Injectable } from '@nestjs/common';
import { EmbeddingsService } from '../../../embeddings/embeddings.service';

/**
 * BaseCollection - Abstract class für alle Qdrant Collections
 *
 * Jede Collection muss diese Klasse extenden und die abstrakten Methoden implementieren.
 * Dies sorgt für:
 * - Konsistente Collection-Konfiguration
 * - Type-Safe Payload-Building
 * - Wiederverwendbare Embedding-Logik
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class UserEventsCollection extends BaseCollection {
 *   collectionName = 'user-events';
 *   vectorSize = 1536;
 *   distance = 'Cosine' as const;
 *
 *   buildPayload(event: UserEvent) {
 *     return {
 *       userId: event.userId,
 *       eventType: event.eventType,
 *       category: event.category,
 *       timestamp: event.timestamp.toISOString(),
 *     };
 *   }
 *
 *   buildSearchText(event: UserEvent): string {
 *     return `User action: ${event.eventType}. Category: ${event.category}`;
 *   }
 * }
 * ```
 */
@Injectable()
export abstract class BaseCollection {
  /**
   * Name of the collection in Qdrant
   */
  abstract collectionName: string;

  /**
   * Size of the embedding vectors
   * Default: 1536 (OpenAI text-embedding-3-small)
   */
  abstract vectorSize: number;

  /**
   * Distance metric
   */
  abstract distance: 'Cosine' | 'Euclid' | 'Dot';

  /**
   * Embeddings service for generating vectors
   */
  protected embeddingsService: EmbeddingsService;

  /**
   * Set embeddings service (injected by QdrantService)
   */
  setEmbeddingsService(service: EmbeddingsService): void {
    this.embeddingsService = service;
  }

  /**
   * Build payload for Qdrant from data
   *
   * This method should extract relevant fields from your data
   * and return them as a flat object for Qdrant payload.
   *
   * @param data - Your domain object (Event, Profile, Document, etc.)
   * @returns Flat object for Qdrant payload
   */
  abstract buildPayload(data: any): Record<string, any>;

  /**
   * Build search text for embedding generation
   *
   * This method should create a meaningful text representation
   * of your data that will be used to generate the embedding vector.
   *
   * @param data - Your domain object
   * @returns Text for embedding
   */
  abstract buildSearchText(data: any): string;

  /**
   * Generate embedding for text
   *
   * Uses the injected EmbeddingsService to generate vector.
   * Override if you need custom embedding logic.
   *
   * @param text - Text to embed
   * @returns Embedding vector
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.embeddingsService) {
      throw new Error('EmbeddingsService not set on collection');
    }
    return this.embeddingsService.generateEmbedding(text);
  }

  /**
   * Optional: Custom validation for data before upserting
   */
  validate(data: any): void {
    // Override in subclass if needed
  }

  /**
   * Optional: Transform search results
   */
  transformResult(result: any): any {
    // Override in subclass if needed
    return result;
  }
}
