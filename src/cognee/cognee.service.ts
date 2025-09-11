import { Injectable, Logger, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { UploadDataDto } from './dto/upload-data.dto';
import { CogneeUploadResponse, CogneeQueryResponse, CogneeHealthResponse } from './dto/cognee-response.dto';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CogneeService {
  private readonly logger = new Logger(CogneeService.name);
  private readonly httpClient: AxiosInstance;
  private readonly cogneeApiKey: string;
  private readonly cogneeBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.cogneeApiKey = this.configService.get<string>('COGNEE_API_KEY');
    this.cogneeBaseUrl = this.configService.get<string>('COGNEE_BASE_URL', 'https://api.cognee.ai/v1');

    if (!this.cogneeApiKey) {
      this.logger.warn('COGNEE_API_KEY not found in environment variables');
    }

    // Initialize HTTP client for Cognee API
    this.httpClient = axios.create({
      baseURL: this.cogneeBaseUrl,
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${this.cogneeApiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'NestJS-Cognee-Client/1.0.0'
      }
    });

    // Add request/response interceptors for logging
    this.httpClient.interceptors.request.use(
      (config) => {
        this.logger.debug(`Making request to Cognee API: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        this.logger.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    this.httpClient.interceptors.response.use(
      (response) => {
        this.logger.debug(`Cognee API response: ${response.status} ${response.statusText}`);
        return response;
      },
      (error) => {
        this.logger.error(`Cognee API error: ${error.response?.status} ${error.response?.statusText}`);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Upload and process data to Cognee knowledge graph
   */
  async uploadData(uploadDataDto: UploadDataDto): Promise<CogneeUploadResponse> {
    try {
      const startTime = Date.now();
      this.logger.log(`Uploading data to Cognee: ${uploadDataDto.title || 'Untitled'}`);

      // Since Cognee is primarily Python-based, we simulate the API call
      // In a real implementation, this would call the actual Cognee API
      const response = await this.simulateCogneeUpload(uploadDataDto);
      
      const processingTime = Date.now() - startTime;
      this.logger.log(`Successfully processed data in Cognee (${processingTime}ms)`);

      return {
        id: response.id,
        status: 'success',
        message: `Data successfully uploaded and processed in Cognee knowledge graph`,
        entitiesCount: response.entitiesCount || 0,
        relationshipsCount: response.relationshipsCount || 0,
        chunksCount: response.chunksCount || 0,
        processingTime,
        entities: response.entities || [],
        relationships: response.relationships || [],
        chunks: response.chunks || [],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Failed to upload data to Cognee: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to process data in Cognee: ${error.message}`);
    }
  }

  /**
   * Upload text file to Cognee
   */
  async uploadTextFile(file: Express.Multer.File, metadata?: any): Promise<CogneeUploadResponse> {
    try {
      this.logger.log(`Uploading text file to Cognee: ${file.originalname}`);

      // Read file content from buffer (file is stored in memory)
      const content = file.buffer ? file.buffer.toString('utf-8') : 
                      require('fs').readFileSync(file.path, 'utf-8');
      
      // Create upload DTO
      const uploadDto: UploadDataDto = {
        content,
        dataType: file.mimetype === 'text/plain' ? 'text' as any : 'document' as any,
        title: file.originalname,
        metadata: {
          source: 'file_upload',
          author: metadata?.author,
          tags: metadata?.tags || [],
          createdAt: new Date().toISOString(),
          additionalData: {
            originalFilename: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype
          }
        }
      };

      return await this.uploadData(uploadDto);
    } catch (error) {
      this.logger.error(`Failed to upload text file: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to upload text file: ${error.message}`);
    }
  }

  /**
   * Query the Cognee knowledge graph
   */
  async queryKnowledgeGraph(query: string, limit: number = 10): Promise<CogneeQueryResponse> {
    try {
      const startTime = Date.now();
      this.logger.log(`Querying Cognee knowledge graph: "${query.substring(0, 50)}..."`);

      // Simulate knowledge graph query
      const results = await this.simulateCogneeQuery(query, limit);
      
      const executionTime = Date.now() - startTime;

      return {
        results: results,
        totalResults: results.length,
        executionTime,
        status: 'success',
        metadata: {
          query,
          limit,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error(`Failed to query Cognee knowledge graph: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to query knowledge graph: ${error.message}`);
    }
  }

  /**
   * Get health status of Cognee service
   */
  async getHealthStatus(): Promise<CogneeHealthResponse> {
    try {
      const startTime = Date.now();
      
      // Try to ping Cognee API (simulated)
      const isConnected = await this.pingCogneeApi();
      const responseTime = Date.now() - startTime;

      return {
        status: isConnected ? 'healthy' : 'unhealthy',
        message: isConnected ? 'Cognee service is operational' : 'Cannot connect to Cognee API',
        cogneeApiConnected: isConnected,
        responseTime,
        timestamp: new Date().toISOString(),
        details: {
          version: '1.0.0',
          uptime: process.uptime(),
          totalDataSets: await this.getTotalDataSets(),
          totalEntities: await this.getTotalEntities()
        }
      };
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`, error.stack);
      return {
        status: 'unhealthy',
        message: `Health check failed: ${error.message}`,
        cogneeApiConnected: false,
        responseTime: 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get statistics about stored data in Cognee
   */
  async getStatistics(): Promise<any> {
    try {
      return {
        totalDataSets: await this.getTotalDataSets(),
        totalEntities: await this.getTotalEntities(),
        totalRelationships: await this.getTotalRelationships(),
        dataTypeDistribution: await this.getDataTypeDistribution(),
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Failed to get statistics: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to get statistics: ${error.message}`);
    }
  }

  // Private helper methods (simulated implementations)

  private async simulateCogneeUpload(uploadDataDto: UploadDataDto): Promise<any> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));

    const words = uploadDataDto.content.split(' ');
    const entities = this.extractMockEntities(uploadDataDto.content);
    const relationships = this.createMockRelationships(entities);
    const chunks = this.createMockChunks(uploadDataDto.content);

    return {
      id: uuidv4(),
      entitiesCount: entities.length,
      relationshipsCount: relationships.length,
      chunksCount: chunks.length,
      entities,
      relationships,
      chunks
    };
  }

  private async simulateCogneeQuery(query: string, limit: number): Promise<any[]> {
    // Simulate query processing
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 200));

    // Return mock results based on query
    return [
      {
        id: uuidv4(),
        type: 'entity',
        name: 'Cannabis Research',
        properties: {
          description: 'Research findings about cannabis effects',
          confidence: 0.95
        },
        relevanceScore: 0.87
      },
      {
        id: uuidv4(),
        type: 'relationship',
        source: 'THC',
        target: 'Psychoactive Effects',
        relationshipType: 'CAUSES',
        properties: {
          strength: 'strong',
          confidence: 0.92
        },
        relevanceScore: 0.83
      }
    ].slice(0, limit);
  }

  private async pingCogneeApi(): Promise<boolean> {
    try {
      // Simulate API ping - in real implementation, this would make an actual HTTP request
      await new Promise(resolve => setTimeout(resolve, 100));
      return Math.random() > 0.1; // 90% success rate simulation
    } catch {
      return false;
    }
  }

  private extractMockEntities(content: string): any[] {
    const entities = [];
    const words = content.toLowerCase().split(' ');
    
    // Look for common cannabis-related entities
    const entityPatterns = [
      { pattern: /cannabis|marijuana|weed/g, type: 'Substance' },
      { pattern: /thc|cbd|cbg|cbn/g, type: 'Compound' },
      { pattern: /indica|sativa|hybrid/g, type: 'StrainType' },
      { pattern: /terpene|myrcene|limonene|pinene/g, type: 'Terpene' },
      { pattern: /anxiety|depression|pain|stress/g, type: 'Symptom' }
    ];

    entityPatterns.forEach(({ pattern, type }) => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          entities.push({
            id: uuidv4(),
            name: match,
            type,
            properties: { confidence: Math.random() * 0.3 + 0.7 },
            confidence: Math.random() * 0.3 + 0.7
          });
        });
      }
    });

    return entities.slice(0, 10); // Limit to 10 entities
  }

  private createMockRelationships(entities: any[]): any[] {
    const relationships = [];
    
    for (let i = 0; i < entities.length - 1; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        if (Math.random() > 0.7) { // 30% chance of relationship
          relationships.push({
            id: uuidv4(),
            sourceEntity: entities[i].id,
            targetEntity: entities[j].id,
            relationshipType: this.getRandomRelationshipType(),
            properties: { strength: Math.random() },
            confidence: Math.random() * 0.3 + 0.6
          });
        }
      }
    }

    return relationships;
  }

  private createMockChunks(content: string): any[] {
    const chunks = [];
    const chunkSize = 200;
    
    for (let i = 0; i < content.length; i += chunkSize) {
      chunks.push({
        id: uuidv4(),
        content: content.substring(i, i + chunkSize),
        startIndex: i,
        endIndex: Math.min(i + chunkSize, content.length),
        metadata: {
          chunkIndex: chunks.length,
          wordCount: content.substring(i, i + chunkSize).split(' ').length
        }
      });
    }

    return chunks;
  }

  private getRandomRelationshipType(): string {
    const types = ['RELATED_TO', 'CONTAINS', 'CAUSES', 'TREATS', 'INTERACTS_WITH', 'PART_OF'];
    return types[Math.floor(Math.random() * types.length)];
  }

  private async getTotalDataSets(): Promise<number> {
    return Math.floor(Math.random() * 100) + 50;
  }

  private async getTotalEntities(): Promise<number> {
    return Math.floor(Math.random() * 1000) + 500;
  }

  private async getTotalRelationships(): Promise<number> {
    return Math.floor(Math.random() * 2000) + 1000;
  }

  private async getDataTypeDistribution(): Promise<Record<string, number>> {
    return {
      text: Math.floor(Math.random() * 50) + 20,
      document: Math.floor(Math.random() * 30) + 10,
      url: Math.floor(Math.random() * 20) + 5,
      structured: Math.floor(Math.random() * 15) + 5
    };
  }
}