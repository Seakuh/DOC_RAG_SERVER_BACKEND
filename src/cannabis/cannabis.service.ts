import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateStrainDto, StrainType } from './dto/create-strain.dto';
import { MoodRecommendationDto, TimeOfDay, ActivityContext } from './dto/mood-recommendation.dto';
import { StrainRecommendationResponseDto, StrainMatch, RecommendationContext } from './dto/strain-recommendation.dto';
import { PineconeService } from '../pinecone/pinecone.service';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { LLMService } from '../llm/llm.service';
import { CogneeService } from '../cognee/cognee.service';
import { ScientificQuestionDto, ScientificAnswerDto } from './dto/scientific-question.dto';
import { ProcessStrainTextDto, ProcessedStrainResponseDto } from './dto/process-strain-text.dto';
import { UploadDataDto, CogneeDataType } from '../cognee/dto/upload-data.dto';
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
    private readonly cogneeService: CogneeService,
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

  /**
   * Process cannabis strain text and extract structured data using AI
   */
  async processStrainFromText(processTextDto: ProcessStrainTextDto): Promise<ProcessedStrainResponseDto> {
    try {
      const startTime = Date.now();
      const strainId = uuidv4();
      
      this.logger.log(`Processing strain text: "${processTextDto.text.substring(0, 100)}..."`);

      // Step 1: Extract structured strain data using LLM
      const extractedStrain = await this.extractStrainDataFromText(processTextDto);
      
      // Step 2: Store in Cognee knowledge graph
      const cogneeResult = await this.storeStrainInCognee(extractedStrain, processTextDto.text);
      
      // Step 3: Store in Pinecone vector database for recommendations
      const pineconeResult = await this.storeStrainInPinecone(extractedStrain, strainId);
      
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
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error(`Failed to process strain text: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to process strain text: ${error.message}`);
    }
  }

  /**
   * Answer scientific questions about cannabis using Cognee knowledge graph and research data
   */
  async answerScientificQuestion(questionDto: ScientificQuestionDto): Promise<ScientificAnswerDto> {
    try {
      const startTime = Date.now();
      this.logger.log(`Processing scientific question: "${questionDto.question.substring(0, 100)}..."`);

      // Step 1: Query Cognee knowledge graph for relevant research
      const cogneeResults = await this.cogneeService.queryKnowledgeGraph(
        questionDto.question,
        questionDto.maxSources || 5
      );

      // Step 2: Search our strain database for relevant information
      const strainContext = await this.getRelevantStrainContext(questionDto.question);

      // Step 3: Generate comprehensive scientific answer using LLM
      const scientificAnswer = await this.generateScientificAnswer(
        questionDto,
        cogneeResults,
        strainContext
      );

      // Step 4: Extract and format sources
      const sources = await this.formatScientificSources(cogneeResults);

      // Step 5: Find related entities from knowledge graph
      const relatedEntities = await this.extractRelatedEntities(cogneeResults);

      // Step 6: Generate scientific insights
      const insights = await this.generateScientificInsights(
        questionDto.question,
        scientificAnswer,
        cogneeResults
      );

      // Step 7: Find related strains based on scientific findings
      const relatedStrains = await this.findScientificallyRelatedStrains(
        questionDto.question,
        scientificAnswer
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
          timestamp: new Date().toISOString()
        }
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
    strainContext: any[]
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
      journal: result.properties?.journal || 'Cannabis Research Database'
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
        confidence: entity.properties?.confidence || 0.75
      }))
      .slice(0, 10); // Limit to top 10 entities
  }

  /**
   * Generate scientific insights from the answer and research
   */
  private async generateScientificInsights(
    question: string,
    answer: string,
    cogneeResults: any
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
        futureResearch: ['More clinical trials needed', 'Long-term effects studies required']
      };
    }
  }

  /**
   * Find scientifically related cannabis strains
   */
  private async findScientificallyRelatedStrains(
    question: string,
    scientificAnswer: string
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
          scientificBasis: this.generateScientificBasis(result.metadata, question)
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
    
    const avgRelevance = cogneeResults.results.reduce((sum: number, result: any) => 
      sum + (result.relevanceScore || 0.5), 0) / cogneeResults.results.length;
    
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
      confidence: 0.6
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
            effects: strainData.effects
          }
        }
      };

      const result = await this.cogneeService.uploadData(uploadData);
      
      return {
        success: true,
        id: result.id,
        entitiesCount: result.entitiesCount,
        relationshipsCount: result.relationshipsCount
      };
    } catch (error) {
      this.logger.error(`Failed to store in Cognee: ${error.message}`);
      return {
        success: false,
        id: null,
        entitiesCount: 0,
        relationshipsCount: 0
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
      await this.pineconeService.upsert([{
        id: strainId,
        values: embedding,
        metadata: { 
          ...metadata, 
          text: embeddingText,
          source: `cannabis-strain-${strainData.name}`,
          chunk_index: 0,
          timestamp: new Date().toISOString()
        }
      }]);

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
      /called[:\s]+([A-Z][A-Za-z\s]+)/i
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
      'relaxed', 'happy', 'euphoric', 'uplifted', 'creative', 'focused', 
      'energetic', 'calm', 'sleepy', 'giggly', 'hungry', 'talkative'
    ];

    return commonEffects.filter(effect => 
      text.includes(effect) || text.includes(effect.replace('ed', 'ing'))
    );
  }

  private extractFlavorsFromText(text: string): string[] | null {
    const commonFlavors = [
      'sweet', 'earthy', 'citrus', 'berry', 'pine', 'fruity', 'spicy', 
      'diesel', 'skunk', 'vanilla', 'chocolate', 'mint', 'lemon'
    ];

    const found = commonFlavors.filter(flavor => text.includes(flavor));
    return found.length > 0 ? found : null;
  }

  private extractMedicalFromText(text: string): string[] | null {
    const medicalUses = [
      'pain', 'stress', 'anxiety', 'depression', 'insomnia', 'nausea', 
      'headache', 'inflammation', 'seizures', 'ptsd'
    ];

    const found = medicalUses.filter(condition => text.includes(condition));
    return found.length > 0 ? found : null;
  }
}