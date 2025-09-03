import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min, Max, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class SimilarDocumentsDto {
  @ApiProperty({
    description: 'Text to find similar documents for',
    example: 'machine learning algorithms',
  })
  @IsString()
  @MaxLength(1000)
  text: string;

  @ApiProperty({
    description: 'Maximum number of similar documents to return',
    example: 10,
    minimum: 1,
    maximum: 50,
    required: false,
    default: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 10;

  @ApiProperty({
    description: 'Minimum similarity score (0.0 to 1.0)',
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
}

class SimilarDocumentDto {
  @ApiProperty({
    description: 'Document ID',
    example: 'doc-123_chunk-5',
  })
  id: string;

  @ApiProperty({
    description: 'Similarity score (0.0 to 1.0)',
    example: 0.85,
  })
  score: number;

  @ApiProperty({
    description: 'Source document name',
    example: 'machine-learning-guide.pdf',
  })
  source: string;

  @ApiProperty({
    description: 'Page number (if available)',
    example: 12,
    required: false,
  })
  page?: number;

  @ApiProperty({
    description: 'Chunk index',
    example: 5,
  })
  chunk_index: number;

  @ApiProperty({
    description: 'Document text content',
    example: 'Machine learning algorithms can be categorized into supervised and unsupervised learning...',
  })
  text: string;
}

export class SimilarDocumentsResponseDto {
  @ApiProperty({
    description: 'Array of similar documents',
    type: [SimilarDocumentDto],
  })
  documents: SimilarDocumentDto[];

  @ApiProperty({
    description: 'Total number of documents found',
    example: 15,
  })
  total: number;

  @ApiProperty({
    description: 'Number of documents returned (limited by limit parameter)',
    example: 10,
  })
  returned: number;
}