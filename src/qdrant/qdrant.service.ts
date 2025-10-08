import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient, QdrantClientParams } from '@qdrant/js-client-rest';

export type QdrantDocumentMetadata = {
  source: string;
  page?: number;
  chunk_index: number;
  timestamp: string;
  total_chunks?: number;
  file?: string;
  text?: string;
} & Record<string, any>;

export interface QdrantQueryResult {
  id: string;
  score: number;
  metadata: QdrantDocumentMetadata;
  text: string;
}

@Injectable()
export class QdrantService implements OnModuleInit {
  private readonly logger = new Logger(QdrantService.name);
  private client: QdrantClient | null = null;
  private readonly collectionName: string;
  private collectionReady = false;
  private vectorSize: number | null = null;
  private readonly defaultVectorSize: number | null;

  constructor(private readonly configService: ConfigService) {
    this.collectionName = this.configService.get<string>('QDRANT_COLLECTION', 'rag_collection');
    this.defaultVectorSize = this.parseNumber(
      this.configService.get<string | number>('QDRANT_VECTOR_SIZE'),
    );
  }

  async onModuleInit(): Promise<void> {
    await this.initializeClient();
  }

  private async initializeClient(): Promise<void> {
    try {
      const url = this.configService.get<string>('QDRANT_URL', 'http://localhost:6333');
      const apiKey = this.configService.get<string>('QDRANT_API_KEY');

      const params: QdrantClientParams = { url };
      if (apiKey) {
        params.apiKey = apiKey;
      }

      this.client = new QdrantClient(params);

      await this.tryLoadExistingCollection();
    } catch (error) {
      this.logger.error('❌ Failed to initialize Qdrant client:', error);
      this.client = null;
    }
  }

  private async tryLoadExistingCollection(): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      const collection = await this.client.getCollection(this.collectionName);
      const size = (collection?.config?.params as any)?.vectors?.size;

      if (typeof size === 'number') {
        this.vectorSize = size;
      }

      this.collectionReady = true;
      this.logger.log(
        `✅ Connected to Qdrant collection '${this.collectionName}' (size: ${
          this.vectorSize ?? 'unknown'
        })`,
      );
    } catch (error: any) {
      if (this.isNotFoundError(error)) {
        this.logger.warn(
          `⚠️ Qdrant collection '${this.collectionName}' not found. It will be created on first use.`,
        );
        return;
      }

      this.logger.error('❌ Failed to load Qdrant collection metadata:', error);
    }
  }

  private isNotFoundError(error: any): boolean {
    if (!error) {
      return false;
    }

    const status = error?.response?.status ?? error?.status;
    return status === 404;
  }

  private async ensureCollection(vectorLength?: number): Promise<void> {
    if (!this.client) {
      throw new Error('Qdrant client is not initialized. Check your configuration.');
    }

    if (!this.collectionReady) {
      await this.tryLoadExistingCollection();
    }

    if (this.collectionReady) {
      if (this.vectorSize && this.vectorSize !== vectorLength) {
        throw new Error(
          `Qdrant collection '${this.collectionName}' expects vectors of length ${this.vectorSize}, but received ${vectorLength}.`,
        );
      }
      return;
    }

    const targetSize = vectorLength ?? this.defaultVectorSize;

    if (!targetSize || targetSize <= 0) {
      throw new Error(
        `Qdrant collection '${this.collectionName}' is missing. Provide a valid QDRANT_VECTOR_SIZE or upsert at least one vector with values.`,
      );
    }

    const distance = this.configService.get<string>('QDRANT_DISTANCE', 'Cosine');
    const shardNumber = this.configService.get<number>('QDRANT_SHARD_NUMBER');
    const replicationFactor = this.configService.get<number>('QDRANT_REPLICATION_FACTOR');

    await this.client.createCollection(this.collectionName, {
      vectors: {
        size: targetSize,
        distance: distance as any,
      },
      ...(shardNumber ? { shard_number: shardNumber } : {}),
      ...(replicationFactor ? { replication_factor: replicationFactor } : {}),
    });

    this.collectionReady = true;
    this.vectorSize = targetSize;
    this.logger.log(
      `✅ Created Qdrant collection '${this.collectionName}' with vector size ${targetSize} (distance: ${distance})`,
    );
  }

  async upsert(
    vectors: Array<{
      id: string;
      values: number[];
      metadata: QdrantDocumentMetadata;
    }>,
  ): Promise<void> {
    if (!vectors?.length) {
      return;
    }

    if (!this.client) {
      throw new Error('Qdrant client is not initialized. Check your configuration.');
    }

    const vectorLength = vectors[0].values.length;
    await this.ensureCollection(vectorLength);

    try {
      const startTime = Date.now();

      await this.client.upsert(this.collectionName, {
        points: vectors.map(vector => ({
          id: vector.id,
          vector: vector.values,
          payload: vector.metadata,
        })),
      });

      const duration = Date.now() - startTime;
      this.logger.log(`Upserted ${vectors.length} vectors into Qdrant in ${duration}ms`);
    } catch (error) {
      this.logger.error('Failed to upsert vectors into Qdrant:', error);
      throw new Error(`Qdrant upsert failed: ${error.message ?? error}`);
    }
  }

  async upsertVectors(
    points: Array<{
      id: string | number;
      vector: number[];
      payload: Record<string, any>;
    }>,
  ): Promise<void> {
    if (!points?.length) {
      return;
    }

    if (!this.client) {
      throw new Error('Qdrant client is not initialized. Check your configuration.');
    }

    await this.ensureCollection(points[0].vector.length);

    try {
      await this.client.upsert(this.collectionName, {
        points: points.map(point => ({
          id: point.id,
          vector: point.vector,
          payload: point.payload,
        })),
      });
      this.logger.log(`Upserted ${points.length} vectors into Qdrant`);
    } catch (error) {
      this.logger.error('Failed to upsert vectors into Qdrant:', error);
      throw new Error(`Qdrant upsert failed: ${error.message ?? error}`);
    }
  }

  async query(
    vector: number[],
    topK: number = 5,
    filter?: Record<string, any>,
  ): Promise<QdrantQueryResult[]> {
    if (!this.client) {
      throw new Error('Qdrant client is not initialized. Check your configuration.');
    }

    await this.ensureCollection(vector.length);

    try {
      const startTime = Date.now();

      const request: any = {
        vector,
        limit: topK,
        with_payload: true,
        with_vector: false,
      };

      const qdrantFilter = this.transformFilter(filter);
      if (qdrantFilter) {
        request.filter = qdrantFilter;
      }

      const matches = await this.client.search(this.collectionName, request);

      const duration = Date.now() - startTime;
      this.logger.log(
        `Query completed against Qdrant in ${duration}ms, found ${matches?.length ?? 0} matches`,
      );

      return (
        matches?.map(match => ({
          id: String(match.id),
          score: match.score ?? 0,
          metadata: (match.payload as QdrantDocumentMetadata) ?? ({} as QdrantDocumentMetadata),
          text: (match.payload as any)?.text ?? '',
        })) ?? []
      );
    } catch (error) {
      this.logger.error('Failed to query Qdrant:', error);
      throw new Error(`Qdrant query failed: ${error.message ?? error}`);
    }
  }

  async searchVectors(
    vector: number[],
    topK: number = 5,
    filter?: Record<string, any>,
  ): Promise<
    Array<{
      id: string | number;
      score: number;
      payload?: Record<string, any> | null;
    }>
  > {
    if (!this.client) {
      throw new Error('Qdrant client is not initialized. Check your configuration.');
    }

    await this.ensureCollection(vector.length);

    const request: any = {
      vector,
      limit: topK,
      with_payload: true,
      with_vector: false,
    };

    if (filter) {
      request.filter = filter;
    }

    try {
      const results = await this.client.search(this.collectionName, request);
      return results;
    } catch (error) {
      this.logger.error('Failed to search vectors in Qdrant:', error);
      throw new Error(`Qdrant search failed: ${error.message ?? error}`);
    }
  }

  async deleteBySource(source: string): Promise<void> {
    if (!this.client) {
      throw new Error('Qdrant client is not initialized. Check your configuration.');
    }

    if (!this.collectionReady) {
      await this.tryLoadExistingCollection();
    }

    if (!this.collectionReady) {
      this.logger.warn(
        `Qdrant collection '${this.collectionName}' not found. Skipping deleteBySource.`,
      );
      return;
    }

    try {
      await this.client.delete(this.collectionName, {
        filter: {
          must: [
            {
              key: 'source',
              match: { value: source },
            },
          ],
        },
      });
      this.logger.log(`Deleted Qdrant vectors for source '${source}'`);
    } catch (error) {
      this.logger.error(`Failed to delete Qdrant vectors for source '${source}':`, error);
      throw new Error(`Qdrant delete failed: ${error.message ?? error}`);
    }
  }

  async deleteById(id: string): Promise<void> {
    if (!this.client) {
      throw new Error('Qdrant client is not initialized. Check your configuration.');
    }

    if (!this.collectionReady) {
      await this.tryLoadExistingCollection();
    }

    if (!this.collectionReady) {
      this.logger.warn(`Qdrant collection '${this.collectionName}' not found. Skipping deleteById.`);
      return;
    }

    try {
      await this.client.delete(this.collectionName, { points: [id] });
      this.logger.log(`Deleted Qdrant vector with id '${id}'`);
    } catch (error) {
      this.logger.error(`Failed to delete Qdrant vector with id '${id}':`, error);
      throw new Error(`Qdrant delete failed: ${error.message ?? error}`);
    }
  }

  async getStats(): Promise<any> {
    if (!this.client) {
      throw new Error('Qdrant client is not initialized. Check your configuration.');
    }

    if (!this.collectionReady) {
      await this.tryLoadExistingCollection();
    }

    if (!this.collectionReady) {
      throw new Error(
        `Qdrant collection '${this.collectionName}' not found. No stats available until a collection is created.`,
      );
    }

    try {
      const stats = await this.client.getCollection(this.collectionName);
      return stats;
    } catch (error) {
      this.logger.error('Failed to get Qdrant collection stats:', error);
      throw new Error(`Qdrant stats failed: ${error.message ?? error}`);
    }
  }

  async getCollectionInfo(): Promise<any> {
    if (!this.client) {
      throw new Error('Qdrant client is not initialized. Check your configuration.');
    }

    if (!this.collectionReady) {
      await this.tryLoadExistingCollection();
    }

    if (!this.collectionReady) {
      throw new Error(`Qdrant collection '${this.collectionName}' not found.`);
    }

    try {
      return await this.client.getCollection(this.collectionName);
    } catch (error) {
      this.logger.error('Failed to fetch Qdrant collection info:', error);
      throw new Error(`Qdrant collection info failed: ${error.message ?? error}`);
    }
  }

  private transformFilter(filter?: Record<string, any>) {
    if (!filter || Object.keys(filter).length === 0) {
      return undefined;
    }

    const must: any[] = [];

    Object.entries(filter).forEach(([key, condition]) => {
      if (condition && typeof condition === 'object') {
        if ('$eq' in condition) {
          must.push({ key, match: { value: condition.$eq } });
        } else if ('$in' in condition) {
          must.push({ key, match: { any: condition.$in } });
        }
      }
    });

    if (!must.length) {
      return undefined;
    }

    return { must };
  }

  private parseNumber(value: string | number | undefined | null): number | null {
    if (value === undefined || value === null) {
      return null;
    }

    const parsed =
      typeof value === 'number'
        ? value
        : Number(String(value).trim());

    return Number.isFinite(parsed) ? parsed : null;
  }
}
