import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'API Health Check' })
  @ApiResponse({
    status: 200,
    description: 'API is running',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'RAG Backend API is running!' },
        version: { type: 'string', example: '1.0.0' },
        timestamp: { type: 'string', example: '2024-01-15T10:30:00.000Z' },
        uptime: { type: 'number', example: 12345.67 },
      },
    },
  })
  getHello() {
    return this.appService.getHello();
  }

  @Get('version')
  @ApiOperation({ summary: 'Get API version information' })
  @ApiResponse({
    status: 200,
    description: 'Version information',
    schema: {
      type: 'object',
      properties: {
        version: { type: 'string', example: '1.0.0' },
        name: { type: 'string', example: 'RAG Backend' },
        description: { type: 'string', example: 'NestJS RAG Backend with Pinecone and OpenAI integration' },
        author: { type: 'string', example: 'Your Name' },
        node_version: { type: 'string', example: 'v18.17.0' },
      },
    },
  })
  getVersion() {
    return this.appService.getVersion();
  }
}