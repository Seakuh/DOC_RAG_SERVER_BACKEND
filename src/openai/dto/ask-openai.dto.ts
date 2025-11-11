import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, MinLength } from 'class-validator';

export enum OpenAIModel {
  GPT_4 = 'gpt-4',
  GPT_4_TURBO = 'gpt-4-turbo',
  GPT_4O = 'gpt-4o',
  GPT_4O_MINI = 'gpt-4o-mini',
  GPT_35_TURBO = 'gpt-3.5-turbo',
}

export class AskOpenAIDto {
  @ApiProperty({
    description: 'The question or prompt to send to OpenAI',
    example: 'What is the capital of Germany?',
    minLength: 1,
  })
  @IsString()
  @MinLength(1, { message: 'Question cannot be empty' })
  question: string;

  @ApiProperty({
    description: 'OpenAI model to use',
    enum: OpenAIModel,
    example: OpenAIModel.GPT_4O_MINI,
    required: false,
    default: OpenAIModel.GPT_4O_MINI,
  })
  @IsOptional()
  @IsEnum(OpenAIModel, { message: 'Invalid model specified' })
  model?: OpenAIModel;

  @ApiProperty({
    description: 'Optional system message to set context',
    example: 'You are a helpful assistant that answers concisely.',
    required: false,
  })
  @IsOptional()
  @IsString()
  systemMessage?: string;
}
