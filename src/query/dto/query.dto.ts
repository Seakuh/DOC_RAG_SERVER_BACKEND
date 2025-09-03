import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min, Max, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryDto {
  @ApiProperty({
    description: 'The question to ask',
    example: 'What are the main topics discussed in the documents?',
  })
  @IsString()
  @MaxLength(1000)
  question: string;

  @ApiProperty({
    description: 'Maximum number of relevant documents to retrieve',
    example: 5,
    minimum: 1,
    maximum: 20,
    required: false,
    default: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  @Transform(({ value }) => parseInt(value))
  maxResults?: number = 5;

  @ApiProperty({
    description: 'Minimum similarity score for results (0.0 to 1.0)',
    example: 0.7,
    minimum: 0,
    maximum: 1,
    required: false,
    default: 0.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  @Transform(({ value }) => parseFloat(value))
  minScore?: number = 0.5;

  @ApiProperty({
    description: 'Filter by document source',
    example: 'document.pdf',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  source?: string;
}