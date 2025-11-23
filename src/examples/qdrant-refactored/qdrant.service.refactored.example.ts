import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import { BaseCollection } from './collections/base.collection';

/**
 * REFACTORED QdrantService - Generic Multi-Collection Service
 *
 * Dieser Service ersetzt den aktuellen QdrantService und ist nicht
 * auf eine spezifische Collection fixiert.
 *
 * Vorteile:
 * - Generic: Funktioniert mit beliebigen Collections
 * - DRY: Keine Code-Duplikation mehr (wie in PersonalityService)
 * - Type-Safe: Nutzt Collection-Klassen für Type Safety
 * - Skalierbar: Neue Collections einfach hinzufügbar
 *
 * Migration von altem Service:
 * 1. Erstelle Collection-Klasse (extends BaseCollection)
 * 2. Registriere in Module: { provide: 'QDRANT_COLLECTIONS', useValue: [MyCollection] }
 * 3. Nutze qdrantService.upsert('collection-name', data)
 */
@Injectable()
export class QdrantService implements OnModuleInit {
  private readonly logger = new Logger(QdrantService.name);
  private client: QdrantClient;
  private collections: Map<string, BaseCollection> = new Map();
  private qdrantAvailable = false;

  constructor(
    private readonly configService: ConfigService,
    @Inject('QDRANT_COLLECTIONS') private collectionClasses: BaseCollection[],
  ) {}

  async onModuleInit() {
    await this.initializeQdrant();
    await this.ensureAllCollections();
  }

  /**
   * Initialize Qdrant client
   */
  private async initializeQdrant() {
    try {
      const apiKey = this.configService.get<string>('QDRANT_API_KEY');
      const apiUrl = this.configService.get<string>(
        'QDRANT_API_URL',
        'http://localhost:6333',
      );

      if (!apiKey) {
        this.logger.warn('QDRANT_API_KEY not set - using without authentication');
      }

      this.client = new QdrantClient({
        url: apiUrl,
        ...(apiKey && { apiKey }),
      });

      this.logger.log('Qdrant client initialized successfully');
      this.qdrantAvailable = true;

      // Register all collection classes
      this.collectionClasses.forEach(collection => {
        this.collections.set(collection.collectionName, collection);
        this.logger.log(`Registered collection: ${collection.collectionName}`);
      });
    } catch (error) {
      this.logger.error(`Failed to initialize Qdrant: ${error.message}`);
      this.qdrantAvailable = false;
    }
  }

  /**
   * Ensure all registered collections exist
   */
  private async ensureAllCollections() {
    if (!this.qdrantAvailable) return;

    try {
      const existingCollections = await this.client.getCollections();
      const existingNames = existingCollections.collections.map(c => c.name);

      for (const [name, collection] of this.collections) {
        if (!existingNames.includes(name)) {
          await this.createCollection(collection);
          this.logger.log(`Created collection: ${name}`);
        } else {
          this.logger.log(`Collection ${name} already exists`);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to ensure collections: ${error.message}`);
    }
  }

  /**
   * Create a collection
   */
  private async createCollection(collection: BaseCollection) {
    await this.client.createCollection(collection.collectionName, {
      vectors: {
        size: collection.vectorSize,
        distance: collection.distance,
      },
    });
  }

  /**
   * Upsert vectors to a collection
   *
   * @example
   * await qdrant.upsert('user-events', {
   *   id: 'event-123',
   *   data: eventData,
   * });
   */
  async upsert(
    collectionName: string,
    options: {
      id: string | number;
      data?: any;
      vector?: number[];
      payload?: Record<string, any>;
    },
  ): Promise<void> {
    this.checkAvailability();
    const collection = this.getCollection(collectionName);

    try {
      let vector = options.vector;
      let payload = options.payload;

      // If vector not provided, build it from data
      if (!vector && options.data) {
        const text = collection.buildSearchText(options.data);
        vector = await collection.generateEmbedding(text);
      }

      // If payload not provided, build it from data
      if (!payload && options.data) {
        payload = collection.buildPayload(options.data);
      }

      if (!vector) {
        throw new Error('Vector or data must be provided');
      }

      await this.client.upsert(collectionName, {
        wait: true,
        points: [
          {
            id: options.id,
            vector,
            payload: payload || {},
          },
        ],
      });

      this.logger.log(`Upserted to ${collectionName}: ${options.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to upsert to ${collectionName}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Batch upsert vectors
   */
  async upsertBatch(
    collectionName: string,
    items: Array<{
      id: string | number;
      data?: any;
      vector?: number[];
      payload?: Record<string, any>;
    }>,
  ): Promise<void> {
    this.checkAvailability();
    const collection = this.getCollection(collectionName);

    try {
      const points = await Promise.all(
        items.map(async item => {
          let vector = item.vector;
          let payload = item.payload;

          if (!vector && item.data) {
            const text = collection.buildSearchText(item.data);
            vector = await collection.generateEmbedding(text);
          }

          if (!payload && item.data) {
            payload = collection.buildPayload(item.data);
          }

          return {
            id: item.id,
            vector,
            payload: payload || {},
          };
        }),
      );

      // Process in batches
      const batchSize = 10;
      for (let i = 0; i < points.length; i += batchSize) {
        const batch = points.slice(i, i + batchSize);
        await this.client.upsert(collectionName, {
          wait: true,
          points: batch,
        });
        this.logger.log(
          `Upserted batch ${Math.floor(i / batchSize) + 1} to ${collectionName}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to batch upsert to ${collectionName}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Search vectors
   *
   * @example
   * const results = await qdrant.search('user-events', {
   *   vector: [0.1, 0.2, ...],
   *   limit: 10,
   *   filter: { userId: 'user-123' },
   * });
   */
  async search(
    collectionName: string,
    options: {
      vector?: number[];
      text?: string;
      limit?: number;
      filter?: any;
      withPayload?: boolean;
      withVector?: boolean;
    },
  ): Promise<any[]> {
    this.checkAvailability();
    const collection = this.getCollection(collectionName);

    try {
      let vector = options.vector;

      // If vector not provided but text is, generate embedding
      if (!vector && options.text) {
        vector = await collection.generateEmbedding(options.text);
      }

      if (!vector) {
        throw new Error('Vector or text must be provided');
      }

      const searchRequest: any = {
        vector,
        limit: options.limit || 10,
        with_payload: options.withPayload !== false,
        with_vector: options.withVector || false,
      };

      if (options.filter) {
        searchRequest.filter = this.buildFilter(options.filter);
      }

      const results = await this.client.search(collectionName, searchRequest);

      return results.map(result => ({
        id: result.id,
        score: result.score,
        payload: result.payload,
        vector: result.vector,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to search ${collectionName}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Delete a vector
   */
  async delete(collectionName: string, id: string | number): Promise<void> {
    this.checkAvailability();

    try {
      await this.client.delete(collectionName, {
        points: [id],
      });
      this.logger.log(`Deleted from ${collectionName}: ${id}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete from ${collectionName}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Get collection info
   */
  async getCollectionInfo(collectionName: string): Promise<any> {
    this.checkAvailability();

    try {
      return await this.client.getCollection(collectionName);
    } catch (error) {
      this.logger.error(
        `Failed to get collection info for ${collectionName}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Scroll through collection (for batch processing)
   */
  async scroll(
    collectionName: string,
    options?: {
      limit?: number;
      offset?: string | number;
      filter?: any;
      withPayload?: boolean;
      withVector?: boolean;
    },
  ): Promise<any> {
    this.checkAvailability();

    try {
      const scrollRequest: any = {
        limit: options?.limit || 100,
        with_payload: options?.withPayload !== false,
        with_vector: options?.withVector || false,
      };

      if (options?.offset) {
        scrollRequest.offset = options.offset;
      }

      if (options?.filter) {
        scrollRequest.filter = this.buildFilter(options.filter);
      }

      return await this.client.scroll(collectionName, scrollRequest);
    } catch (error) {
      this.logger.error(
        `Failed to scroll ${collectionName}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Build Qdrant filter from simple object
   */
  private buildFilter(filter: Record<string, any>): any {
    const must: any[] = [];

    Object.entries(filter).forEach(([key, value]) => {
      must.push({
        key,
        match: { value },
      });
    });

    return { must };
  }

  /**
   * Get collection by name
   */
  private getCollection(name: string): BaseCollection {
    const collection = this.collections.get(name);
    if (!collection) {
      throw new Error(
        `Collection ${name} not registered. Available: ${Array.from(this.collections.keys()).join(', ')}`,
      );
    }
    return collection;
  }

  /**
   * Check if Qdrant is available
   */
  private checkAvailability(): void {
    if (!this.qdrantAvailable) {
      throw new Error(
        'Qdrant service is not available. Please ensure Qdrant is running.',
      );
    }
  }

  /**
   * Health check
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.client.getCollections();
      return true;
    } catch {
      return false;
    }
  }
}
