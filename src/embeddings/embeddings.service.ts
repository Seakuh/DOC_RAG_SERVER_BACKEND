import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface TextChunk {
  text: string;
  metadata: {
    source: string;
    page?: number;
    chunk_index: number;
    timestamp: string;
  };
}

@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const startTime = Date.now();

      const embeddingModel = this.configService.get<string>('EMBEDDING_MODEL', 'text-embedding-ada-002');
      this.logger.log(`Using embedding model: ${embeddingModel}`);

      const embeddingConfig: any = {
        model: embeddingModel,
        input: text,
      };

      // For text-embedding-3-small and text-embedding-3-large, we can specify dimensions
      if (embeddingModel === 'text-embedding-3-small') {
        embeddingConfig.dimensions = 1536;
      } else if (embeddingModel === 'text-embedding-3-large') {
        embeddingConfig.dimensions = 3072;
      }

      const response = await this.openai.embeddings.create(embeddingConfig);

      const duration = Date.now() - startTime;
      this.logger.log(`Generated embedding in ${duration}ms`);

      return response.data[0].embedding;
    } catch (error) {
      this.logger.error('Failed to generate embedding:', error);
      throw new Error(`OpenAI embedding failed: ${error.message}`);
    }
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const startTime = Date.now();

      // OpenAI API has a limit on batch size, process in chunks of 100
      const batchSize = 100;
      const results: number[][] = [];

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);

        const embeddingModel = this.configService.get<string>('EMBEDDING_MODEL', 'text-embedding-ada-002');
        const embeddingConfig: any = {
          model: embeddingModel,
          input: batch,
        };
        
        // Für Konsistenz mit Einzelaufrufen nutzen wir die gleiche Dimension
        if (embeddingModel === 'text-embedding-3-small') {
          embeddingConfig.dimensions = 1536;
        }

        const response = await this.openai.embeddings.create(embeddingConfig);

        const batchEmbeddings = response.data.map(item => item.embedding);
        results.push(...batchEmbeddings);

        this.logger.log(
          `Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)}`,
        );
      }

      const duration = Date.now() - startTime;
      this.logger.log(`Generated ${texts.length} embeddings in ${duration}ms`);

      return results;
    } catch (error) {
      this.logger.error('Failed to generate batch embeddings:', error);
      throw new Error(`OpenAI batch embedding failed: ${error.message}`);
    }
  }

  chunkText(
    text: string,
    chunkSize: number = 700,
    overlap: number = 100,
    source: string,
    page?: number,
  ): TextChunk[] {
    const chunks: TextChunk[] = [];
    const sentences = this.splitIntoSentences(text);

    let currentChunk = '';
    let chunkIndex = 0;
    const timestamp = new Date().toISOString();

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;

      if (potentialChunk.length <= chunkSize) {
        currentChunk = potentialChunk;
      } else {
        if (currentChunk) {
          chunks.push({
            text: currentChunk.trim(),
            metadata: {
              source,
              page,
              chunk_index: chunkIndex++,
              timestamp,
            },
          });

          // Handle overlap
          const overlapText = this.getOverlapText(currentChunk, overlap);
          currentChunk = overlapText + (overlapText ? ' ' : '') + sentence;
        } else {
          // Single sentence is too long, split it
          const splitSentence = this.splitLongSentence(sentence, chunkSize);
          for (const part of splitSentence) {
            chunks.push({
              text: part.trim(),
              metadata: {
                source,
                page,
                chunk_index: chunkIndex++,
                timestamp,
              },
            });
          }
        }
      }
    }

    // Add the last chunk
    if (currentChunk.trim()) {
      chunks.push({
        text: currentChunk.trim(),
        metadata: {
          source,
          page,
          chunk_index: chunkIndex,
          timestamp,
        },
      });
    }

    this.logger.log(
      `Split text into ${chunks.length} chunks (${chunkSize} chars, ${overlap} overlap)`,
    );
    return chunks;
  }

  private splitIntoSentences(text: string): string[] {
    // Simple sentence splitting - can be improved with more sophisticated NLP
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => s + '.');
  }

  private getOverlapText(text: string, overlapSize: number): string {
    if (text.length <= overlapSize) {
      return text;
    }

    const words = text.split(' ');
    let overlapText = '';

    for (let i = words.length - 1; i >= 0; i--) {
      const candidateOverlap = words.slice(i).join(' ');
      if (candidateOverlap.length <= overlapSize) {
        overlapText = candidateOverlap;
        break;
      }
    }

    return overlapText;
  }

  private splitLongSentence(sentence: string, maxSize: number): string[] {
    const words = sentence.split(' ');
    const parts: string[] = [];
    let currentPart = '';

    for (const word of words) {
      const potentialPart = currentPart + (currentPart ? ' ' : '') + word;

      if (potentialPart.length <= maxSize) {
        currentPart = potentialPart;
      } else {
        if (currentPart) {
          parts.push(currentPart);
          currentPart = word;
        } else {
          // Single word is too long, truncate it
          parts.push(word.substring(0, maxSize));
        }
      }
    }

    if (currentPart) {
      parts.push(currentPart);
    }

    return parts;
  }

  async getTokenUsage(): Promise<{ embeddings: number }> {
    // This would require tracking token usage in a real implementation
    return { embeddings: 0 };
  }
}
