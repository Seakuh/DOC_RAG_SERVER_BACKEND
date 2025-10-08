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
  private readonly autoRecreate: boolean;

  constructor(private readonly configService: ConfigService) {
    this.collectionName = this.configService.get<string>('QDRANT_COLLECTION', 'rag_collection');
    this.defaultVectorSize = this.parseNumber(
      this.configService.get<string | number>('QDRANT_VECTOR_SIZE'),
    );
    this.autoRecreate = this.parseBoolean(
      this.configService.get<string | boolean>('QDRANT_AUTO_RECREATE', false),
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
        const message = `Qdrant collection '${this.collectionName}' expects vectors of length ${this.vectorSize}, but received ${vectorLength}.`;
        if (!this.autoRecreate) {
          throw new Error(message);
        }

        this.logger.warn(`${message} Recreating collection because QDRANT_AUTO_RECREATE=true.`);
        await this.safeDeleteCollection();
        this.collectionReady = false;
        this.vectorSize = null;
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
    if (!vectors.every(v => v.values.length === vectorLength)) {
      throw new Error('All vectors must have the same dimensionality before upsert.');
    }
    if (!vectors.every(v => v.values.every(Number.isFinite))) {
      throw new Error('Encountered non-finite values in vectors before upsert.');
    }
    this.logger.debug(
      `Preparing Qdrant upsert for ${vectors.length} vectors (dimension=${vectorLength})`,
    );
    await this.ensureCollection(vectorLength);

    try {
      const startTime = Date.now();

      await this.client.upsert(this.collectionName, {
        points: vectors.map(vector => ({
          id: vector.id,
          vector: vector.values,
          payload: { ...vector.metadata },
        })),
      });

      const duration = Date.now() - startTime;
      this.logger.log(`Upserted ${vectors.length} vectors into Qdrant in ${duration}ms`);
    } catch (error) {
      const details = this.extractErrorDetails(error);
      this.logger.error('Failed to upsert vectors into Qdrant:', details);
      throw new Error(`Qdrant upsert failed: ${details.message}`);
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
          payload: { ...point.payload },
        })),
      });
      this.logger.log(`Upserted ${points.length} vectors into Qdrant`);
    } catch (error) {
      const details = this.extractErrorDetails(error);
      this.logger.error('Failed to upsert vectors into Qdrant:', details);
      throw new Error(`Qdrant upsert failed: ${details.message}`);
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
      const details = this.extractErrorDetails(error);
      this.logger.error('Failed to query Qdrant:', details);
      throw new Error(`Qdrant query failed: ${details.message}`);
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
      const details = this.extractErrorDetails(error);
      this.logger.error('Failed to search vectors in Qdrant:', details);
      throw new Error(`Qdrant search failed: ${details.message}`);
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
      const details = this.extractErrorDetails(error);
      this.logger.error(`Failed to delete Qdrant vectors for source '${source}':`, details);
      throw new Error(`Qdrant delete failed: ${details.message}`);
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
      const details = this.extractErrorDetails(error);
      this.logger.error(`Failed to delete Qdrant vector with id '${id}':`, details);
      throw new Error(`Qdrant delete failed: ${details.message}`);
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
      const details = this.extractErrorDetails(error);
      this.logger.error('Failed to get Qdrant collection stats:', details);
      throw new Error(`Qdrant stats failed: ${details.message}`);
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
      const details = this.extractErrorDetails(error);
      this.logger.error('Failed to fetch Qdrant collection info:', details);
      throw new Error(`Qdrant collection info failed: ${details.message}`);
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

  private parseBoolean(value: string | boolean | undefined | null): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
    }
    return false;
  }

  private async safeDeleteCollection(): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      await this.client.deleteCollection(this.collectionName);
      this.logger.log(`Deleted Qdrant collection '${this.collectionName}' for recreation.`);
    } catch (error) {
      const details = this.extractErrorDetails(error);
      this.logger.error(`Failed to delete Qdrant collection '${this.collectionName}':`, details);
      throw new Error(`Qdrant delete collection failed: ${details.message}`);
    }
  }

  private extractErrorDetails(error: any): {
    message: string;
    status?: number;
    data?: any;
  } {
    const status = error?.response?.status ?? error?.status;
    const data = error?.response?.data ?? error?.data;

    let message = error?.message;

    if (!message && data) {
      if (typeof data === 'string') {
        message = data;
      } else if (typeof data === 'object') {
        message = data.status?.error || JSON.stringify(data);
      }
    }

    if (!message) {
      message = 'Unknown Qdrant error';
    }

    return { message, status, data };
  }
}
