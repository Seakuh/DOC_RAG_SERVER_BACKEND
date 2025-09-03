import {
  Controller,
  Post,
  Get,
  Body,
  Query as QueryParam,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { QueryService } from './query.service';
import { QueryDto } from './dto/query.dto';
import { QueryResponseDto } from './dto/query-response.dto';
import { SimilarDocumentsDto, SimilarDocumentsResponseDto } from './dto/similar-documents.dto';

@ApiTags('Query')
@Controller('query')
export class QueryController {
  constructor(private readonly queryService: QueryService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Ask a question and get an AI-generated answer based on uploaded documents',
    description: 'Performs semantic search through uploaded documents and generates a contextual answer using AI.'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Question answered successfully',
    type: QueryResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid query parameters',
  })
  async query(
    @Body(new ValidationPipe({ transform: true })) queryDto: QueryDto
  ): Promise<QueryResponseDto> {
    return this.queryService.query(queryDto);
  }

  @Post('similar')
  @ApiOperation({ 
    summary: 'Find similar documents without AI generation',
    description: 'Performs semantic search to find documents similar to the provided text without generating an AI response.'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Similar documents found',
    type: SimilarDocumentsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid parameters',
  })
  async findSimilarDocuments(
    @Body(new ValidationPipe({ transform: true })) similarDto: SimilarDocumentsDto
  ): Promise<SimilarDocumentsResponseDto> {
    return this.queryService.findSimilarDocuments(similarDto);
  }

  @Get('explain')
  @ApiOperation({ 
    summary: 'Explain how a query would be processed',
    description: 'Shows how a query is converted to embeddings and the search strategy used.'
  })
  @ApiQuery({
    name: 'question',
    description: 'The question to explain',
    example: 'What is machine learning?'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Query explanation provided',
    schema: {
      type: 'object',
      properties: {
        explanation: { 
          type: 'string', 
          example: 'Die Frage wird in einen 1536-dimensionalen Vektor umgewandelt...' 
        },
        embedding_preview: { 
          type: 'array', 
          items: { type: 'number' },
          example: [0.123, -0.456, 0.789]
        },
        search_strategy: { 
          type: 'string', 
          example: 'Semantische Suche mit Cosinus-Ähnlichkeit, Mindest-Score: 0.5' 
        },
      },
    },
  })
  async explainQuery(@QueryParam('question') question: string) {
    return this.queryService.explainQuery(question);
  }

  @Get('stats')
  @ApiOperation({ 
    summary: 'Get query statistics',
    description: 'Returns statistics about queries processed by the system.'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Query statistics',
    schema: {
      type: 'object',
      properties: {
        totalQueries: { type: 'number', example: 1250 },
        avgResponseTime: { type: 'number', example: 1850 },
        avgConfidence: { type: 'number', example: 0.78 },
        popularQueries: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              query: { type: 'string', example: 'What is machine learning?' },
              count: { type: 'number', example: 42 },
            },
          },
        },
      },
    },
  })
  async getQueryStats() {
    return this.queryService.getQueryStats();
  }

  @Get('health')
  @ApiOperation({ 
    summary: 'Check the health of query services',
    description: 'Verifies that all underlying services (Embeddings, Pinecone, LLM) are working correctly.'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Health check results',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'healthy', enum: ['healthy', 'degraded'] },
        services: {
          type: 'object',
          properties: {
            embeddings: { type: 'boolean', example: true },
            pinecone: { type: 'boolean', example: true },
            llm: { type: 'boolean', example: true },
          },
        },
        timestamp: { type: 'string', example: '2024-01-15T10:30:00.000Z' },
      },
    },
  })
  async healthCheck() {
    return this.queryService.healthCheck();
  }
}