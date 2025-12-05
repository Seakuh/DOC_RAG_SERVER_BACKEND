import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsMongoId,
} from 'class-validator';

export class CreateTerpeneDto {
  @ApiProperty({ example: 'Myrcene', description: 'Terpene name' })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'Most abundant terpene in cannabis',
    description: 'Detailed description',
  })
  @IsString()
  description: string;

  @ApiPropertyOptional({
    example: ['earthy', 'musky', 'herbal'],
    description: 'Aroma profile',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  aromas?: string[];

  @ApiPropertyOptional({
    example: ['sedating', 'relaxing', 'muscle relaxant'],
    description: 'Effects on the body and mind',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  effects?: string[];

  @ApiPropertyOptional({
    example: ['pain relief', 'anti-inflammatory', 'sleep aid'],
    description: 'Medical benefits',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  medicalBenefits?: string[];

  @ApiPropertyOptional({
    example: 166.6,
    description: 'Boiling point in Celsius',
  })
  @IsOptional()
  @IsNumber()
  boilingPoint?: number;

  @ApiPropertyOptional({
    example: 'C10H16',
    description: 'Chemical formula',
  })
  @IsOptional()
  @IsString()
  molecularFormula?: string;

  @ApiPropertyOptional({
    example: ['mango', 'hops', 'lemongrass'],
    description: 'Other plants containing this terpene',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  alsoFoundIn?: string[];

  @ApiPropertyOptional({
    example: ['507f1f77bcf86cd799439011'],
    description: 'Related cannabis strain IDs',
  })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  relatedStrains?: string[];

  @ApiPropertyOptional({
    example: 'https://example.com/myrcene.jpg',
    description: 'Image URL',
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}
