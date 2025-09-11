import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray, IsEnum, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export enum CogneeDataType {
  TEXT = 'text',
  DOCUMENT = 'document',
  URL = 'url',
  FILE = 'file',
  STRUCTURED = 'structured'
}

export enum CogneeProcessingMode {
  CHUNKS = 'chunks',
  ENTITIES = 'entities',
  RELATIONSHIPS = 'relationships',
  FULL = 'full'
}

export class CogneeMetadata {
  @ApiProperty({ description: 'Source of the data', example: 'user_upload' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiProperty({ description: 'Category or tags for the data', example: ['research', 'cannabis'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: 'Author or creator', example: 'John Doe' })
  @IsOptional()
  @IsString()
  author?: string;

  @ApiProperty({ description: 'Creation date', example: '2025-09-11' })
  @IsOptional()
  @IsString()
  createdAt?: string;

  @ApiProperty({ description: 'Additional metadata as key-value pairs' })
  @IsOptional()
  additionalData?: Record<string, any>;
}

export class UploadDataDto {
  @ApiProperty({ 
    description: 'The text content to upload to Cognee',
    example: 'This is important research data about cannabis effects and medical applications.'
  })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiProperty({ 
    description: 'Type of data being uploaded',
    enum: CogneeDataType,
    example: CogneeDataType.TEXT
  })
  @IsEnum(CogneeDataType)
  dataType: CogneeDataType;

  @ApiProperty({ 
    description: 'Title or identifier for the data',
    example: 'Cannabis Research Document #1'
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ 
    description: 'Processing mode for Cognee',
    enum: CogneeProcessingMode,
    example: CogneeProcessingMode.FULL
  })
  @IsOptional()
  @IsEnum(CogneeProcessingMode)
  processingMode?: CogneeProcessingMode = CogneeProcessingMode.FULL;

  @ApiProperty({ 
    description: 'Metadata associated with the data',
    type: CogneeMetadata
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CogneeMetadata)
  metadata?: CogneeMetadata;

  @ApiProperty({ 
    description: 'Whether to create knowledge graph relationships',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  createRelationships?: boolean = true;

  @ApiProperty({ 
    description: 'Whether to extract entities from the data',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  extractEntities?: boolean = true;
}