import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { OpenAIService } from './openai.service';
import { AskOpenAIDto } from './dto/ask-openai.dto';

@ApiTags('OpenAI')
@Controller('api/v1/openai')
export class OpenAIController {
  private readonly logger = new Logger(OpenAIController.name);

  constructor(private readonly openaiService: OpenAIService) {}

  @Post('ask')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ask OpenAI a question',
    description:
      'Send a question to OpenAI with optional model selection and system message',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully received answer from OpenAI',
    schema: {
      example: {
        answer:
          'The capital of Germany is Berlin. It has been the capital since German reunification in 1990.',
        model: 'gpt-4o-mini',
        tokensUsed: 42,
        finishReason: 'stop',
        timestamp: '2025-11-11T10:30:00.000Z',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid request or OpenAI API error',
  })
  async askOpenAI(@Body() dto: AskOpenAIDto) {
    this.logger.log(
      `Received ask request with model: ${dto.model || 'default'}`,
    );

    const result = await this.openaiService.askOpenAI(dto);

    return {
      ...result,
      timestamp: new Date().toISOString(),
    };
  }
}
