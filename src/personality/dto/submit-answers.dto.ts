import { IsArray, ValidateNested, IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AnswerDto {
  @ApiProperty({ description: 'Question key' })
  @IsString()
  @IsNotEmpty()
  questionKey: string;

  @ApiProperty({
    description: 'Answer value(s)',
    oneOf: [
      { type: 'string' },
      { type: 'array', items: { type: 'string' } }
    ]
  })
  @IsNotEmpty()
  answer: string | string[];
}

export class SubmitAnswersDto {
  @ApiProperty({
    description: 'Array of question answers',
    type: [AnswerDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];

  @ApiPropertyOptional({ description: 'Username', example: 'JohnPoker' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ description: 'Avatar URL', example: 'https://example.com/avatar.jpg' })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({ description: 'User bio', example: 'Passionate poker player' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ description: 'User region (IANA timezone)', example: 'Europe/Berlin' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({
    description: 'Test results',
    example: {
      pokerSkillLevel: 85,
      businessAcumen: 75,
      strategicThinking: 90,
      riskTolerance: 70,
      leadership: 80,
    },
  })
  @IsOptional()
  @IsObject()
  testResults?: {
    pokerSkillLevel?: number;
    businessAcumen?: number;
    strategicThinking?: number;
    riskTolerance?: number;
    leadership?: number;
    [key: string]: any;
  };

  @ApiPropertyOptional({
    description: 'Preference weights (must sum to 1.0)',
    example: {
      poker: 0.4,
      business: 0.3,
      networking: 0.2,
      learning: 0.1,
    },
  })
  @IsOptional()
  @IsObject()
  weights?: {
    poker?: number;
    business?: number;
    networking?: number;
    learning?: number;
    [key: string]: any;
  };
}
