import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UploadDocumentDto {
  @ApiProperty({
    description: 'Optional custom name for the document',
    example: 'My Important Document',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiProperty({
    description: 'Optional description of the document',
    example: 'This document contains important project information',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    description: 'Optional tags for categorizing the document',
    example: 'project,documentation,important',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  tags?: string;
}