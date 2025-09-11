import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateStrainDto, StrainType } from './dto/create-strain.dto';
import { MoodRecommendationDto, TimeOfDay, ActivityContext } from './dto/mood-recommendation.dto';
import { StrainRecommendationResponseDto, StrainMatch, RecommendationContext } from './dto/strain-recommendation.dto';
import { PineconeService } from '../pinecone/pinecone.service';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { LLMService } from '../llm/llm.service';
import { v4 as uuidv4 } from 'uuid';

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
      await this.pineconeService.upsert([{
        id: strainId,
        values: embedding,
        metadata: { 
          ...metadata, 
          text: strainText,
          source: `cannabis-strain-${createStrainDto.name}`,
          chunk_index: 0,
          timestamp: new Date().toISOString()
        }
      }]);

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
  async getMoodBasedRecommendations(moodRequest: MoodRecommendationDto): Promise<StrainRecommendationResponseDto> {
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
        moodRequest.maxResults || 5
      );

      // Filter by score
      const filteredResults = searchResults.filter(result => result.score >= (moodRequest.minScore || 0.7));

      if (filteredResults.length === 0) {
        throw new NotFoundException('No suitable strain recommendations found for your mood profile');
      }

      // Process results and generate recommendations
      const recommendations = await this.processSearchResults(filteredResults, moodRequest, analyzedMood);
      
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
      
      return [{
        message: 'Full strain listing not available with current Pinecone setup',
        totalVectors: stats.totalVectorCount || 0,
        recommendation: 'Use specific strain queries or mood-based recommendations instead'
      }];
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
    analyzedMood: any
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
    analyzedMood: any
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
  private generateDosageRecommendation(strain: StrainMetadata, moodRequest: MoodRecommendationDto): string {
    const highTHC = strain.thc && strain.thc > 20;
    const eveningUse = moodRequest.timeOfDay === TimeOfDay.EVENING || moodRequest.timeOfDay === TimeOfDay.NIGHT;
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
  private createRecommendationContext(moodRequest: MoodRecommendationDto, analyzedMood: any): RecommendationContext {
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
    
    if (moodRequest.moodDescription.toLowerCase().includes('stress')) keywords.push('stress-relief');
    if (moodRequest.moodDescription.toLowerCase().includes('relax')) keywords.push('relaxation');
    if (moodRequest.moodDescription.toLowerCase().includes('creative')) keywords.push('creativity');
    if (moodRequest.moodDescription.toLowerCase().includes('energy')) keywords.push('energizing');
    if (moodRequest.moodDescription.toLowerCase().includes('sleep')) keywords.push('sleep-aid');
    if (moodRequest.timeOfDay === TimeOfDay.EVENING) keywords.push('evening-use');
    if (moodRequest.activityContext === ActivityContext.CREATIVE) keywords.push('creative-enhancement');
    
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
}