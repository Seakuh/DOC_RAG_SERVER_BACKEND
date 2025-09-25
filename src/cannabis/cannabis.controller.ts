import { Controller, Post, Get, Delete, Body, Param, ValidationPipe, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { CannabisService } from './cannabis.service';
import { CreateStrainDto } from './dto/create-strain.dto';
import { MoodRecommendationDto } from './dto/mood-recommendation.dto';
import { StrainRecommendationResponseDto } from './dto/strain-recommendation.dto';
import { ScientificQuestionDto, ScientificAnswerDto } from './dto/scientific-question.dto';
import { ProcessStrainTextDto, ProcessedStrainResponseDto } from './dto/process-strain-text.dto';

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

  @Post('process-strain-text')
  @ApiOperation({ 
    summary: 'Cannabis-Strain-Text verarbeiten und in Cognee-Datenbank speichern',
    description: 'Nimmt beliebigen Text über einen Cannabis-Strain entgegen, extrahiert strukturierte Daten mit AI und speichert sie in der Cognee Knowledge Graph'
  })
  @ApiBody({ type: ProcessStrainTextDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Cannabis-Strain erfolgreich aus Text extrahiert und in Cognee gespeichert',
    type: ProcessedStrainResponseDto,
    example: {
      id: 'strain-uuid-123',
      name: 'Blue Dream',
      type: 'hybrid',
      description: 'A balanced hybrid strain that provides cerebral euphoria followed by full-body relaxation',
      thc: 19,
      cbd: 0.1,
      effects: ['happy', 'creative', 'relaxed'],
      flavors: ['berry', 'sweet', 'earthy'],
      medical: ['stress', 'depression', 'pain'],
      terpenes: [{ name: 'myrcene', percentage: 0.8 }],
      genetics: 'Blueberry x Haze',
      storedInCognee: true,
      cogneeId: 'strain-cognee-entry-456',
      processingTime: 2500,
      confidence: 0.92,
      metadata: { extractedEntities: 12, identifiedRelationships: 8 }
    }
  })
  @ApiResponse({ status: 400, description: 'Ungültiger Text oder Parameter' })
  @ApiResponse({ status: 500, description: 'Fehler bei der Textverarbeitung oder Cognee-Speicherung' })
  async processStrainText(
    @Body(new ValidationPipe()) processTextDto: ProcessStrainTextDto
  ): Promise<ProcessedStrainResponseDto> {
    this.logger.log(`Processing strain text: "${processTextDto.text.substring(0, 100)}..."`);
    return await this.cannabisService.processStrainFromText(processTextDto);
  }

  @Get('strains/:id/similar')
  @ApiOperation({ 
    summary: 'Ähnliche Cannabis-Strains finden',
    description: 'Findet ähnliche Cannabis-Strains basierend auf Vector-Similarity-Search in der Pinecone-Datenbank'
  })
  @ApiParam({ 
    name: 'id', 
    type: 'string', 
    description: 'ID des Referenz-Strains',
    example: 'strain-uuid-123'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Ähnliche Strains erfolgreich gefunden',
    example: [
      {
        id: 'strain-uuid-456',
        name: 'Purple Haze',
        type: 'sativa',
        similarity: 0.89,
        thc: 19.5,
        effects: ['euphoric', 'creative', 'uplifted'],
        description: 'A legendary sativa strain...'
      }
    ]
  })
  @ApiResponse({ status: 404, description: 'Strain nicht gefunden' })
  @ApiResponse({ status: 500, description: 'Fehler beim Finden ähnlicher Strains' })
  async getSimilarStrains(
    @Param('id') strainId: string
  ): Promise<any[]> {
    this.logger.log(`Finding similar strains for ID: ${strainId}`);
    return await this.cannabisService.findSimilarStrains(strainId);
  }

  @Post('strain-recommendations')
  @ApiOperation({
    summary: 'Strain-Empfehlungen basierend auf Stimmung mit KI-generiertem Text',
    description: 'Nimmt eine Stimmungsbeschreibung entgegen und gibt passende Cannabis-Strains mit personalisierten Empfehlungstexten zurück'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        moodDescription: {
          type: 'string',
          description: 'Beschreibung deiner aktuellen Stimmung oder gewünschten Effekte',
          example: 'Ich fühle mich gestresst nach der Arbeit und möchte entspannen'
        },
        maxResults: {
          type: 'number',
          description: 'Maximale Anzahl der Strain-Empfehlungen',
          example: 5,
          default: 5
        }
      },
      required: ['moodDescription']
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Strain-Empfehlungen erfolgreich generiert',
    example: {
      moodAnalysis: {
        detectedMood: 'gestresst, entspannung suchend',
        recommendedEffects: ['relaxed', 'calm', 'stress-relief'],
        timeContext: 'nach der Arbeit'
      },
      strains: [
        {
          id: 'strain-uuid-123',
          name: 'Blue Dream',
          type: 'hybrid',
          description: 'A balanced hybrid strain...',
          thc: 18.5,
          cbd: 0.2,
          effects: ['happy', 'relaxed', 'creative'],
          recommendationText: 'Blue Dream ist perfekt für deine Situation nach einem stressigen Arbeitstag. Die ausgewogene Hybrid-Genetik bietet sowohl zerebrale Stimulation als auch körperliche Entspannung...',
          similarity: 0.89,
          matchReason: 'Ideal für Stress-Abbau und sanfte Entspannung'
        }
      ],
      totalResults: 5,
      processingTime: 1250,
      generatedAt: '2025-09-15T10:30:00.000Z'
    }
  })
  @ApiResponse({ status: 400, description: 'Ungültige Stimmungsbeschreibung' })
  @ApiResponse({ status: 500, description: 'Fehler bei der Generierung der Strain-Empfehlungen' })
  async getStrainRecommendations(
    @Body() moodRequestDto: { moodDescription: string; maxResults?: number }
  ): Promise<any> {
    this.logger.log(`Generating strain recommendations for mood: "${moodRequestDto.moodDescription.substring(0, 50)}..."`);
    return await this.cannabisService.getStrainRecommendationsWithText(moodRequestDto);
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

  @Post('qdrant-recommendations')
  @ApiOperation({
    summary: 'Strain-Empfehlungen mit Qdrant Vector Search',
    description: 'Generiert personalisierte Cannabis-Strain-Empfehlungen basierend auf Stimmung mit Qdrant Vector Database'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        moodDescription: {
          type: 'string',
          description: 'Beschreibung deiner aktuellen Stimmung oder gewünschten Effekte',
          example: 'heute fühle ich mich nach etwas wach machenden'
        },
        maxResults: {
          type: 'number',
          description: 'Maximale Anzahl der Strain-Empfehlungen',
          example: 5,
          default: 5
        }
      },
      required: ['moodDescription']
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Strain-Empfehlungen mit Qdrant erfolgreich generiert',
    example: {
      moodAnalysis: {
        detectedMood: 'energetisch, wach machend',
        recommendedEffects: ['energetic', 'uplifted', 'focused'],
        strainType: 'sativa'
      },
      strains: [
        {
          id: 'strain-123',
          name: 'Green Crack',
          type: 'sativa',
          description: 'An energizing sativa strain...',
          thc: 20.5,
          cbd: 0.1,
          effects: ['energetic', 'focused', 'creative'],
          similarity: 0.92,
          recommendationText: 'Für deine aktuelle energetische Stimmung ist Green Crack perfekt...'
        }
      ],
      totalResults: 5,
      processingTime: 850,
      generatedAt: '2025-09-16T10:30:00.000Z'
    }
  })
  @ApiResponse({ status: 400, description: 'Ungültige Stimmungsbeschreibung' })
  @ApiResponse({ status: 500, description: 'Fehler bei der Generierung der Qdrant-Empfehlungen' })
  async getQdrantStrainRecommendations(
    @Body() moodRequest: { moodDescription: string; maxResults?: number }
  ): Promise<any> {
    this.logger.log(`Generating Qdrant strain recommendations for mood: "${moodRequest.moodDescription.substring(0, 50)}..."`);
    return await this.cannabisService.getQdrantStrainRecommendations(moodRequest);
  }

  @Post('vectorize-mongo-strains')
  @ApiOperation({
    summary: 'MongoDB Strains zu Qdrant vectorisieren',
    description: 'Lädt alle Cannabis-Strains aus der MongoDB Collection und vectorisiert sie in Qdrant'
  })
  @ApiResponse({
    status: 200,
    description: 'Strains erfolgreich vectorisiert',
    example: {
      message: 'Successfully vectorized 150 strains from MongoDB to Qdrant',
      totalStrains: 150,
      successfulVectorizations: 148,
      failures: 2,
      processingTime: 45000
    }
  })
  @ApiResponse({ status: 500, description: 'Fehler bei der Vectorisierung' })
  async vectorizeMongoStrains(): Promise<any> {
    this.logger.log('Starting vectorization of MongoDB strains to Qdrant');
    return await this.cannabisService.vectorizeMongoStrains();
  }

  @Get('qdrant-collection-info')
  @ApiOperation({
    summary: 'Qdrant Collection Info',
    description: 'Get information about the Qdrant collection'
  })
  @ApiResponse({
    status: 200,
    description: 'Collection info retrieved successfully'
  })
  async getQdrantCollectionInfo(): Promise<any> {
    this.logger.log('Getting Qdrant collection info');
    return await this.cannabisService.getQdrantCollectionInfo();
  }

  @Post('test-single-vector')
  @ApiOperation({
    summary: 'Test single vector upsert',
    description: 'Test upserting a single test vector to debug Qdrant issues'
  })
  async testSingleVector(): Promise<any> {
    this.logger.log('Testing single vector upsert');
    return await this.cannabisService.testSingleVectorUpsert();
  }
}