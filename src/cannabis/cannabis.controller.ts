import { Controller, Post, Get, Delete, Body, Param, ValidationPipe, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { CannabisService } from './cannabis.service';
import { CreateStrainDto } from './dto/create-strain.dto';
import { MoodRecommendationDto } from './dto/mood-recommendation.dto';
import { StrainRecommendationResponseDto } from './dto/strain-recommendation.dto';
import { ScientificQuestionDto, ScientificAnswerDto } from './dto/scientific-question.dto';

@ApiTags('cannabis')
@Controller('cannabis')
export class CannabisController {
  private readonly logger = new Logger(CannabisController.name);

  constructor(private readonly cannabisService: CannabisService) {}

  @Post('strains')
  @ApiOperation({ 
    summary: 'Add a new cannabis strain to the knowledge base',
    description: 'Store a new cannabis strain with all its properties (effects, terpenes, THC/CBD content, etc.) in the vector database for mood-based recommendations'
  })
  @ApiBody({ type: CreateStrainDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Strain successfully added to the knowledge base',
    example: {
      id: 'strain-uuid-123',
      message: 'Cannabis strain "Blue Dream" has been successfully added to the knowledge base.'
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid strain data provided' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async addStrain(
    @Body(new ValidationPipe()) createStrainDto: CreateStrainDto
  ): Promise<{ id: string; message: string }> {
    this.logger.log(`Adding new strain: ${createStrainDto.name}`);
    return await this.cannabisService.addStrain(createStrainDto);
  }

  @Post('recommendations')
  @ApiOperation({ 
    summary: 'Get strain recommendations based on mood and context',
    description: 'Analyze user mood, time of day, and activity context to recommend the most suitable cannabis strains using AI and vector similarity search'
  })
  @ApiBody({ type: MoodRecommendationDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Strain recommendations successfully generated',
    type: StrainRecommendationResponseDto
  })
  @ApiResponse({ status: 400, description: 'Invalid mood data provided' })
  @ApiResponse({ status: 404, description: 'No suitable strains found for the given mood profile' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getMoodRecommendations(
    @Body(new ValidationPipe()) moodRequest: MoodRecommendationDto
  ): Promise<StrainRecommendationResponseDto> {
    this.logger.log(`Generating mood-based recommendations for: "${moodRequest.moodDescription.substring(0, 50)}..."`);
    return await this.cannabisService.getMoodBasedRecommendations(moodRequest);
  }

  @Get('strains')
  @ApiOperation({ 
    summary: 'Get all cannabis strains from the knowledge base',
    description: 'Retrieve all stored cannabis strains with their metadata and properties'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'All strains successfully retrieved',
    example: [
      {
        id: 'strain-uuid-123',
        name: 'Blue Dream',
        type: 'hybrid',
        effects: ['happy', 'relaxed', 'euphoric'],
        thc: 18.5,
        rating: 4.2
      }
    ]
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getAllStrains(): Promise<any[]> {
    this.logger.log('Retrieving all strains from knowledge base');
    return await this.cannabisService.getAllStrains();
  }

  @Delete('strains/:id')
  @ApiOperation({ 
    summary: 'Delete a cannabis strain by ID',
    description: 'Remove a specific cannabis strain from the knowledge base using its unique identifier'
  })
  @ApiParam({ 
    name: 'id', 
    type: 'string', 
    description: 'Unique identifier of the strain to delete',
    example: 'strain-uuid-123'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Strain successfully deleted',
    example: {
      message: 'Strain with ID strain-uuid-123 has been successfully deleted.'
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid strain ID provided' })
  @ApiResponse({ status: 404, description: 'Strain not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async deleteStrain(
    @Param('id') strainId: string
  ): Promise<{ message: string }> {
    this.logger.log(`Deleting strain with ID: ${strainId}`);
    return await this.cannabisService.deleteStrain(strainId);
  }

  @Get('health')
  @ApiOperation({ 
    summary: 'Cannabis service health check',
    description: 'Check if the cannabis recommendation service is operational'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Cannabis service is healthy',
    example: {
      status: 'healthy',
      message: 'Cannabis recommendation service is operational',
      timestamp: '2025-09-11T16:30:00.000Z'
    }
  })
  async healthCheck(): Promise<{ status: string; message: string; timestamp: string }> {
    this.logger.log('Cannabis service health check requested');
    return {
      status: 'healthy',
      message: 'Cannabis recommendation service is operational',
      timestamp: new Date().toISOString()
    };
  }

  @Get('stats')
  @ApiOperation({ 
    summary: 'Get cannabis knowledge base statistics',
    description: 'Retrieve statistics about stored strains, popular effects, and system usage'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Statistics successfully retrieved',
    example: {
      totalStrains: 150,
      strainsByType: { indica: 45, sativa: 52, hybrid: 53 },
      popularEffects: ['relaxed', 'happy', 'euphoric', 'creative'],
      averageRating: 4.1,
      lastUpdated: '2025-09-11T16:30:00.000Z'
    }
  })
  async getStats(): Promise<any> {
    this.logger.log('Cannabis knowledge base statistics requested');
    // TODO: Implement actual statistics gathering
    return {
      totalStrains: 0, // Will be implemented with actual strain counting
      strainsByType: { indica: 0, sativa: 0, hybrid: 0 },
      popularEffects: ['relaxed', 'happy', 'euphoric', 'creative'],
      averageRating: 0,
      lastUpdated: new Date().toISOString()
    };
  }

  @Post('scientific-question')
  @ApiOperation({ 
    summary: 'Wissenschaftliche Cannabis-Fragen mit Cognee-Integration beantworten',
    description: 'Beantwortet wissenschaftliche Fragen über Cannabis basierend auf Forschungsdaten aus dem Cognee Knowledge Graph und der Cannabis-Strain-Datenbank'
  })
  @ApiBody({ type: ScientificQuestionDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Wissenschaftliche Antwort mit Quellen und Erkenntnissen',
    type: ScientificAnswerDto,
    example: {
      answer: 'CBD (Cannabidiol) wirkt bei der Behandlung von Epilepsie hauptsächlich durch...',
      confidence: 0.87,
      sources: [
        {
          title: 'CBD und Epilepsie Studie 2023',
          type: 'clinical_study',
          relevanceScore: 0.92,
          keyFindings: ['CBD reduziert Anfallshäufigkeit um 38%'],
          year: 2023
        }
      ],
      relatedEntities: [
        {
          name: 'CBD',
          type: 'Compound',
          relationship: 'modulates',
          confidence: 0.95
        }
      ],
      metadata: {
        processingTime: 3500,
        sourcesAnalyzed: 5,
        cogneeEntitiesFound: 12
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Ungültige Frage oder Parameter' })
  @ApiResponse({ status: 500, description: 'Fehler bei der Verarbeitung der wissenschaftlichen Frage' })
  async askScientificQuestion(
    @Body(new ValidationPipe()) questionDto: ScientificQuestionDto
  ): Promise<ScientificAnswerDto> {
    this.logger.log(`Processing scientific question: "${questionDto.question.substring(0, 100)}..."`);
    return await this.cannabisService.answerScientificQuestion(questionDto);
  }
}