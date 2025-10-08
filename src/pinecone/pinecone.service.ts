import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pinecone } from '@pinecone-database/pinecone';
import { PineconeConfigService } from './pinecone-config.service';

export interface DocumentMetadata {
  source: string;
  page?: number;
  chunk_index: number;
  timestamp: string;
  total_chunks?: number;
  file?: string;
}

export interface QueryResult {
  id: string;
  score: number;
  metadata: DocumentMetadata;
  text: string;
}

@Injectable()
export class PineconeService implements OnModuleInit {
  private readonly logger = new Logger(PineconeService.name);
  private pinecone: Pinecone;
  private index: any;

  constructor(
    private configService: ConfigService,
    private pineconeConfigService: PineconeConfigService,
  ) {}

  async onModuleInit() {
    // Initialize Pinecone connection asynchronously without blocking app startup
    this.initializePinecone();
  }

  private async initializePinecone(): Promise<void> {
    try {
      // Validate configuration first
      const validation = this.pineconeConfigService.validateConfiguration();
      if (!validation.isValid) {
        this.logger.error('❌ Pinecone configuration invalid:');
        validation.errors.forEach(error => this.logger.error(`   - ${error}`));
        this.logger.log(this.pineconeConfigService.getSetupInstructions());
        this.logger.warn(
          '⚠️ Pinecone initialization failed. Application will start but Pinecone features will be unavailable.',
        );
        return;
      }

      const config = this.pineconeConfigService.getConfiguration();

      this.pinecone = new Pinecone({
        apiKey: config.apiKey,
      });

      this.index = this.pinecone.index(config.indexName);

      // Test connection
      try {
        const stats = await this.index.describeIndexStats();
        this.logger.log(`✅ Successfully connected to Pinecone index: ${config.indexName}`);
        this.logger.log(
          `📊 Index stats: ${stats.totalVectorCount || 0} vectors, ${stats.dimension} dimensions`,
        );
      } catch (testError) {
        this.logger.error(`❌ Pinecone connection test failed: ${testError.message}`);
        this.logger.error('Possible issues:');
        this.logger.error('  - Incorrect API key');
        this.logger.error('  - Wrong environment setting');
        this.logger.error('  - Index name does not exist');
        this.logger.error('  - Network connectivity issues');
        this.logger.log(this.pineconeConfigService.getSetupInstructions());
        this.logger.warn(
          '⚠️ Pinecone connection failed. Application will start but Pinecone features will be unavailable.',
        );
        this.pinecone = null;
        this.index = null;
      }
    } catch (error) {
      this.logger.error('Failed to initialize Pinecone:', error);
      this.logger.warn(
        '⚠️ Pinecone initialization failed. Application will start but Pinecone features will be unavailable.',
      );
      this.pinecone = null;
      this.index = null;
    }
  }

  async upsert(
    vectors: Array<{
      id: string;
      values: number[];
      metadata: DocumentMetadata & { text: string };
    }>,
  ): Promise<void> {
    if (!this.index) {
      throw new Error(
        'Pinecone index is not initialized. Check your configuration and ensure the service started successfully.',
      );
    }

    try {
      const startTime = Date.now();

      await this.index.upsert(vectors);

      const duration = Date.now() - startTime;
      this.logger.log(`Upserted ${vectors.length} vectors in ${duration}ms`);
    } catch (error) {
      this.logger.error('Failed to upsert vectors:', error);
      throw new Error(`Pinecone upsert failed: ${error.message}`);
    }
  }

  async query(
    vector: number[],
    topK: number = 5,
    filter?: Record<string, any>,
  ): Promise<QueryResult[]> {
    if (!this.index) {
      throw new Error(
        'Pinecone index is not initialized. Check your configuration and ensure the service started successfully.',
      );
    }

    try {
      const startTime = Date.now();

      const queryRequest: any = {
        vector,
        topK,
        includeMetadata: true,
      };

      if (filter) {
        queryRequest.filter = filter;
      }

      const response = await this.index.query(queryRequest);

      const duration = Date.now() - startTime;
      this.logger.log(
        `Query completed in ${duration}ms, found ${response.matches?.length || 0} matches`,
      );

      return (
        response.matches?.map(match => ({
          id: match.id,
          score: match.score,
          metadata: match.metadata as DocumentMetadata,
          text: match.metadata?.text || '',
        })) || []
      );
    } catch (error) {
      this.logger.error('Failed to query vectors:', error);
      throw new Error(`Pinecone query failed: ${error.message}`);
    }
  }

  async deleteBySource(source: string): Promise<void> {
    if (!this.index) {
      throw new Error(
        'Pinecone index is not initialized. Check your configuration and ensure the service started successfully.',
      );
    }

    try {
      const startTime = Date.now();

      await this.index.deleteMany({
        filter: { source: { $eq: source } },
      });

      const duration = Date.now() - startTime;
      this.logger.log(`Deleted vectors for source '${source}' in ${duration}ms`);
    } catch (error) {
      this.logger.error(`Failed to delete vectors for source '${source}':`, error);
      throw new Error(`Pinecone delete failed: ${error.message}`);
    }
  }

  async deleteById(id: string): Promise<void> {
    if (!this.index) {
      throw new Error(
        'Pinecone index is not initialized. Check your configuration and ensure the service started successfully.',
      );
    }

    try {
      await this.index.deleteOne(id);
      this.logger.log(`Deleted vector with id: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete vector with id '${id}':`, error);
      throw new Error(`Pinecone delete failed: ${error.message}`);
    }
  }

  async getStats(): Promise<any> {
    if (!this.index) {
      throw new Error(
        'Pinecone index is not initialized. Check your configuration and ensure the service started successfully.',
      );
    }

    try {
      const stats = await this.index.describeIndexStats();
      return stats;
    } catch (error) {
      this.logger.error('Failed to get index stats:', error);
      throw new Error(`Pinecone stats failed: ${error.message}`);
    }
  }
}
