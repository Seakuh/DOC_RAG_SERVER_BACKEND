import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, IsNumber, Min } from 'class-validator';

export class UploadToQdrantDto {
  @ApiProperty({
    description: 'Name of the Qdrant collection to store the documents',
    example: 'my-documents',
    minLength: 1,
  })
  @IsString()
  @MinLength(1, { message: 'Collection name cannot be empty' })
  collectionName: string;

  @ApiProperty({
    description: 'Vector dimension size for the collection',
    example: 1536,
    default: 1536,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Vector dimension must be at least 1' })
  vectorDimension?: number;

  @ApiProperty({
    description: 'Optional metadata tags for the uploaded documents',
    example: 'legal, contracts, 2024',
    required: false,
  })
  @IsOptional()
  @IsString()
  tags?: string;
}
