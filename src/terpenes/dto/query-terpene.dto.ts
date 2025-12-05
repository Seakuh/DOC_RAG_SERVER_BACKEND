import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class QueryTerpeneDto {
  @ApiPropertyOptional({
    example: 'What are the effects of limonene?',
    description: 'Question about terpenes',
  })
  @IsString()
  question: string;

  @ApiPropertyOptional({
    example: 'terpenes-collection',
    description: 'Qdrant collection name',
    default: 'terpenes',
  })
  @IsOptional()
  @IsString()
  collection?: string;

  @ApiPropertyOptional({
    example: 5,
    description: 'Number of results to return',
    default: 5,
  })
  @IsOptional()
  topK?: number;
}
