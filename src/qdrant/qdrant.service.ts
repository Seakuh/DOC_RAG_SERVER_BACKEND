import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';

export interface QdrantVector {
  id: string | number;
  vector: number[];
  payload?: Record<string, any>;
}

export interface QdrantSearchResult {
  id: string | number;
  score: number;
  payload?: Record<string, any>;
}

@Injectable()
export class QdrantService implements OnModuleInit {
  private readonly logger = new Logger(QdrantService.name);
  private client: QdrantClient;
  private readonly collectionName = 'cannabis-strains';

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.initializeQdrant();
  }

  private async initializeQdrant() {
    try {
      const apiKey = this.configService.get<string>('QDRANT_API_KEY');
      const apiUrl = this.configService.get<string>('QDRANT_API_URL');

      if (!apiKey || !apiUrl) {
        throw new Error('QDRANT_API_KEY and QDRANT_API_URL must be configured');
      }

      this.client = new QdrantClient({
        url: apiUrl,
        apiKey: apiKey,
      });

      this.logger.log('Qdrant client initialized successfully');
      await this.ensureCollection();
    } catch (error) {
      this.logger.error(`Failed to initialize Qdrant: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async ensureCollection() {
    try {
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(
        (collection) => collection.name === this.collectionName
      );

      if (!exists) {
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: 1536, // OpenAI text-embedding-3-small dimension
            distance: 'Cosine',
          },
        });
        this.logger.log(`Created collection: ${this.collectionName}`);
      } else {
        this.logger.log(`Collection ${this.collectionName} already exists`);
      }
    } catch (error) {
      this.logger.error(`Failed to ensure collection: ${error.message}`, error.stack);
      throw error;
    }
  }

  async upsertVectors(vectors: QdrantVector[], collectionName?: string): Promise<void> {
    const targetCollection = collectionName || this.collectionName;

    // Ensure collection exists
    await this.ensureCollectionExists(targetCollection);

    try {
      this.logger.log(`Preparing to upsert ${vectors.length} vectors to collection: ${targetCollection}`);

      const points = vectors.map((vector) => {
        // Validate vector data
        if (!vector.vector || !Array.isArray(vector.vector)) {
          throw new Error(`Invalid vector data for ID ${vector.id}`);
        }

        if (vector.vector.length !== 1536) {
          throw new Error(`Vector dimension mismatch for ID ${vector.id}: expected 1536, got ${vector.vector.length}`);
        }

        return {
          id: Number(vector.id), // Ensure ID is number
          vector: vector.vector,
          payload: vector.payload || {},
        };
      });

      this.logger.log(`First point validation: ${JSON.stringify({
        id: points[0]?.id,
        idType: typeof points[0]?.id,
        vectorLength: points[0]?.vector?.length,
        payloadKeys: Object.keys(points[0]?.payload || {})
      }, null, 2)}`);

      // Process in smaller batches to avoid timeouts
      const batchSize = 10;
      let totalUpserted = 0;

      for (let i = 0; i < points.length; i += batchSize) {
        const batch = points.slice(i, i + batchSize);

        this.logger.log(`Upserting batch ${Math.floor(i / batchSize) + 1}: ${batch.length} points`);

        const result = await this.client.upsert(targetCollection, {
          wait: true,
          points: batch,
        });

        totalUpserted += batch.length;
        this.logger.log(`Batch result: ${JSON.stringify(result)}`);
      }

      this.logger.log(`Successfully upserted ${totalUpserted} vectors to collection ${targetCollection}`);
    } catch (error) {
      this.logger.error(`Failed to upsert vectors: ${error.message}`);
      this.logger.error(`Error response: ${JSON.stringify(error.response || error)}`);
      this.logger.error(`Stack trace: ${error.stack}`);
      throw error;
    }
  }

  private async ensureCollectionExists(collectionName: string): Promise<void> {
    try {
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(
        (collection) => collection.name === collectionName
      );

      if (!exists) {
        await this.client.createCollection(collectionName, {
          vectors: {
            size: 1536, // OpenAI text-embedding-3-small dimension
            distance: 'Cosine',
          },
        });
        this.logger.log(`Created collection: ${collectionName}`);
      }
    } catch (error) {
      this.logger.error(`Failed to ensure collection exists: ${error.message}`, error.stack);
      throw error;
    }
  }

  async searchVectors(
    queryVector: number[],
    limit: number = 5,
    filter?: Record<string, any>
  ): Promise<QdrantSearchResult[]> {
    try {
      const searchRequest: any = {
        vector: queryVector,
        limit,
        with_payload: true,
      };

      if (filter) {
        searchRequest.filter = filter;
      }

      const searchResult = await this.client.search(this.collectionName, searchRequest);

      return searchResult.map((result) => ({
        id: result.id,
        score: result.score,
        payload: result.payload,
      }));
    } catch (error) {
      this.logger.error(`Failed to search vectors: ${error.message}`, error.stack);
      throw error;
    }
  }

  async deleteVector(id: string | number): Promise<void> {
    try {
      await this.client.delete(this.collectionName, {
        points: [id],
      });
      this.logger.log(`Deleted vector with id: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete vector: ${error.message}`, error.stack);
      throw error;
    }
  }

  async deleteCollection(): Promise<void> {
    try {
      await this.client.deleteCollection(this.collectionName);
      this.logger.log(`Deleted collection: ${this.collectionName}`);
    } catch (error) {
      this.logger.error(`Failed to delete collection: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getCollectionInfo(): Promise<any> {
    try {
      const info = await this.client.getCollection(this.collectionName);
      return info;
    } catch (error) {
      this.logger.error(`Failed to get collection info: ${error.message}`, error.stack);
      throw error;
    }
  }

  async vectorizeStrain(strain: any): Promise<QdrantVector> {
    const strainText = this.createStrainText(strain);

    // Note: This would require the embeddings service to generate the vector
    // For now, we'll assume the vector is provided
    return {
      id: strain._id || strain.id,
      vector: strain.vector, // This should come from embeddings service
      payload: {
        name: strain.name,
        type: strain.type,
        thc: strain.thc,
        cbd: strain.cbd,
        effects: strain.effects,
        description: strain.description,
        createdAt: new Date().toISOString(),
      },
    };
  }

  private createStrainText(strain: any): string {
    const parts = [
      `Cannabis strain: ${strain.name}`,
      `Type: ${strain.type}`,
      `Description: ${strain.description}`,
    ];

    if (strain.thc) parts.push(`THC: ${strain.thc}%`);
    if (strain.cbd) parts.push(`CBD: ${strain.cbd}%`);
    if (strain.effects?.length) parts.push(`Effects: ${strain.effects.join(', ')}`);
    if (strain.flavors?.length) parts.push(`Flavors: ${strain.flavors.join(', ')}`);

    return parts.join('. ');
  }
}