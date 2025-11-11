import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { AskOpenAIDto, OpenAIModel } from './dto/ask-openai.dto';

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private openai: OpenAI;
  private defaultModel: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY not configured');
      throw new Error('OPENAI_API_KEY must be set in environment variables');
    }

    this.openai = new OpenAI({
      apiKey,
    });

    this.defaultModel =
      this.configService.get<string>('OPENAI_MODEL') ||
      OpenAIModel.GPT_4O_MINI;

    this.logger.log(
      `OpenAI Service initialized with default model: ${this.defaultModel}`,
    );
  }

  /**
   * Ask OpenAI a question with optional model selection
   */
  async askOpenAI(dto: AskOpenAIDto): Promise<{
    answer: string;
    model: string;
    tokensUsed: number;
    finishReason: string;
  }> {
    const { question, model, systemMessage } = dto;
    const selectedModel = model || this.defaultModel;

    this.logger.log(
      `Asking OpenAI (model: ${selectedModel}): ${question.substring(0, 50)}...`,
    );

    try {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

      // Add system message if provided
      if (systemMessage) {
        messages.push({
          role: 'system',
          content: systemMessage,
        });
      }

      // Add user question
      messages.push({
        role: 'user',
        content: question,
      });

      const response = await this.openai.chat.completions.create({
        model: selectedModel,
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      });

      const answer = response.choices[0]?.message?.content || '';
      const tokensUsed = response.usage?.total_tokens || 0;
      const finishReason = response.choices[0]?.finish_reason || 'unknown';

      this.logger.log(
        `OpenAI response received (${tokensUsed} tokens, finish: ${finishReason})`,
      );

      return {
        answer,
        model: selectedModel,
        tokensUsed,
        finishReason,
      };
    } catch (error) {
      this.logger.error(`OpenAI API error: ${error.message}`, error.stack);
      throw new BadRequestException(
        `Failed to get response from OpenAI: ${error.message}`,
      );
    }
  }

  /**
   * Stream OpenAI response (for future implementation)
   */
  async streamOpenAI(
    question: string,
    model?: string,
  ): Promise<AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>> {
    const selectedModel = model || this.defaultModel;

    this.logger.log(`Streaming OpenAI (model: ${selectedModel})`);

    try {
      const stream = await this.openai.chat.completions.create({
        model: selectedModel,
        messages: [{ role: 'user', content: question }],
        stream: true,
      });

      return stream;
    } catch (error) {
      this.logger.error(
        `OpenAI streaming error: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to stream from OpenAI: ${error.message}`,
      );
    }
  }
}
