import { ApiProperty } from '@nestjs/swagger';

class SourceDto {
  @ApiProperty({
    description: 'Source document name',
    example: 'document.pdf',
  })
  source: string;

  @ApiProperty({
    description: 'Page number (if available)',
    example: 1,
    required: false,
  })
  page?: number;

  @ApiProperty({
    description: 'Chunk index within the document',
    example: 0,
  })
  chunk_index: number;

  @ApiProperty({
    description: 'Relevance score (0.0 to 1.0)',
    example: 0.85,
  })
  relevance_score: number;
}

export class QueryResponseDto {
  @ApiProperty({
    description: 'Generated answer based on the retrieved context',
    example: 'Based on the documents, the main topics discussed include...',
  })
  answer: string;

  @ApiProperty({
    description: 'Sources used to generate the answer',
    type: [SourceDto],
  })
  sources: SourceDto[];

  @ApiProperty({
    description: 'Confidence score for the answer (0.0 to 1.0)',
    example: 0.78,
  })
  confidence: number;

  @ApiProperty({
    description: 'Token usage information',
    example: {
      prompt: 256,
      completion: 128,
      total: 384,
    },
  })
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
}