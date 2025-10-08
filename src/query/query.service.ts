import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { QdrantService, QdrantQueryResult } from '../qdrant/qdrant.service';
import { LLMService, LLMResponse } from '../llm/llm.service';
import { QueryDto } from './dto/query.dto';
import { QueryResponseDto } from './dto/query-response.dto';
import { SimilarDocumentsDto, SimilarDocumentsResponseDto } from './dto/similar-documents.dto';

@Injectable()
export class QueryService {
  private readonly logger = new Logger(QueryService.name);

  constructor(
    private embeddingsService: EmbeddingsService,
    private qdrantService: QdrantService,
    private llmService: LLMService,
  ) {}

  async query(queryDto: QueryDto): Promise<QueryResponseDto> {
    const startTime = Date.now();
    const { question, maxResults = 5, minScore = 0.5, source } = queryDto;

    try {
      if (!question?.trim()) {
        throw new BadRequestException('Question cannot be empty');
      }

      this.logger.log(`Processing query: "${question.substring(0, 50)}..."`);

      // Generate embedding for the question
      const questionEmbedding = await this.embeddingsService.generateEmbedding(question);

      // Build filter for vector query
      const filter: Record<string, any> = {};
      if (source) {
        filter.source = { $eq: source };
      }

      // Query Qdrant for relevant documents
      const similarChunks: QdrantQueryResult[] = await this.qdrantService.query(
        questionEmbedding,
        maxResults * 2, // Get more results to filter by score
        Object.keys(filter).length > 0 ? filter : undefined
      );

      // Filter by minimum score
      const relevantChunks = similarChunks.filter(chunk => chunk.score >= minScore);

      if (relevantChunks.length === 0) {
        const duration = Date.now() - startTime;
        this.logger.log(`No relevant documents found for query in ${duration}ms`);
        
        return {
          answer: 'Entschuldigung, ich konnte keine relevanten Informationen in den verfügbaren Dokumenten zu Ihrer Frage finden. Bitte versuchen Sie eine andere Formulierung oder überprüfen Sie, ob entsprechende Dokumente hochgeladen wurden.',
          sources: [],
          confidence: 0,
          tokenUsage: {
            prompt: 0,
            completion: 0,
            total: 0,
          },
        };
      }

      // Limit to requested number of results
      const finalChunks = relevantChunks.slice(0, maxResults);

      // Generate response using LLM
      const llmResponse: LLMResponse = await this.llmService.generateResponse(
        question,
        finalChunks,
        {
          maxTokens: 800,
          temperature: 0.7,
          includeSourceMetadata: true,
        }
      );

      const duration = Date.now() - startTime;
      this.logger.log(`Query completed in ${duration}ms with ${finalChunks.length} relevant chunks`);

      return {
        answer: llmResponse.answer,
        sources: llmResponse.sources,
        confidence: llmResponse.confidence,
        tokenUsage: llmResponse.tokenUsage,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Query failed after ${duration}ms:`, error);
      throw error;
    }
  }

  async findSimilarDocuments(similarDto: SimilarDocumentsDto): Promise<SimilarDocumentsResponseDto> {
    const startTime = Date.now();
    const { text, limit = 10, minScore = 0.5 } = similarDto;

    try {
      if (!text?.trim()) {
        throw new BadRequestException('Text cannot be empty');
      }

      this.logger.log(`Finding similar documents for: "${text.substring(0, 50)}..."`);

      // Generate embedding for the input text
      const textEmbedding = await this.embeddingsService.generateEmbedding(text);

      // Query Qdrant for similar documents
      const similarChunks = await this.qdrantService.query(
        textEmbedding,
        limit * 2 // Get more results to filter by score
      );

      // Filter by minimum score and limit results
      const filteredChunks = similarChunks
        .filter(chunk => chunk.score >= minScore)
        .slice(0, limit);

      const documents = filteredChunks.map(chunk => ({
        id: chunk.id,
        score: chunk.score,
        source: chunk.metadata.source,
        page: chunk.metadata.page,
        chunk_index: chunk.metadata.chunk_index,
        text: chunk.text,
      }));

      const duration = Date.now() - startTime;
      this.logger.log(`Found ${documents.length} similar documents in ${duration}ms`);

      return {
        documents,
        total: similarChunks.length,
        returned: documents.length,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Similar documents search failed after ${duration}ms:`, error);
      throw error;
    }
  }

  async explainQuery(question: string): Promise<{
    explanation: string;
    embedding_preview: number[];
    search_strategy: string;
  }> {
    try {
      const embedding = await this.embeddingsService.generateEmbedding(question);
      
      return {
        explanation: `Die Frage wird in einen 1536-dimensionalen Vektor umgewandelt und mit gespeicherten Dokumenten verglichen.`,
        embedding_preview: embedding.slice(0, 10), // First 10 dimensions
        search_strategy: `Semantische Suche mit Cosinus-Ähnlichkeit, Mindest-Score: 0.5`,
      };
    } catch (error) {
      this.logger.error('Failed to explain query:', error);
      throw error;
    }
  }

  async getQueryStats(): Promise<{
    totalQueries: number;
    avgResponseTime: number;
    avgConfidence: number;
    popularQueries: Array<{ query: string; count: number }>;
  }> {
    // This would require proper tracking in a real implementation
    return {
      totalQueries: 0,
      avgResponseTime: 0,
      avgConfidence: 0,
      popularQueries: [],
    };
  }

  async healthCheck(): Promise<{
    status: string;
    services: {
      embeddings: boolean;
      qdrant: boolean;
      llm: boolean;
    };
    timestamp: string;
  }> {
    const services = {
      embeddings: false,
      qdrant: false,
      llm: false,
    };

    try {
      // Test embeddings service
      await this.embeddingsService.generateEmbedding('test');
      services.embeddings = true;
    } catch (error) {
      this.logger.warn('Embeddings service health check failed:', error);
    }

    try {
      // Test Qdrant service
      await this.qdrantService.getStats();
      services.qdrant = true;
    } catch (error) {
      this.logger.warn('Qdrant service health check failed:', error);
    }

    try {
      // Test LLM service (lightweight test)
      await this.llmService.generateResponse('test', [], { maxTokens: 10 });
      services.llm = true;
    } catch (error) {
      this.logger.warn('LLM service health check failed:', error);
    }

    const allHealthy = Object.values(services).every(service => service);
    
    return {
      status: allHealthy ? 'healthy' : 'degraded',
      services,
      timestamp: new Date().toISOString(),
    };
  }
}
