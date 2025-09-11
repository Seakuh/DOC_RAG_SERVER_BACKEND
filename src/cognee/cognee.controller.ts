import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  Query, 
  UploadedFile, 
  UseInterceptors, 
  ValidationPipe, 
  Logger,
  BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBody, 
  ApiConsumes,
  ApiQuery
} from '@nestjs/swagger';
import { CogneeService } from './cognee.service';
import { UploadDataDto } from './dto/upload-data.dto';
import { CogneeUploadResponse, CogneeQueryResponse, CogneeHealthResponse } from './dto/cognee-response.dto';
import { diskStorage } from 'multer';
import { extname } from 'path';

@ApiTags('cognee')
@Controller('cognee')
export class CogneeController {
  private readonly logger = new Logger(CogneeController.name);

  constructor(private readonly cogneeService: CogneeService) {}

  @Post('upload/data')
  @ApiOperation({ 
    summary: 'Upload and process data in Cognee knowledge graph',
    description: 'Upload text data to Cognee for knowledge graph processing, entity extraction, and relationship mapping'
  })
  @ApiBody({ type: UploadDataDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Data successfully uploaded and processed',
    type: CogneeUploadResponse,
    example: {
      id: 'cognee-uuid-123',
      status: 'success',
      message: 'Data successfully uploaded and processed in Cognee knowledge graph',
      entitiesCount: 15,
      relationshipsCount: 8,
      chunksCount: 3,
      processingTime: 2500,
      timestamp: '2025-09-11T16:30:00.000Z'
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid data provided' })
  @ApiResponse({ status: 503, description: 'Cognee service unavailable' })
  async uploadData(
    @Body(new ValidationPipe()) uploadDataDto: UploadDataDto
  ): Promise<CogneeUploadResponse> {
    this.logger.log(`Processing data upload for Cognee: "${uploadDataDto.title || 'Untitled'}"`);
    return await this.cogneeService.uploadData(uploadDataDto);
  }

  @Post('upload/file')
  @UseInterceptors(FileInterceptor('file', {
    fileFilter: (req, file, callback) => {
      // Only allow text files and documents
      const allowedMimeTypes = [
        'text/plain',
        'text/csv',
        'application/json',
        'text/markdown',
        'application/rtf'
      ];
      
      if (allowedMimeTypes.includes(file.mimetype)) {
        callback(null, true);
      } else {
        callback(new BadRequestException('Only text files are allowed'), false);
      }
    },
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    }
  }))
  @ApiOperation({ 
    summary: 'Upload text file to Cognee knowledge graph',
    description: 'Upload a text file (TXT, CSV, JSON, MD, RTF) to Cognee for knowledge graph processing'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Text file to upload (TXT, CSV, JSON, MD, RTF)'
        },
        author: {
          type: 'string',
          description: 'Author of the document'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags for categorizing the document'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'File successfully uploaded and processed',
    type: CogneeUploadResponse
  })
  @ApiResponse({ status: 400, description: 'Invalid file or file type not supported' })
  @ApiResponse({ status: 413, description: 'File too large (max 10MB)' })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('author') author?: string,
    @Body('tags') tags?: string[]
  ): Promise<CogneeUploadResponse> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    this.logger.log(`Processing file upload for Cognee: ${file.originalname}`);
    
    const metadata = {
      author,
      tags: Array.isArray(tags) ? tags : (tags ? [tags] : [])
    };

    return await this.cogneeService.uploadTextFile(file, metadata);
  }

  @Post('query')
  @ApiOperation({ 
    summary: 'Query the Cognee knowledge graph',
    description: 'Search and retrieve information from the Cognee knowledge graph using natural language queries'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Natural language query to search the knowledge graph',
          example: 'Find all relationships between THC and anxiety treatment'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return',
          example: 10,
          default: 10
        }
      },
      required: ['query']
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Query results from knowledge graph',
    type: CogneeQueryResponse
  })
  @ApiResponse({ status: 400, description: 'Invalid query provided' })
  async queryKnowledgeGraph(
    @Body('query') query: string,
    @Body('limit') limit: number = 10
  ): Promise<CogneeQueryResponse> {
    if (!query || typeof query !== 'string') {
      throw new BadRequestException('Query is required and must be a string');
    }

    this.logger.log(`Querying Cognee knowledge graph: "${query.substring(0, 50)}..."`);
    return await this.cogneeService.queryKnowledgeGraph(query, limit);
  }

  @Get('health')
  @ApiOperation({ 
    summary: 'Check Cognee service health',
    description: 'Get health status and connectivity information for the Cognee service'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Service health information',
    type: CogneeHealthResponse,
    example: {
      status: 'healthy',
      message: 'Cognee service is operational',
      cogneeApiConnected: true,
      responseTime: 45,
      timestamp: '2025-09-11T16:30:00.000Z'
    }
  })
  async getHealth(): Promise<CogneeHealthResponse> {
    this.logger.log('Cognee health check requested');
    return await this.cogneeService.getHealthStatus();
  }

  @Get('stats')
  @ApiOperation({ 
    summary: 'Get Cognee knowledge graph statistics',
    description: 'Retrieve statistics about data stored in the Cognee knowledge graph'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Knowledge graph statistics',
    example: {
      totalDataSets: 125,
      totalEntities: 1247,
      totalRelationships: 2156,
      dataTypeDistribution: {
        text: 45,
        document: 23,
        url: 12,
        structured: 8
      },
      lastUpdated: '2025-09-11T16:30:00.000Z'
    }
  })
  async getStatistics(): Promise<any> {
    this.logger.log('Cognee statistics requested');
    return await this.cogneeService.getStatistics();
  }

  @Get('search')
  @ApiOperation({ 
    summary: 'Search entities in Cognee knowledge graph',
    description: 'Search for specific entities by name or type in the knowledge graph'
  })
  @ApiQuery({ 
    name: 'term', 
    description: 'Search term to find entities',
    example: 'cannabis'
  })
  @ApiQuery({ 
    name: 'type', 
    description: 'Entity type to filter by',
    required: false,
    example: 'Substance'
  })
  @ApiQuery({ 
    name: 'limit', 
    description: 'Maximum number of results',
    required: false,
    example: 20
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Search results',
    schema: {
      type: 'object',
      properties: {
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              type: { type: 'string' },
              confidence: { type: 'number' },
              properties: { type: 'object' }
            }
          }
        },
        totalResults: { type: 'number' },
        searchTerm: { type: 'string' },
        executionTime: { type: 'number' }
      }
    }
  })
  async searchEntities(
    @Query('term') searchTerm: string,
    @Query('type') entityType?: string,
    @Query('limit') limit: number = 20
  ): Promise<any> {
    if (!searchTerm) {
      throw new BadRequestException('Search term is required');
    }

    this.logger.log(`Searching entities in Cognee: "${searchTerm}"`);
    
    // Construct search query
    let query = `Find entities named "${searchTerm}"`;
    if (entityType) {
      query += ` of type "${entityType}"`;
    }

    const results = await this.cogneeService.queryKnowledgeGraph(query, limit);
    
    return {
      results: results.results,
      totalResults: results.totalResults,
      searchTerm,
      entityType,
      executionTime: results.executionTime
    };
  }
}