import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PineconeService } from './pinecone.service';
import { PineconeConfigService } from './pinecone-config.service';

@ApiTags('Pinecone')
@Controller('pinecone')
export class PineconeController {
  constructor(
    private readonly pineconeService: PineconeService,
    private readonly pineconeConfigService: PineconeConfigService
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Check Pinecone connection health' })
  @ApiResponse({
    status: 200,
    description: 'Pinecone health status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'healthy' },
        connected: { type: 'boolean', example: true },
        indexStats: { type: 'object' },
        configuration: { type: 'object' },
        timestamp: { type: 'string', example: '2024-01-15T10:30:00.000Z' },
      },
    },
  })
  async checkHealth() {
    try {
      const stats = await this.pineconeService.getStats();
      const config = this.pineconeConfigService.getConfiguration();
      
      return {
        status: 'healthy',
        connected: true,
        indexStats: {
          totalVectorCount: stats.totalVectorCount || 0,
          dimension: stats.dimension || 0,
          indexFullness: stats.indexFullness || 0,
        },
        configuration: {
          indexName: config.indexName,
          environment: config.environment,
          // Don't return API key for security
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('config/validate')
  @ApiOperation({ summary: 'Validate Pinecone configuration' })
  @ApiResponse({
    status: 200,
    description: 'Configuration validation result',
  })
  async validateConfig() {
    const validation = this.pineconeConfigService.validateConfiguration();
    const config = this.pineconeConfigService.getConfiguration();
    
    return {
      isValid: validation.isValid,
      errors: validation.errors,
      configuration: {
        indexName: config.indexName,
        environment: config.environment,
        hasApiKey: !!config.apiKey && config.apiKey !== 'your_pinecone_api_key_here',
      },
      setupInstructions: validation.isValid ? null : this.pineconeConfigService.getSetupInstructions(),
    };
  }

  @Get('environments')
  @ApiOperation({ summary: 'Get list of common Pinecone environments' })
  @ApiResponse({
    status: 200,
    description: 'List of available environments',
  })
  async getEnvironments() {
    return {
      environments: this.pineconeConfigService.getCommonEnvironments(),
      current: this.pineconeConfigService.getConfiguration().environment,
    };
  }
}