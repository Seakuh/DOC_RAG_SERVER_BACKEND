import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { QueryResult } from '../pinecone/pinecone.service';

export interface GenerateResponseOptions {
  maxTokens?: number;
  temperature?: number;
  includeSourceMetadata?: boolean;
}

export interface LLMResponse {
  answer: string;
  sources: Array<{
    source: string;
    page?: number;
    chunk_index: number;
    relevance_score: number;
  }>;
  confidence: number;
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
}

@Injectable()
export class LLMService {
  private readonly logger = new Logger(LLMService.name);
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async generateResponse(
    question: string,
    context: QueryResult[],
    options: GenerateResponseOptions = {}
  ): Promise<LLMResponse> {
    try {
      const startTime = Date.now();
      
      const {
        maxTokens = 800,
        temperature = 0.7,
        includeSourceMetadata = true
      } = options;

      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(question, context, includeSourceMetadata);

      const response = await this.openai.chat.completions.create({
        model: this.configService.get<string>('OPENAI_MODEL', 'gpt-4'),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: maxTokens,
        temperature,
      });

      const duration = Date.now() - startTime;
      this.logger.log(`Generated response in ${duration}ms`);

      const answer = response.choices[0]?.message?.content || '';
      const confidence = this.calculateConfidence(context, answer);

      return {
        answer,
        sources: context.map(item => ({
          source: item.metadata.source,
          page: item.metadata.page,
          chunk_index: item.metadata.chunk_index,
          relevance_score: item.score,
        })),
        confidence,
        tokenUsage: {
          prompt: response.usage?.prompt_tokens || 0,
          completion: response.usage?.completion_tokens || 0,
          total: response.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      this.logger.error('Failed to generate response:', error);
      throw new Error(`OpenAI completion failed: ${error.message}`);
    }
  }

  private buildSystemPrompt(): string {
    return `Sie sind ein hilfsamer AI-Assistent, der Fragen basierend auf bereitgestellten Dokumenten beantwortet.

ANWEISUNGEN:
1. Beantworten Sie die Frage ausschließlich basierend auf den bereitgestellten Kontextinformationen
2. Wenn die Informationen nicht ausreichen, sagen Sie das ehrlich
3. Geben Sie präzise und strukturierte Antworten
4. Verwenden Sie relevante Zitate aus den Quelldokumenten
5. Kennzeichnen Sie Ihre Aussagen mit der entsprechenden Quelle wenn möglich
6. Seien Sie objektiv und faktisch korrekt
7. Wenn Sie sich unsicher sind, erwähnen Sie das

ANTWORTFORMAT:
- Beginnen Sie mit einer direkten Antwort auf die Frage
- Strukturieren Sie komplexe Antworten mit Aufzählungszeichen oder Nummerierungen
- Fügen Sie am Ende relevante Quellenverweise hinzu wenn verfügbar

Antworten Sie auf Deutsch, es sei denn, die Frage wurde in einer anderen Sprache gestellt.`;
  }

  private buildUserPrompt(
    question: string,
    context: QueryResult[],
    includeSourceMetadata: boolean
  ): string {
    let prompt = `FRAGE: ${question}\n\nKONTEXT INFORMATIONEN:\n`;

    context.forEach((item, index) => {
      prompt += `\n--- Dokument ${index + 1} ---\n`;
      prompt += `Inhalt: ${item.text}\n`;
      
      if (includeSourceMetadata) {
        prompt += `Quelle: ${item.metadata.source}`;
        if (item.metadata.page) {
          prompt += ` (Seite ${item.metadata.page})`;
        }
        prompt += `\nRelevanz-Score: ${item.score.toFixed(3)}\n`;
      }
    });

    prompt += `\n\nBitte beantworten Sie die Frage basierend auf den obigen Kontextinformationen.`;

    return prompt;
  }

  private calculateConfidence(context: QueryResult[], answer: string): number {
    if (!context.length) return 0;

    // Calculate confidence based on:
    // 1. Average relevance score of context items
    // 2. Number of relevant context items
    // 3. Answer length (longer answers might indicate more confidence)
    
    const avgScore = context.reduce((sum, item) => sum + item.score, 0) / context.length;
    const contextQuantity = Math.min(context.length / 3, 1); // Normalize to max 3 sources
    const answerLength = Math.min(answer.length / 200, 1); // Normalize to reasonable answer length

    const confidence = (avgScore * 0.6) + (contextQuantity * 0.3) + (answerLength * 0.1);
    
    return Math.round(confidence * 100) / 100; // Round to 2 decimal places
  }

  async generateSimpleResponse(
    userPrompt: string,
    systemPrompt?: string,
    options: { maxTokens?: number; temperature?: number } = {}
  ): Promise<string> {
    try {
      const { maxTokens = 800, temperature = 0.7 } = options;

      const response = await this.openai.chat.completions.create({
        model: this.configService.get<string>('OPENAI_MODEL', 'gpt-4'),
        messages: [
          {
            role: 'system',
            content: systemPrompt || 'You are a helpful AI assistant.'
          },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: maxTokens,
        temperature,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      this.logger.error('Failed to generate simple response:', error);
      throw new Error(`OpenAI completion failed: ${error.message}`);
    }
  }

  async summarizeDocument(text: string, title?: string): Promise<string> {
    try {
      const prompt = title
        ? `Erstellen Sie eine prägnante Zusammenfassung des folgenden Dokuments "${title}":\n\n${text}`
        : `Erstellen Sie eine prägnante Zusammenfassung des folgenden Dokuments:\n\n${text}`;

      const response = await this.openai.chat.completions.create({
        model: this.configService.get<string>('OPENAI_MODEL', 'gpt-4'),
        messages: [
          { role: 'system', content: 'Sie sind ein Experte für Dokumentzusammenfassungen. Erstellen Sie prägnante, strukturierte Zusammenfassungen.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 300,
        temperature: 0.5,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      this.logger.error('Failed to generate document summary:', error);
      throw new Error(`Document summarization failed: ${error.message}`);
    }
  }

  async getTokenUsage(): Promise<{ completions: number; total: number }> {
    // This would require tracking token usage in a real implementation
    return { completions: 0, total: 0 };
  }
}