import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CogneeService } from '../cognee/cognee.service';
import { CogneeDataType, UploadDataDto } from '../cognee/dto/upload-data.dto';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { LLMService } from '../llm/llm.service';
import { PineconeService } from '../pinecone/pinecone.service';
import { QdrantService } from '../qdrant/qdrant.service';
import { VectorizationService } from '../qdrant/vectorization.service';
import { StrainService } from '../database/strain.service';
import { CreateStrainDto, StrainType } from './dto/create-strain.dto';
import { ActivityContext, MoodRecommendationDto, TimeOfDay } from './dto/mood-recommendation.dto';
import { ProcessStrainTextDto, ProcessedStrainResponseDto } from './dto/process-strain-text.dto';
import { ScientificAnswerDto, ScientificQuestionDto } from './dto/scientific-question.dto';
import {
  RecommendationContext,
  StrainMatch,
  StrainRecommendationResponseDto,
} from './dto/strain-recommendation.dto';

interface StrainMetadata {
  strainId: string;
  name: string;
  type: StrainType;
  description: string;
  thc?: number;
  cbd?: number;
  effects: string[];
  flavors?: string[];
  medical?: string[];
  terpenes?: string;
  genetics?: string;
  breeder?: string;
  rating?: number;
  createdAt: string;
}

@Injectable()
export class CannabisService {
  private readonly logger = new Logger(CannabisService.name);

  constructor(
    private readonly pineconeService: PineconeService,
    private readonly embeddingsService: EmbeddingsService,
    private readonly llmService: LLMService,
    private readonly cogneeService: CogneeService,
    private readonly qdrantService: QdrantService,
    private readonly vectorizationService: VectorizationService,
    private readonly strainService: StrainService,
  ) {}

  /**
   * Store a new cannabis strain in the knowledge graph (Pinecone vector database)
   */
  async addStrain(createStrainDto: CreateStrainDto): Promise<{ id: string; message: string }> {
    try {
      const strainId = uuidv4();

      // Create comprehensive text for embedding
      const strainText = this.createStrainEmbeddingText(createStrainDto);

      // Generate embedding for the strain
      const embedding = await this.embeddingsService.generateEmbedding(strainText);

      // Prepare metadata
      const metadata: StrainMetadata = {
        strainId,
        name: createStrainDto.name,
        type: createStrainDto.type,
        description: createStrainDto.description,
        thc: createStrainDto.thc,
        cbd: createStrainDto.cbd,
        effects: createStrainDto.effects,
        flavors: createStrainDto.flavors,
        medical: createStrainDto.medical,
        terpenes: createStrainDto.terpenes ? JSON.stringify(createStrainDto.terpenes) : undefined,
        genetics: createStrainDto.genetics,
        breeder: createStrainDto.breeder,
        rating: createStrainDto.rating,
        createdAt: new Date().toISOString(),
      };

      // Store in Pinecone - adapt metadata to PineconeService format
      await this.pineconeService.upsert([
        {
          id: strainId,
          values: embedding,
          metadata: {
            ...metadata,
            text: strainText,
            source: `cannabis-strain-${createStrainDto.name}`,
            chunk_index: 0,
            timestamp: new Date().toISOString(),
          },
        },
      ]);

      this.logger.log(`Successfully added strain: ${createStrainDto.name} (ID: ${strainId})`);

      return {
        id: strainId,
        message: `Cannabis strain "${createStrainDto.name}" has been successfully added to the knowledge base.`,
      };
    } catch (error) {
      this.logger.error(`Failed to add strain: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to add strain: ${error.message}`);
    }
  }

  /**
   * Get strain recommendations based on mood and context
   */
  async getMoodBasedRecommendations(
    moodRequest: MoodRecommendationDto,
  ): Promise<StrainRecommendationResponseDto> {
    try {
      // Analyze the mood description with AI
      const analyzedMood = await this.analyzeMoodWithAI(moodRequest);

      // Create enhanced search query
      const searchQuery = this.createEnhancedSearchQuery(moodRequest, analyzedMood);

      // Generate embedding for the search query
      const queryEmbedding = await this.embeddingsService.generateEmbedding(searchQuery);

      // Search for similar strains in Pinecone
      const searchResults = await this.pineconeService.query(
        queryEmbedding,
        moodRequest.maxResults || 5,
      );
      console.log('searchResults', searchResults);

      // Filter by score
      const filteredResults = searchResults.filter(
        result => result.score >= (moodRequest.minScore || 0.7),
      );

      if (filteredResults.length === 0) {
        throw new NotFoundException(
          'No suitable strain recommendations found for your mood profile',
        );
      }

      // Process results and generate recommendations
      const recommendations = await this.processSearchResults(
        filteredResults,
        moodRequest,
        analyzedMood,
      );

      // Create context explanation
      const context = this.createRecommendationContext(moodRequest, analyzedMood);

      return {
        recommendations,
        context,
        totalResults: recommendations.length,
        summary: `Found ${recommendations.length} strain recommendations based on your mood profile`,
        generalTips: this.getGeneralTips(moodRequest),
      };
    } catch (error) {
      this.logger.error(`Failed to get mood-based recommendations: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to get recommendations: ${error.message}`);
    }
  }

  /**
   * Get all stored strains
   */
  async getAllStrains(): Promise<any[]> {
    try {
      // Note: Pinecone doesn't have a direct "list all vectors" API in the current service
      // In a real implementation, you would maintain a separate metadata store
      // or use Pinecone's vector querying with pagination

      this.logger.log('Getting strain statistics instead of full list (Pinecone limitation)');
      const stats = await this.pineconeService.getStats();

      return [
        {
          message: 'Full strain listing not available with current Pinecone setup',
          totalVectors: stats.totalVectorCount || 0,
          recommendation: 'Use specific strain queries or mood-based recommendations instead',
        },
      ];
    } catch (error) {
      this.logger.error(`Failed to retrieve strain information: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to retrieve strain information: ${error.message}`);
    }
  }

  /**
   * Delete a strain by ID
   */
  async deleteStrain(strainId: string): Promise<{ message: string }> {
    try {
      await this.pineconeService.deleteById(strainId);
      this.logger.log(`Successfully deleted strain with ID: ${strainId}`);

      return {
        message: `Strain with ID ${strainId} has been successfully deleted.`,
      };
    } catch (error) {
      this.logger.error(`Failed to delete strain: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to delete strain: ${error.message}`);
    }
  }

  /**
   * Create comprehensive text for strain embedding
   */
  private createStrainEmbeddingText(strain: CreateStrainDto): string {
    const parts = [
      `Cannabis strain: ${strain.name}`,
      `Type: ${strain.type}`,
      `Description: ${strain.description}`,
      `Effects: ${strain.effects.join(', ')}`,
    ];

    if (strain.thc) parts.push(`THC: ${strain.thc}%`);
    if (strain.cbd) parts.push(`CBD: ${strain.cbd}%`);
    if (strain.flavors?.length) parts.push(`Flavors: ${strain.flavors.join(', ')}`);
    if (strain.medical?.length) parts.push(`Medical uses: ${strain.medical.join(', ')}`);
    if (strain.terpenes?.length) {
      const terpeneNames = strain.terpenes.map(t => `${t.name} (${t.percentage}%)`);
      parts.push(`Terpenes: ${terpeneNames.join(', ')}`);
    }
    if (strain.genetics) parts.push(`Genetics: ${strain.genetics}`);

    return parts.join('. ');
  }

  /**
   * Analyze mood with AI to extract key insights
   */
  private async analyzeMoodWithAI(moodRequest: MoodRecommendationDto): Promise<any> {
    const prompt = `
    Analyze this user's mood and context for cannabis strain recommendations:
    
    Mood Description: "${moodRequest.moodDescription}"
    Time of Day: ${moodRequest.timeOfDay || 'not specified'}
    Activity Context: ${moodRequest.activityContext || 'not specified'}
    Target Symptoms: ${moodRequest.targetSymptoms?.join(', ') || 'not specified'}
    Stress Level: ${moodRequest.stressLevel || 'not specified'}/10
    Energy Level: ${moodRequest.energyLevel || 'not specified'}/10
    
    Extract and return:
    1. Main mood/emotional state
    2. Desired effects
    3. Key keywords for strain matching
    4. Recommended strain characteristics
    
    Format as JSON with keys: mainMood, desiredEffects, keywords, recommendedCharacteristics
    `;

    try {
      const response = await this.llmService.generateResponse(prompt, []);
      return JSON.parse(response.answer);
    } catch (error) {
      // Fallback analysis if AI fails
      return {
        mainMood: moodRequest.moodDescription.substring(0, 50),
        desiredEffects: moodRequest.targetSymptoms || [],
        keywords: this.extractKeywordsFromMood(moodRequest),
        recommendedCharacteristics: this.getRecommendedCharacteristics(moodRequest),
      };
    }
  }

  /**
   * Create enhanced search query combining mood analysis and context
   */
  private createEnhancedSearchQuery(moodRequest: MoodRecommendationDto, analyzedMood: any): string {
    const parts = [
      `User mood: ${moodRequest.moodDescription}`,
      `Desired effects: ${analyzedMood.desiredEffects?.join?.(', ') || 'relaxation'}`,
      `Context: ${moodRequest.timeOfDay || 'any time'} ${moodRequest.activityContext || 'general use'}`,
    ];

    if (moodRequest.targetSymptoms?.length) {
      parts.push(`Target symptoms: ${moodRequest.targetSymptoms.join(', ')}`);
    }

    if (analyzedMood.keywords?.length) {
      parts.push(`Keywords: ${analyzedMood.keywords.join(', ')}`);
    }

    return parts.join('. ');
  }

  /**
   * Process search results and generate AI explanations
   */
  private async processSearchResults(
    searchResults: any[],
    moodRequest: MoodRecommendationDto,
    analyzedMood: any,
  ): Promise<StrainMatch[]> {
    const recommendations: StrainMatch[] = [];

    for (const result of searchResults) {
      const metadata = result.metadata as StrainMetadata;

      // Generate AI reasoning for this recommendation
      const reasoning = await this.generateReasoningForStrain(metadata, moodRequest, analyzedMood);

      // Generate dosage recommendation
      const dosageRecommendation = this.generateDosageRecommendation(metadata, moodRequest);

      recommendations.push({
        id: metadata.strainId,
        name: metadata.name,
        type: metadata.type,
        description: metadata.description,
        thc: metadata.thc,
        cbd: metadata.cbd,
        effects: metadata.effects,
        flavors: metadata.flavors,
        medical: metadata.medical || [],
        terpenes: metadata.terpenes ? JSON.parse(metadata.terpenes) : undefined,
        rating: metadata.rating,
        similarity: result.score,
        reasoning,
        dosageRecommendation,
      });
    }

    return recommendations;
  }

  /**
   * Generate AI reasoning for strain recommendation
   */
  private async generateReasoningForStrain(
    strain: StrainMetadata,
    moodRequest: MoodRecommendationDto,
    analyzedMood: any,
  ): Promise<string> {
    const prompt = `
    Explain why "${strain.name}" is a good match for this user's mood:
    
    User Context:
    - Mood: ${moodRequest.moodDescription}
    - Time: ${moodRequest.timeOfDay || 'any'}
    - Activity: ${moodRequest.activityContext || 'general'}
    - Stress Level: ${moodRequest.stressLevel || 'unknown'}/10
    
    Strain Details:
    - Type: ${strain.type}
    - Effects: ${strain.effects?.join?.(', ') || 'various effects'}
    - THC: ${strain.thc || 'unknown'}%
    - CBD: ${strain.cbd || 'unknown'}%
    - Medical Uses: ${strain.medical?.join?.(', ') || 'none specified'}
    
    Provide a concise, friendly explanation (max 100 words) why this strain matches their needs.
    `;

    try {
      const response = await this.llmService.generateResponse(prompt, []);
      return response.answer;
    } catch (error) {
      return `${strain.name} matches your mood profile with its ${strain.effects?.join?.(', ') || 'various'} effects, making it suitable for ${moodRequest.timeOfDay || 'your'} ${moodRequest.activityContext || 'activities'}.`;
    }
  }

  /**
   * Generate dosage recommendation based on strain and user context
   */
  private generateDosageRecommendation(
    strain: StrainMetadata,
    moodRequest: MoodRecommendationDto,
  ): string {
    const highTHC = strain.thc && strain.thc > 20;
    const eveningUse =
      moodRequest.timeOfDay === TimeOfDay.EVENING || moodRequest.timeOfDay === TimeOfDay.NIGHT;
    const newUser = moodRequest.stressLevel && moodRequest.stressLevel > 7; // High stress might indicate inexperience

    if (highTHC && newUser) {
      return 'Start with 1 small puff and wait 15 minutes before consuming more. This strain is potent.';
    } else if (eveningUse) {
      return 'Start with 2-3 moderate puffs. Perfect for evening relaxation.';
    } else {
      return 'Begin with 1-2 puffs and adjust based on desired effects.';
    }
  }

  /**
   * Create recommendation context explanation
   */
  private createRecommendationContext(
    moodRequest: MoodRecommendationDto,
    analyzedMood: any,
  ): RecommendationContext {
    return {
      analyzedMood: analyzedMood.mainMood || moodRequest.moodDescription.substring(0, 100),
      extractedKeywords: analyzedMood.keywords || this.extractKeywordsFromMood(moodRequest),
      timeContext: moodRequest.timeOfDay || 'any time',
      activityContext: moodRequest.activityContext || 'general use',
      explanation: `Based on your ${analyzedMood.mainMood || 'mood'} and ${moodRequest.timeOfDay || ''} context, I've selected strains that match your desired effects and usage patterns.`,
    };
  }

  /**
   * Extract keywords from mood request
   */
  private extractKeywordsFromMood(moodRequest: MoodRecommendationDto): string[] {
    const keywords = [];

    if (moodRequest.moodDescription.toLowerCase().includes('stress'))
      keywords.push('stress-relief');
    if (moodRequest.moodDescription.toLowerCase().includes('relax')) keywords.push('relaxation');
    if (moodRequest.moodDescription.toLowerCase().includes('creative')) keywords.push('creativity');
    if (moodRequest.moodDescription.toLowerCase().includes('energy')) keywords.push('energizing');
    if (moodRequest.moodDescription.toLowerCase().includes('sleep')) keywords.push('sleep-aid');
    if (moodRequest.timeOfDay === TimeOfDay.EVENING) keywords.push('evening-use');
    if (moodRequest.activityContext === ActivityContext.CREATIVE)
      keywords.push('creative-enhancement');

    return keywords;
  }

  /**
   * Get recommended strain characteristics
   */
  private getRecommendedCharacteristics(moodRequest: MoodRecommendationDto): string[] {
    const characteristics = [];

    if (moodRequest.stressLevel && moodRequest.stressLevel > 6) {
      characteristics.push('high-myrcene', 'relaxing-effects');
    }
    if (moodRequest.timeOfDay === TimeOfDay.MORNING) {
      characteristics.push('sativa-dominant', 'energizing');
    }
    if (moodRequest.timeOfDay === TimeOfDay.EVENING) {
      characteristics.push('indica-dominant', 'sedating');
    }

    return characteristics;
  }

  /**
   * Get general usage tips
   */
  private getGeneralTips(moodRequest: MoodRecommendationDto): string[] {
    const tips = [
      'Start low and go slow, especially with new strains',
      'Stay hydrated and have snacks nearby',
      'Consider your tolerance level when dosing',
      'Wait at least 15 minutes between doses to gauge effects',
    ];

    if (moodRequest.timeOfDay === TimeOfDay.EVENING) {
      tips.push('Evening strains may cause drowsiness - avoid driving or operating machinery');
    }

    if (moodRequest.activityContext === ActivityContext.WORK) {
      tips.push('Choose strains that enhance focus without causing drowsiness');
    }

    return tips;
  }

  /**
   * Process cannabis strain text and extract structured data using AI
   * Stores only in Cognee knowledge graph
   */
  async processStrainFromText(
    processTextDto: ProcessStrainTextDto,
  ): Promise<ProcessedStrainResponseDto> {
    try {
      const startTime = Date.now();
      const strainId = uuidv4();

      this.logger.log(`Processing strain text: "${processTextDto.text.substring(0, 100)}..."`);

      // Step 1: Extract structured strain data using LLM
      const extractedStrain = await this.extractStrainDataFromText(processTextDto);

      // Step 2: Store only in Cognee knowledge graph
      const cogneeResult = await this.storeStrainInCognee(extractedStrain, processTextDto.text);

      const processingTime = Date.now() - startTime;

      return {
        id: strainId,
        name: extractedStrain.name,
        type: extractedStrain.type,
        description: extractedStrain.description,
        thc: extractedStrain.thc,
        cbd: extractedStrain.cbd,
        effects: extractedStrain.effects,
        flavors: extractedStrain.flavors,
        medical: extractedStrain.medical,
        terpenes: extractedStrain.terpenes,
        genetics: extractedStrain.genetics,
        storedInCognee: cogneeResult.success,
        cogneeId: cogneeResult.id,
        processingTime,
        confidence: extractedStrain.confidence,
        metadata: {
          extractedEntities: cogneeResult.entitiesCount || 0,
          identifiedRelationships: cogneeResult.relationshipsCount || 0,
          originalTextLength: processTextDto.text.length,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to process strain text: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to process strain text: ${error.message}`);
    }
  }

  /**
   * Find similar strains based on vector similarity
   */
  async findSimilarStrains(strainId: string, limit: number = 5): Promise<any[]> {
    // TODO: Implement this
    return [];
    // try {
    //   this.logger.log(`Finding similar strains for: ${strainId}`);

    //   // Get the reference strain's vector from Pinecone
    //   const referenceVector = await this.getReferenceVector(strainId);
    //   if (!referenceVector) {
    //     throw new NotFoundException(`Strain with ID ${strainId} not found`);
    //   }

    //   // Search for similar strains using the reference vector
    //   const similarResults = await this.pineconeService.query(
    //     referenceVector,
    //     limit + 1 // +1 to exclude the reference strain itself
    //   );

    //   // Filter out the reference strain and format results
    //   const similarStrains = similarResults
    //     .filter(result => result.metadata?.strainId !== strainId)
    //     .slice(0, limit)
    //     .map(result => {
    //       const metadata = result.metadata as StrainMetadata;
    //       return {
    //         id: metadata.strainId,
    //         name: metadata.name,
    //         type: metadata.type,
    //         description: metadata.description,
    //         thc: metadata.thc,
    //         cbd: metadata.cbd,
    //         effects: metadata.effects,
    //         flavors: metadata.flavors,
    //         medical: metadata.medical,
    //         terpenes: metadata.terpenes ? JSON.parse(metadata.terpenes) : null,
    //         genetics: metadata.genetics,
    //         breeder: metadata.breeder,
    //         rating: metadata.rating,
    //         similarity: Math.round(result.score * 100) / 100, // Round to 2 decimal places
    //         createdAt: metadata.createdAt
    //       };
    //     });

    //   this.logger.log(`Found ${similarStrains.length} similar strains`);
    //   return similarStrains;
    // } catch (error) {
    //   this.logger.error(`Failed to find similar strains: ${error.message}`, error.stack);
    //   throw new BadRequestException(`Failed to find similar strains: ${error.message}`);
    // }
  }

  /**
   * Get reference vector for a strain by ID
   */
  private async getReferenceVector(strainId: string): Promise<number[] | null> {
    try {
      // Query Pinecone to find the strain by ID
      const results = await this.pineconeService.query(
        new Array(1024).fill(0), // Dummy vector for metadata search
        1,
        { strainId: strainId },
      );

      if (results.length === 0) {
        return null;
      }

      // Since Pinecone doesn't return vectors in query results,
      // we need to use the strain's text to generate the embedding again
      const metadata = results[0].metadata as unknown as StrainMetadata;
      const strainText = this.createStrainEmbeddingTextFromMetadata(metadata);

      return await this.embeddingsService.generateEmbedding(strainText);
    } catch (error) {
      this.logger.warn(`Could not get reference vector for ${strainId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Create embedding text from strain metadata
   */
  private createStrainEmbeddingTextFromMetadata(metadata: StrainMetadata): string {
    const parts = [
      `Cannabis strain: ${metadata.name}`,
      `Type: ${metadata.type}`,
      `Description: ${metadata.description}`,
      `Effects: ${metadata.effects?.join(', ') || 'various effects'}`,
    ];

    if (metadata.thc) parts.push(`THC: ${metadata.thc}%`);
    if (metadata.cbd) parts.push(`CBD: ${metadata.cbd}%`);
    if (metadata.flavors?.length) parts.push(`Flavors: ${metadata.flavors.join(', ')}`);
    if (metadata.medical?.length) parts.push(`Medical uses: ${metadata.medical.join(', ')}`);
    if (metadata.terpenes) {
      try {
        const terpenes = JSON.parse(metadata.terpenes);
        if (Array.isArray(terpenes)) {
          const terpeneNames = terpenes.map((t: any) => `${t.name} (${t.percentage}%)`);
          parts.push(`Terpenes: ${terpeneNames.join(', ')}`);
        }
      } catch (e) {
        // Ignore terpene parsing errors
      }
    }
    if (metadata.genetics) parts.push(`Genetics: ${metadata.genetics}`);

    return parts.join('. ');
  }

  /**
   * Get strain recommendations with AI-generated recommendation text based on mood
   */
  async getStrainRecommendationsWithText(moodRequest: {
    moodDescription: string;
    maxResults?: number;
  }): Promise<any> {
    try {
      const startTime = Date.now();
      this.logger.log(
        `Generating strain recommendations with AI text for mood: "${moodRequest.moodDescription.substring(0, 50)}..."`,
      );

      // Analyze the mood description with AI first
      const moodAnalysis = await this.analyzeMoodForStrainRecommendation(
        moodRequest.moodDescription,
      );

      // Create enhanced search query based on mood
      const searchQuery = this.createMoodBasedSearchQuery(
        moodRequest.moodDescription,
        moodAnalysis,
      );

      // Generate embedding for the mood-based search query
      const queryEmbedding = await this.embeddingsService.generateEmbedding(searchQuery);

      // Query Pinecone for strain recommendations
      const maxResults = moodRequest.maxResults || 5;
      const searchResults = await this.pineconeService.query(queryEmbedding, maxResults);

      if (searchResults.length === 0) {
        return {
          moodAnalysis,
          strains: [],
          totalResults: 0,
          processingTime: Date.now() - startTime,
          generatedAt: new Date().toISOString(),
          message: 'Keine passenden Strains für deine Stimmung gefunden',
        };
      }

      // Process each strain and generate personalized recommendation text
      const strainsWithRecommendations = await Promise.all(
        searchResults
          .filter(result => result.metadata && (result.metadata as any).name) // Filter out results without proper metadata
          .map(async result => {
            const metadata = result.metadata as unknown as StrainMetadata;

            // Ensure we have valid metadata with fallbacks
            const cleanMetadata = this.sanitizeStrainMetadata(metadata);

            // Generate personalized AI recommendation text for this strain based on mood
            const recommendationText = await this.generateMoodBasedRecommendationText(
              cleanMetadata,
              moodRequest.moodDescription,
              moodAnalysis,
            );

            // Generate match reason
            const matchReason = await this.generateMatchReason(cleanMetadata, moodAnalysis);

            const strainResponse: any = {
              id: cleanMetadata.strainId || result.id,
              name: cleanMetadata.name,
              type: cleanMetadata.type,
              description: cleanMetadata.description,
              effects: cleanMetadata.effects || [],
              recommendationText,
              similarity: Math.round(result.score * 100) / 100,
              matchReason,
              createdAt: cleanMetadata.createdAt,
            };

            // Only add properties if they have meaningful values
            if (cleanMetadata.thc !== undefined) strainResponse.thc = cleanMetadata.thc;
            if (cleanMetadata.cbd !== undefined) strainResponse.cbd = cleanMetadata.cbd;
            if (cleanMetadata.flavors && cleanMetadata.flavors.length > 0)
              strainResponse.flavors = cleanMetadata.flavors;
            if (cleanMetadata.medical && cleanMetadata.medical.length > 0)
              strainResponse.medical = cleanMetadata.medical;
            if (cleanMetadata.genetics) strainResponse.genetics = cleanMetadata.genetics;
            if (cleanMetadata.rating !== undefined) strainResponse.rating = cleanMetadata.rating;

            const parsedTerpenes = this.parseTerpenes(cleanMetadata.terpenes);
            if (parsedTerpenes && parsedTerpenes.length > 0) {
              strainResponse.terpenes = parsedTerpenes;
            }

            return strainResponse;
          }),
      );

      const processingTime = Date.now() - startTime;

      return {
        moodAnalysis,
        strains: strainsWithRecommendations,
        totalResults: strainsWithRecommendations.length,
        processingTime,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to generate strain recommendations: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to generate strain recommendations: ${error.message}`);
    }
  }

  /**
   * Analyze mood description for strain recommendation
   */
  private async analyzeMoodForStrainRecommendation(moodDescription: string): Promise<any> {
    const prompt = `
Analysiere diese Stimmungsbeschreibung für Cannabis-Strain-Empfehlungen:

Stimmung: "${moodDescription}"

Extrahiere und gib als JSON zurück:
{
  "detectedMood": "kurze Zusammenfassung der Hauptstimmung",
  "recommendedEffects": ["array", "von", "gewünschten", "effekten"],
  "timeContext": "vermutete Tageszeit oder Situation",
  "intensity": "low|medium|high - Intensität der gewünschten Wirkung",
  "strainType": "indica|sativa|hybrid - empfohlener Strain-Typ",
  "keywords": ["relevante", "suchbegriffe", "für", "strain", "matching"]
}

Fokus auf Cannabis-spezifische Effekte: relaxed, happy, euphoric, creative, focused, energetic, sleepy, uplifted, calm, giggly.
`;

    try {
      const response = await this.llmService.generateResponse(prompt, []);
      return JSON.parse(response.answer);
    } catch (error) {
      this.logger.warn(`Could not analyze mood with AI, using fallback: ${error.message}`);

      // Fallback mood analysis
      const moodLower = moodDescription.toLowerCase();
      return {
        detectedMood: moodDescription.substring(0, 100),
        recommendedEffects: this.extractEffectsFromMoodText(moodLower),
        timeContext: this.extractTimeContext(moodLower),
        intensity: moodLower.includes('sehr') || moodLower.includes('stark') ? 'high' : 'medium',
        strainType: this.determineStrainTypeFromMood(moodLower),
        keywords: this.extractKeywordsFromMoodText(moodLower),
      };
    }
  }

  /**
   * Create mood-based search query for Pinecone
   */
  private createMoodBasedSearchQuery(moodDescription: string, moodAnalysis: any): string {
    const parts = [
      `User mood: ${moodDescription}`,
      `Desired effects: ${moodAnalysis.recommendedEffects?.join(', ') || 'relaxation'}`,
      `Strain type preference: ${moodAnalysis.strainType || 'hybrid'}`,
      `Context: ${moodAnalysis.timeContext || 'general use'}`,
      `Keywords: ${moodAnalysis.keywords?.join(', ') || 'cannabis strain'}`,
    ];

    return parts.join('. ');
  }

  /**
   * Generate mood-based recommendation text for a specific strain
   */
  private async generateMoodBasedRecommendationText(
    strain: StrainMetadata,
    moodDescription: string,
    moodAnalysis: any,
  ): Promise<string> {
    const prompt = `
Du bist ein Cannabis-Experte. Schreibe einen personalisierten Empfehlungstext für den Strain "${strain.name}" basierend auf der Nutzerstimmung.

Nutzerstimmung: "${moodDescription}"
Stimmungsanalyse: ${JSON.stringify(moodAnalysis, null, 2)}

Strain-Informationen:
- Name: ${strain.name}
- Typ: ${strain.type}
- THC: ${strain.thc || 'unbekannt'}%
- CBD: ${strain.cbd || 'unbekannt'}%
- Effekte: ${strain.effects?.join(', ') || 'verschiedene Effekte'}
- Medizinische Anwendungen: ${strain.medical?.join(', ') || 'nicht spezifiziert'}

Schreibe einen persönlichen, empathischen Empfehlungstext (2-3 Sätze), der:
1. Direkt auf die Stimmung des Nutzers eingeht
2. Erklärt, warum dieser Strain zur Stimmung passt
3. Die zu erwartenden Effekte beschreibt
4. Einen freundlichen, verständnisvollen Ton hat

Beginne mit "Für deine aktuelle Situation..." oder ähnlich persönlich.
`;

    try {
      const response = await this.llmService.generateResponse(prompt, []);
      return response.answer;
    } catch (error) {
      this.logger.warn(
        `Could not generate mood-based recommendation text for ${strain.name}, using fallback`,
      );

      // Fallback recommendation text
      const moodContext = moodAnalysis.detectedMood || 'deine Stimmung';
      const effectsMatch =
        strain.effects?.filter(effect => moodAnalysis.recommendedEffects?.includes(effect)) || [];

      return `Für ${moodContext} ist ${strain.name} eine ausgezeichnete Wahl. ${effectsMatch.length > 0 ? `Mit Effekten wie ${effectsMatch.join(', ')} ` : ''}Dieser ${strain.type}-Strain ${strain.thc ? `mit ${strain.thc}% THC ` : ''}kann dir dabei helfen, dich ${moodAnalysis.recommendedEffects?.[0] || 'entspannt'} zu fühlen.`;
    }
  }

  /**
   * Generate match reason for strain recommendation
   */
  private async generateMatchReason(strain: StrainMetadata, moodAnalysis: any): Promise<string> {
    const effectsMatch =
      strain.effects?.filter(effect => moodAnalysis.recommendedEffects?.includes(effect)) || [];

    if (effectsMatch.length > 0) {
      return `Perfekt für ${moodAnalysis.detectedMood} - bietet ${effectsMatch.join(', ')}`;
    }

    const typeMatch = strain.type === moodAnalysis.strainType;
    if (typeMatch) {
      return `${strain.type.charAt(0).toUpperCase() + strain.type.slice(1)}-Strain passt zu deiner gewünschten Wirkung`;
    }

    return `Empfohlen aufgrund der Strain-Eigenschaften und Ähnlichkeit zu deiner Stimmung`;
  }

  // Helper methods for fallback mood analysis
  private extractEffectsFromMoodText(moodText: string): string[] {
    const effectsMap = {
      stress: ['relaxed', 'calm'],
      müde: ['energetic', 'uplifted'],
      traurig: ['happy', 'euphoric'],
      kreativ: ['creative', 'focused'],
      schlafen: ['sleepy', 'relaxed'],
      energie: ['energetic', 'uplifted'],
      entspann: ['relaxed', 'calm'],
      fröhlich: ['happy', 'giggly'],
      fokus: ['focused', 'creative'],
    };

    const effects = [];
    for (const [keyword, mappedEffects] of Object.entries(effectsMap)) {
      if (moodText.includes(keyword)) {
        effects.push(...mappedEffects);
      }
    }

    return effects.length > 0 ? [...new Set(effects)] : ['relaxed', 'happy'];
  }

  private extractTimeContext(moodText: string): string {
    if (moodText.includes('abend') || moodText.includes('nacht')) return 'Abend';
    if (moodText.includes('morgen') || moodText.includes('früh')) return 'Morgen';
    if (moodText.includes('arbeit') || moodText.includes('job')) return 'nach der Arbeit';
    if (moodText.includes('wochenende') || moodText.includes('freizeit')) return 'Freizeit';
    return 'allgemeine Nutzung';
  }

  private determineStrainTypeFromMood(moodText: string): string {
    if (
      moodText.includes('entspann') ||
      moodText.includes('schlafen') ||
      moodText.includes('stress')
    ) {
      return 'indica';
    }
    if (
      moodText.includes('energie') ||
      moodText.includes('kreativ') ||
      moodText.includes('fokus')
    ) {
      return 'sativa';
    }
    return 'hybrid';
  }

  private extractKeywordsFromMoodText(moodText: string): string[] {
    const keywords = [];
    const keywordMap = {
      stress: 'stress-relief',
      entspann: 'relaxation',
      kreativ: 'creative',
      energie: 'energizing',
      schmerz: 'pain-relief',
      schlaf: 'sleep-aid',
      angst: 'anxiety-relief',
    };

    for (const [word, keyword] of Object.entries(keywordMap)) {
      if (moodText.includes(word)) {
        keywords.push(keyword);
      }
    }

    return keywords.length > 0 ? keywords : ['cannabis', 'strain'];
  }

  /**
   * Sanitize strain metadata to avoid null values and undefined names
   */
  private sanitizeStrainMetadata(metadata: any): StrainMetadata {
    return {
      strainId: metadata?.strainId || metadata?.id || 'unknown-strain',
      name: metadata?.name || 'Unknown Strain',
      type: metadata?.type || 'hybrid',
      description: metadata?.description || 'Cannabis strain with various effects',
      thc: typeof metadata?.thc === 'number' ? metadata.thc : undefined,
      cbd: typeof metadata?.cbd === 'number' ? metadata.cbd : undefined,
      effects: Array.isArray(metadata?.effects) ? metadata.effects : ['relaxed', 'happy'],
      flavors: Array.isArray(metadata?.flavors) ? metadata.flavors : undefined,
      medical: Array.isArray(metadata?.medical) ? metadata.medical : undefined,
      terpenes: metadata?.terpenes || undefined,
      genetics: metadata?.genetics || undefined,
      breeder: metadata?.breeder || undefined,
      rating: typeof metadata?.rating === 'number' ? metadata.rating : undefined,
      createdAt: metadata?.createdAt || new Date().toISOString(),
    };
  }

  /**
   * Parse terpenes safely, avoiding null returns
   */
  private parseTerpenes(terpenesData: string | undefined): any[] | undefined {
    if (!terpenesData) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(terpenesData);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : undefined;
    } catch (error) {
      this.logger.warn(`Failed to parse terpenes data: ${terpenesData}`);
      return undefined;
    }
  }

  /**
   * Generate AI-powered recommendation text for a specific strain
   */
  private async generateRecommendationText(strain: StrainMetadata): Promise<string> {
    const prompt = `
Du bist ein Cannabis-Experte und Berater. Schreibe einen personalisierten Empfehlungstext für den Cannabis-Strain "${strain.name}".

Strain-Informationen:
- Name: ${strain.name}
- Typ: ${strain.type}
- Beschreibung: ${strain.description}
- THC: ${strain.thc || 'unbekannt'}%
- CBD: ${strain.cbd || 'unbekannt'}%
- Effekte: ${strain.effects?.join(', ') || 'verschiedene Effekte'}
- Geschmäcker: ${strain.flavors?.join(', ') || 'nicht spezifiziert'}
- Medizinische Anwendungen: ${strain.medical?.join(', ') || 'nicht spezifiziert'}
- Genetik: ${strain.genetics || 'nicht spezifiziert'}

Schreibe einen informativen, aber freundlichen Empfehlungstext (ca. 2-3 Sätze), der:
1. Die wichtigsten Eigenschaften des Strains hervorhebt
2. Erklärt, für welche Situationen/Zeiten er geeignet ist
3. Die Effekte und Vorteile beschreibt
4. Auf Deutsch verfasst ist

Der Text soll professionell aber zugänglich sein, als würdest du einem Freund eine Empfehlung geben.
    `;

    try {
      const response = await this.llmService.generateResponse(prompt, []);
      return response.answer;
    } catch (error) {
      this.logger.warn(
        `Could not generate AI recommendation text for ${strain.name}, using fallback`,
      );

      // Fallback recommendation text
      const effectsText = strain.effects?.length
        ? strain.effects.join(', ')
        : 'verschiedene positive Effekte';
      const typeDescription =
        strain.type === 'indica'
          ? 'entspannende Indica-Eigenschaften'
          : strain.type === 'sativa'
            ? 'energetisierende Sativa-Eigenschaften'
            : 'ausgewogene Hybrid-Eigenschaften';

      return `${strain.name} ist ein ${strain.type}-Strain mit ${typeDescription}. Mit Effekten wie ${effectsText} ist er ideal für ${strain.type === 'indica' ? 'entspannte Abende und Erholung' : strain.type === 'sativa' ? 'aktive Tageszeiten und kreative Projekte' : 'vielseitige Anwendungen'}. ${strain.thc ? `Mit ${strain.thc}% THC` : 'Dieser Strain'} bietet eine ausgewogene Erfahrung für Cannabis-Enthusiasten.`;
    }
  }

  /**
   * Answer scientific questions about cannabis using Cognee knowledge graph and research data
   */
  async answerScientificQuestion(questionDto: ScientificQuestionDto): Promise<ScientificAnswerDto> {
    try {
      const startTime = Date.now();
      this.logger.log(
        `Processing scientific question: "${questionDto.question.substring(0, 100)}..."`,
      );

      // Step 1: Query Cognee knowledge graph for relevant research
      const cogneeResults = await this.cogneeService.queryKnowledgeGraph(
        questionDto.question,
        questionDto.maxSources || 5,
      );

      // Step 2: Search our strain database for relevant information
      const strainContext = await this.getRelevantStrainContext(questionDto.question);

      // Step 3: Generate comprehensive scientific answer using LLM
      const scientificAnswer = await this.generateScientificAnswer(
        questionDto,
        cogneeResults,
        strainContext,
      );

      // Step 4: Extract and format sources
      const sources = await this.formatScientificSources(cogneeResults);

      // Step 5: Find related entities from knowledge graph
      const relatedEntities = await this.extractRelatedEntities(cogneeResults);

      // Step 6: Generate scientific insights
      const insights = await this.generateScientificInsights(
        questionDto.question,
        scientificAnswer,
        cogneeResults,
      );

      // Step 7: Find related strains based on scientific findings
      const relatedStrains = await this.findScientificallyRelatedStrains(
        questionDto.question,
        scientificAnswer,
      );

      const processingTime = Date.now() - startTime;

      return {
        answer: scientificAnswer,
        confidence: this.calculateScientificConfidence(cogneeResults, sources),
        sources,
        relatedEntities,
        insights,
        relatedStrains,
        metadata: {
          processingTime,
          sourcesAnalyzed: cogneeResults.results.length,
          cogneeEntitiesFound: relatedEntities.length,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to answer scientific question: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to process scientific question: ${error.message}`);
    }
  }

  /**
   * Get relevant strain context for scientific questions
   */
  private async getRelevantStrainContext(question: string): Promise<any[]> {
    try {
      // Generate embedding for the question
      const questionEmbedding = await this.embeddingsService.generateEmbedding(question);

      // Search in our strain database
      const strainResults = await this.pineconeService.query(questionEmbedding, 3);

      return strainResults.filter(result => result.score >= 0.7);
    } catch (error) {
      this.logger.warn(`Could not get strain context: ${error.message}`);
      return [];
    }
  }

  /**
   * Generate comprehensive scientific answer using LLM
   */
  private async generateScientificAnswer(
    questionDto: ScientificQuestionDto,
    cogneeResults: any,
    strainContext: any[],
  ): Promise<string> {
    const prompt = `
Du bist ein Cannabis-Experte und Forscher. Beantworte die folgende wissenschaftliche Frage basierend auf den verfügbaren Forschungsdaten und Cannabis-Strain-Informationen.

Frage: "${questionDto.question}"
${questionDto.context ? `Kontext: ${questionDto.context}` : ''}
${questionDto.researchAreas ? `Forschungsbereiche: ${questionDto.researchAreas.join(', ')}` : ''}

Verfügbare Forschungsdaten aus Knowledge Graph:
${JSON.stringify(cogneeResults.results, null, 2)}

Relevante Cannabis-Strain Informationen:
${JSON.stringify(strainContext, null, 2)}

Anforderungen für die Antwort:
1. Wissenschaftlich präzise und evidenz-basiert
2. Referenziere spezifische Forschungsergebnisse wenn verfügbar
3. Erkläre Wirkmechanismen auf molekularer Ebene
4. Berücksichtige sowohl Cannabis-Strain-Eigenschaften als auch Forschungsdaten
5. Nutze ${questionDto.language === 'en' ? 'English' : 'German'} als Antwortsprache
6. Strukturiere die Antwort logisch mit klaren Abschnitten
7. Erwähne eventuelle Limitationen oder Unsicherheiten

Gib eine umfassende, wissenschaftlich fundierte Antwort auf die Frage.
    `;

    const response = await this.llmService.generateResponse(prompt, []);
    return response.answer;
  }

  /**
   * Format scientific sources from Cognee results
   */
  private async formatScientificSources(cogneeResults: any): Promise<any[]> {
    return cogneeResults.results.map((result: any, index: number) => ({
      title: result.name || `Research Finding ${index + 1}`,
      type: this.determineSourceType(result),
      relevanceScore: result.relevanceScore || 0.8,
      keyFindings: this.extractKeyFindings(result),
      authors: result.properties?.authors || [],
      year: result.properties?.year || new Date().getFullYear(),
      journal: result.properties?.journal || 'Cannabis Research Database',
    }));
  }

  /**
   * Extract related entities from Cognee results
   */
  private async extractRelatedEntities(cogneeResults: any): Promise<any[]> {
    return cogneeResults.results
      .filter((result: any) => result.type === 'entity')
      .map((entity: any) => ({
        name: entity.name,
        type: entity.type || 'Unknown',
        relationship: this.determineEntityRelationship(entity),
        confidence: entity.properties?.confidence || 0.75,
      }))
      .slice(0, 10); // Limit to top 10 entities
  }

  /**
   * Generate scientific insights from the answer and research
   */
  private async generateScientificInsights(
    question: string,
    answer: string,
    cogneeResults: any,
  ): Promise<any> {
    const insightPrompt = `
Basierend auf der Frage "${question}" und der generierten Antwort, extrahiere strukturierte wissenschaftliche Erkenntnisse:

Antwort: ${answer}
Forschungsdaten: ${JSON.stringify(cogneeResults.results.slice(0, 3), null, 2)}

Extrahiere und formatiere folgende Informationen:
1. Wirkmechanismen (mechanisms of action)
2. Klinische Evidenz (clinical evidence) 
3. Kontraindikationen (contraindications)
4. Zukünftige Forschungsrichtungen (future research)

Gib die Antwort als JSON zurück mit den Keys: mechanismsOfAction, clinicalEvidence, contraindications, futureResearch.
Jeder Wert soll ein Array von strings sein.
    `;

    try {
      const response = await this.llmService.generateResponse(insightPrompt, []);
      return JSON.parse(response.answer);
    } catch (error) {
      // Fallback insights if JSON parsing fails
      return {
        mechanismsOfAction: ['Endocannabinoid system interaction', 'CB1/CB2 receptor binding'],
        clinicalEvidence: ['Limited clinical trials available', 'Preclinical studies show promise'],
        contraindications: ['Consult healthcare provider', 'May interact with medications'],
        futureResearch: ['More clinical trials needed', 'Long-term effects studies required'],
      };
    }
  }

  /**
   * Find scientifically related cannabis strains
   */
  private async findScientificallyRelatedStrains(
    question: string,
    scientificAnswer: string,
  ): Promise<any[]> {
    try {
      // Extract key terms from question and answer
      const combinedText = `${question} ${scientificAnswer}`;
      const embedding = await this.embeddingsService.generateEmbedding(combinedText);

      // Search for related strains
      const strainResults = await this.pineconeService.query(embedding, 3);

      return strainResults
        .filter(result => result.score >= 0.6)
        .map(result => ({
          name: (result.metadata as any)?.name || 'Unknown Strain',
          relevance: this.calculateStrainRelevance(result.score),
          scientificBasis: this.generateScientificBasis(result.metadata, question),
        }));
    } catch (error) {
      this.logger.warn(`Could not find related strains: ${error.message}`);
      return [];
    }
  }

  /**
   * Calculate confidence score for scientific answers
   */
  private calculateScientificConfidence(cogneeResults: any, sources: any[]): number {
    if (!cogneeResults.results.length) return 0.3;

    const avgRelevance =
      cogneeResults.results.reduce(
        (sum: number, result: any) => sum + (result.relevanceScore || 0.5),
        0,
      ) / cogneeResults.results.length;

    const sourceQuality = sources.length > 0 ? 0.2 : 0;
    const baseConfidence = 0.6;

    return Math.min(baseConfidence + avgRelevance * 0.3 + sourceQuality, 1.0);
  }

  // Helper methods
  private determineSourceType(result: any): string {
    const type = result.type?.toLowerCase() || '';
    if (type.includes('study')) return 'clinical_study';
    if (type.includes('review')) return 'review_article';
    if (type.includes('case')) return 'case_study';
    return 'research_paper';
  }

  private extractKeyFindings(result: any): string[] {
    const findings = [];
    if (result.properties?.description) findings.push(result.properties.description);
    if (result.properties?.conclusion) findings.push(result.properties.conclusion);
    if (findings.length === 0) findings.push('Research finding from cannabis knowledge base');
    return findings;
  }

  private determineEntityRelationship(entity: any): string {
    const relationships = ['interacts with', 'influences', 'affects', 'modulates', 'related to'];
    return relationships[Math.floor(Math.random() * relationships.length)];
  }

  private calculateStrainRelevance(score: number): string {
    if (score > 0.8) return 'Highly relevant';
    if (score > 0.6) return 'Moderately relevant';
    return 'Potentially relevant';
  }

  private generateScientificBasis(metadata: any, question: string): string {
    const effects = metadata?.effects || [];
    const medical = metadata?.medical || [];

    if (effects.length > 0) {
      return `This strain's ${effects.join(', ')} effects are scientifically relevant to the question about ${question.substring(0, 50)}...`;
    }

    if (medical.length > 0) {
      return `Medical applications including ${medical.join(', ')} provide scientific basis for relevance.`;
    }

    return 'Scientific relevance based on cannabinoid profile and reported effects.';
  }

  /**
   * Extract structured strain data from text using AI
   */
  private async extractStrainDataFromText(processTextDto: ProcessStrainTextDto): Promise<any> {
    const prompt = `
Du bist ein Cannabis-Experte. Analysiere folgenden Text über eine Cannabis-Sorte und extrahiere strukturierte Daten:

Text: "${processTextDto.text}"
${processTextDto.strainNameHint ? `Strain Name Hint: ${processTextDto.strainNameHint}` : ''}
${processTextDto.strainTypeHint ? `Strain Type Hint: ${processTextDto.strainTypeHint}` : ''}

Extrahiere folgende Informationen und gib sie als JSON zurück:

{
  "name": "strain name (required)",
  "type": "indica|sativa|hybrid (required)",
  "description": "clean description summary (required)",
  "thc": number or null,
  "cbd": number or null,
  "effects": ["array", "of", "effects"] (required),
  "flavors": ["array", "of", "flavors"] or null,
  "medical": ["array", "of", "medical", "uses"] or null,
  "terpenes": [{"name": "terpene", "percentage": number}] or null,
  "genetics": "parent strains" or null,
  "breeder": "breeder name" or null,
  "confidence": number between 0-1
}

Wichtige Regeln:
1. Extrahiere nur Informationen die klar aus dem Text hervorgehen
2. Wenn unsicher, setze confidence niedriger
3. THC/CBD als Prozentzahlen ohne % Symbol
4. Effects sind immer required - falls nicht klar, nutze Standard-Cannabis-Effekte
5. Name muss extrahiert werden - falls nicht klar, generiere einen basierend auf den Eigenschaften
6. Type muss indica, sativa oder hybrid sein
7. Gib nur valides JSON zurück, keine anderen Texte

Analysiere den Text sorgfältig und extrahiere die Daten:
    `;

    try {
      const response = await this.llmService.generateResponse(prompt, []);
      const extracted = JSON.parse(response.answer);

      // Validation and fallbacks
      if (!extracted.name || !extracted.type || !extracted.effects?.length) {
        throw new Error('Missing required fields in extraction');
      }

      return extracted;
    } catch (error) {
      this.logger.warn(`LLM extraction failed, using fallback: ${error.message}`);

      // Fallback extraction using simple text analysis
      return this.fallbackStrainExtraction(processTextDto);
    }
  }

  /**
   * Fallback extraction using simple pattern matching
   */
  private fallbackStrainExtraction(processTextDto: ProcessStrainTextDto): any {
    const text = processTextDto.text.toLowerCase();

    // Extract name
    let name = processTextDto.strainNameHint || this.extractNameFromText(text) || 'Unknown Strain';

    // Extract type
    let type = 'hybrid';
    if (text.includes('indica') && !text.includes('sativa')) type = 'indica';
    else if (text.includes('sativa') && !text.includes('indica')) type = 'sativa';

    // Extract THC/CBD
    const thcMatch = text.match(/thc[\s:]*(\d+(?:\.\d+)?)/i);
    const cbdMatch = text.match(/cbd[\s:]*(\d+(?:\.\d+)?)/i);

    // Extract basic effects
    const effects = this.extractEffectsFromText(text);

    return {
      name,
      type,
      description: processTextDto.text.substring(0, 200) + '...',
      thc: thcMatch ? parseFloat(thcMatch[1]) : null,
      cbd: cbdMatch ? parseFloat(cbdMatch[1]) : null,
      effects: effects.length > 0 ? effects : ['relaxed', 'happy'],
      flavors: this.extractFlavorsFromText(text),
      medical: this.extractMedicalFromText(text),
      terpenes: null,
      genetics: null,
      breeder: null,
      confidence: 0.6,
    };
  }

  /**
   * Store extracted strain data in Cognee knowledge graph
   */
  private async storeStrainInCognee(strainData: any, originalText: string): Promise<any> {
    try {
      const uploadData: UploadDataDto = {
        content: originalText,
        dataType: CogneeDataType.TEXT,
        title: `Cannabis Strain: ${strainData.name}`,
        metadata: {
          source: 'strain_text_processing',
          tags: ['cannabis', 'strain', strainData.type],
          createdAt: new Date().toISOString(),
          additionalData: {
            extractedStrain: strainData,
            processingMethod: 'ai_extraction',
            strainName: strainData.name,
            strainType: strainData.type,
            thc: strainData.thc,
            cbd: strainData.cbd,
            effects: strainData.effects,
          },
        },
      };

      const result = await this.cogneeService.uploadData(uploadData);

      return {
        success: true,
        id: result.id,
        entitiesCount: result.entitiesCount,
        relationshipsCount: result.relationshipsCount,
      };
    } catch (error) {
      this.logger.error(`Failed to store in Cognee: ${error.message}`);
      return {
        success: false,
        id: null,
        entitiesCount: 0,
        relationshipsCount: 0,
      };
    }
  }

  /**
   * Store extracted strain in Pinecone for similarity search
   */
  private async storeStrainInPinecone(strainData: any, strainId: string): Promise<any> {
    try {
      // Create comprehensive text for embedding
      const embeddingText = this.createStrainEmbeddingTextFromExtracted(strainData);

      // Generate embedding
      const embedding = await this.embeddingsService.generateEmbedding(embeddingText);

      // Prepare metadata
      const metadata: StrainMetadata = {
        strainId,
        name: strainData.name,
        type: strainData.type,
        description: strainData.description,
        thc: strainData.thc,
        cbd: strainData.cbd,
        effects: strainData.effects,
        flavors: strainData.flavors,
        medical: strainData.medical,
        terpenes: strainData.terpenes ? JSON.stringify(strainData.terpenes) : undefined,
        genetics: strainData.genetics,
        breeder: strainData.breeder,
        rating: undefined,
        createdAt: new Date().toISOString(),
      };

      // Store in Pinecone
      await this.pineconeService.upsert([
        {
          id: strainId,
          values: embedding,
          metadata: {
            ...metadata,
            text: embeddingText,
            source: `cannabis-strain-${strainData.name}`,
            chunk_index: 0,
            timestamp: new Date().toISOString(),
          },
        },
      ]);

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to store in Pinecone: ${error.message}`);
      return { success: false };
    }
  }

  /**
   * Create embedding text from extracted strain data
   */
  private createStrainEmbeddingTextFromExtracted(strain: any): string {
    const parts = [
      `Cannabis strain: ${strain.name}`,
      `Type: ${strain.type}`,
      `Description: ${strain.description}`,
      `Effects: ${strain.effects.join(', ')}`,
    ];

    if (strain.thc) parts.push(`THC: ${strain.thc}%`);
    if (strain.cbd) parts.push(`CBD: ${strain.cbd}%`);
    if (strain.flavors?.length) parts.push(`Flavors: ${strain.flavors.join(', ')}`);
    if (strain.medical?.length) parts.push(`Medical uses: ${strain.medical.join(', ')}`);
    if (strain.terpenes?.length) {
      const terpeneNames = strain.terpenes.map((t: any) => `${t.name} (${t.percentage}%)`);
      parts.push(`Terpenes: ${terpeneNames.join(', ')}`);
    }
    if (strain.genetics) parts.push(`Genetics: ${strain.genetics}`);

    return parts.join('. ');
  }

  // Text extraction helper methods
  private extractNameFromText(text: string): string | null {
    // Look for quoted strain names or capitalized words
    const patterns = [
      /"([^"]+)"/,
      /'([^']+)'/,
      /strain[:\s]+([A-Z][A-Za-z\s]+)/i,
      /called[:\s]+([A-Z][A-Za-z\s]+)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1].length > 2 && match[1].length < 30) {
        return match[1].trim();
      }
    }
    return null;
  }

  private extractEffectsFromText(text: string): string[] {
    const commonEffects = [
      'relaxed',
      'happy',
      'euphoric',
      'uplifted',
      'creative',
      'focused',
      'energetic',
      'calm',
      'sleepy',
      'giggly',
      'hungry',
      'talkative',
    ];

    return commonEffects.filter(
      effect => text.includes(effect) || text.includes(effect.replace('ed', 'ing')),
    );
  }

  private extractFlavorsFromText(text: string): string[] | null {
    const commonFlavors = [
      'sweet',
      'earthy',
      'citrus',
      'berry',
      'pine',
      'fruity',
      'spicy',
      'diesel',
      'skunk',
      'vanilla',
      'chocolate',
      'mint',
      'lemon',
    ];

    const found = commonFlavors.filter(flavor => text.includes(flavor));
    return found.length > 0 ? found : null;
  }

  private extractMedicalFromText(text: string): string[] | null {
    const medicalUses = [
      'pain',
      'stress',
      'anxiety',
      'depression',
      'insomnia',
      'nausea',
      'headache',
      'inflammation',
      'seizures',
      'ptsd',
    ];

    const found = medicalUses.filter(condition => text.includes(condition));
    return found.length > 0 ? found : null;
  }

  /**
   * Get Qdrant strain recommendations based on mood
   */
  async getQdrantStrainRecommendations(moodRequest: {
    moodDescription: string;
    maxResults?: number;
  }): Promise<any> {
    try {
      const startTime = Date.now();
      this.logger.log(
        `Generating Qdrant strain recommendations for mood: "${moodRequest.moodDescription.substring(0, 50)}..."`
      );

      // Analyze mood
      const moodAnalysis = await this.analyzeMoodForQdrantSearch(moodRequest.moodDescription);

      // Search for similar strains using vectorization service
      const strains = await this.vectorizationService.findSimilarStrains(
        moodRequest.moodDescription,
        moodRequest.maxResults || 5
      );

      if (strains.length === 0) {
        return {
          moodAnalysis,
          strains: [],
          totalResults: 0,
          processingTime: Date.now() - startTime,
          generatedAt: new Date().toISOString(),
          message: 'Keine passenden Strains für deine Stimmung gefunden'
        };
      }

      // Generate personalized recommendation text for each strain
      const enrichedStrains = await Promise.all(
        strains.map(async (strain) => {
          const recommendationText = await this.generateQdrantRecommendationText(
            strain,
            moodRequest.moodDescription,
            moodAnalysis
          );

          return {
            ...strain,
            recommendationText
          };
        })
      );

      const processingTime = Date.now() - startTime;

      return {
        moodAnalysis,
        strains: enrichedStrains,
        totalResults: enrichedStrains.length,
        processingTime,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Failed to generate Qdrant strain recommendations: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to generate Qdrant strain recommendations: ${error.message}`);
    }
  }

  /**
   * Vectorize MongoDB strains collection to Qdrant
   */
  async vectorizeMongoStrains(): Promise<any> {
    try {
      const startTime = Date.now();
      this.logger.log('Starting vectorization of MongoDB strains to Qdrant');

      // Fetch all strains from MongoDB
      const mongoStrains = await this.strainService.findAll();

      if (mongoStrains.length === 0) {
        this.logger.warn('No strains found in MongoDB collection');
        return {
          message: 'No strains found in MongoDB collection to vectorize',
          totalStrains: 0,
          successfulVectorizations: 0,
          failures: 0,
          processingTime: Date.now() - startTime
        };
      }

      // Convert MongoDB documents to vectorization format
      const strainsForVectorization = mongoStrains.map(strain => ({
        _id: (strain as any)._id?.toString() || strain.name,
        name: strain.name,
        type: strain.type as 'indica' | 'sativa' | 'hybrid',
        description: strain.description,
        thc: strain.thc,
        cbd: strain.cbd,
        effects: strain.effects || [],
        flavors: strain.flavors || [],
        medical: strain.medical || [],
        genetics: strain.genetics,
        breeder: strain.breeder,
      }));

      await this.vectorizationService.vectorizeStrains(strainsForVectorization);

      const processingTime = Date.now() - startTime;

      return {
        message: `Successfully vectorized ${mongoStrains.length} strains from MongoDB to Qdrant`,
        totalStrains: mongoStrains.length,
        successfulVectorizations: mongoStrains.length,
        failures: 0,
        processingTime
      };
    } catch (error) {
      this.logger.error(`Failed to vectorize MongoDB strains: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to vectorize MongoDB strains: ${error.message}`);
    }
  }

  private async analyzeMoodForQdrantSearch(moodDescription: string): Promise<any> {
    const prompt = `
Analysiere diese Stimmungsbeschreibung für Cannabis-Strain-Empfehlungen:

Stimmung: "${moodDescription}"

Extrahiere und gib als JSON zurück:
{
  "detectedMood": "kurze Zusammenfassung der Hauptstimmung",
  "recommendedEffects": ["array", "von", "gewünschten", "effekten"],
  "strainType": "indica|sativa|hybrid - empfohlener Strain-Typ",
  "timeContext": "vermutete Tageszeit",
  "intensity": "low|medium|high"
}
    `;

    try {
      const response = await this.llmService.generateResponse(prompt, []);
      return JSON.parse(response.answer);
    } catch (error) {
      this.logger.warn(`Could not analyze mood with AI, using fallback: ${error.message}`);

      const moodLower = moodDescription.toLowerCase();
      return {
        detectedMood: moodDescription.substring(0, 100),
        recommendedEffects: this.extractEffectsFromMoodText(moodLower),
        strainType: this.determineStrainTypeFromMood(moodLower),
        timeContext: this.extractTimeContext(moodLower),
        intensity: 'medium'
      };
    }
  }

  private async generateQdrantRecommendationText(
    strain: any,
    moodDescription: string,
    moodAnalysis: any
  ): Promise<string> {
    const prompt = `
Du bist ein Cannabis-Experte. Schreibe einen personalisierten Empfehlungstext für "${strain.name}".

Nutzerstimmung: "${moodDescription}"
Stimmungsanalyse: ${JSON.stringify(moodAnalysis)}

Strain-Info:
- Name: ${strain.name}
- Typ: ${strain.type}
- Effekte: ${strain.effects?.join(', ') || 'verschiedene'}
- THC: ${strain.thc || 'unbekannt'}%

Schreibe 2-3 Sätze, die erklären warum dieser Strain zur Stimmung passt.
    `;

    try {
      const response = await this.llmService.generateResponse(prompt, []);
      return response.answer;
    } catch (error) {
      return `${strain.name} ist eine ausgezeichnete Wahl für deine aktuelle Stimmung. Dieser ${strain.type}-Strain bietet ${strain.effects?.join(', ') || 'vielseitige Effekte'} und ist perfekt für ${moodAnalysis.timeContext || 'verschiedene Gelegenheiten'}.`;
    }
  }

  private generateMockStrains(): any[] {
    return [
      {
        _id: '1',
        name: 'Blue Dream',
        type: 'hybrid',
        description: 'A balanced hybrid strain providing cerebral euphoria and body relaxation',
        thc: 18,
        cbd: 0.2,
        effects: ['happy', 'relaxed', 'creative', 'euphoric'],
        flavors: ['berry', 'sweet', 'vanilla']
      },
      {
        _id: '2',
        name: 'Green Crack',
        type: 'sativa',
        description: 'An energizing sativa perfect for daytime use',
        thc: 20,
        cbd: 0.1,
        effects: ['energetic', 'focused', 'creative', 'uplifted'],
        flavors: ['citrus', 'sweet', 'tropical']
      },
      {
        _id: '3',
        name: 'Purple Kush',
        type: 'indica',
        description: 'A pure indica strain perfect for evening relaxation',
        thc: 22,
        cbd: 0.1,
        effects: ['relaxed', 'sleepy', 'happy', 'euphoric'],
        flavors: ['grape', 'sweet', 'earthy']
      },
      {
        _id: '4',
        name: 'Sour Diesel',
        type: 'sativa',
        description: 'Fast-acting energizing strain with diesel aroma',
        thc: 19,
        cbd: 0.2,
        effects: ['energetic', 'uplifted', 'creative', 'focused'],
        flavors: ['diesel', 'pungent', 'citrus']
      },
      {
        _id: '5',
        name: 'OG Kush',
        type: 'hybrid',
        description: 'Classic hybrid with complex terpene profile',
        thc: 24,
        cbd: 0.1,
        effects: ['relaxed', 'euphoric', 'happy', 'uplifted'],
        flavors: ['pine', 'woody', 'citrus']
      }
    ];
  }
}
