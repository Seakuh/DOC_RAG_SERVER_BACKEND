import { ApiProperty } from '@nestjs/swagger';

export interface CogneeEntity {
  id: string;
  name: string;
  type: string;
  properties: Record<string, any>;
  confidence: number;
}

export interface CogneeRelationship {
  id: string;
  sourceEntity: string;
  targetEntity: string;
  relationshipType: string;
  properties: Record<string, any>;
  confidence: number;
}

export interface CogneeChunk {
  id: string;
  content: string;
  startIndex: number;
  endIndex: number;
  metadata: Record<string, any>;
}

export class CogneeUploadResponse {
  @ApiProperty({ description: 'Unique identifier for the uploaded data', example: 'cognee-uuid-123' })
  id: string;

  @ApiProperty({ description: 'Status of the upload operation', example: 'success' })
  status: 'success' | 'error' | 'processing';

  @ApiProperty({ description: 'Human-readable message about the operation' })
  message: string;

  @ApiProperty({ description: 'Number of entities extracted', example: 15 })
  entitiesCount?: number;

  @ApiProperty({ description: 'Number of relationships created', example: 8 })
  relationshipsCount?: number;

  @ApiProperty({ description: 'Number of text chunks created', example: 5 })
  chunksCount?: number;

  @ApiProperty({ description: 'Processing time in milliseconds', example: 2500 })
  processingTime?: number;

  @ApiProperty({ description: 'Extracted entities from the data' })
  entities?: CogneeEntity[];

  @ApiProperty({ description: 'Created relationships between entities' })
  relationships?: CogneeRelationship[];

  @ApiProperty({ description: 'Text chunks created from the data' })
  chunks?: CogneeChunk[];

  @ApiProperty({ description: 'Timestamp of when the data was processed' })
  timestamp: string;
}

export class CogneeQueryResponse {
  @ApiProperty({ description: 'Query results', example: [] })
  results: any[];

  @ApiProperty({ description: 'Total number of results found', example: 10 })
  totalResults: number;

  @ApiProperty({ description: 'Query execution time in milliseconds', example: 150 })
  executionTime: number;

  @ApiProperty({ description: 'Status of the query', example: 'success' })
  status: 'success' | 'error';

  @ApiProperty({ description: 'Additional metadata about the query' })
  metadata?: Record<string, any>;
}

export class CogneeHealthResponse {
  @ApiProperty({ description: 'Service health status', example: 'healthy' })
  status: 'healthy' | 'unhealthy' | 'degraded';

  @ApiProperty({ description: 'Health check message' })
  message: string;

  @ApiProperty({ description: 'Cognee API connection status', example: true })
  cogneeApiConnected: boolean;

  @ApiProperty({ description: 'Response time in milliseconds', example: 45 })
  responseTime: number;

  @ApiProperty({ description: 'Timestamp of the health check' })
  timestamp: string;

  @ApiProperty({ description: 'Additional service information' })
  details?: {
    version?: string;
    uptime?: number;
    totalDataSets?: number;
    totalEntities?: number;
  };
}