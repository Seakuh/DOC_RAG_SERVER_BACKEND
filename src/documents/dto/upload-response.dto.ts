import { ApiProperty } from '@nestjs/swagger';

export class UploadResponseDto {
  @ApiProperty({
    description: 'Whether the upload was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Unique identifier for the uploaded document',
    example: 'doc-123e4567-e89b-12d3-a456-426614174000',
  })
  documentId: string;

  @ApiProperty({
    description: 'Number of chunks the document was split into',
    example: 15,
  })
  chunks: number;

  @ApiProperty({
    description: 'File size in bytes',
    example: 1024576,
  })
  fileSize: number;

  @ApiProperty({
    description: 'Original filename',
    example: 'document.pdf',
  })
  filename: string;

  @ApiProperty({
    description: 'Document processing summary',
    example: 'Document successfully processed and indexed with 15 text chunks.',
    required: false,
  })
  summary?: string;
}