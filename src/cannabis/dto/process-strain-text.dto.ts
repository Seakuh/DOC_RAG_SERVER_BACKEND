import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ProcessStrainTextDto {
  @ApiProperty({ 
    example: 'Blue Dream is an amazing hybrid strain that combines the best of both indica and sativa. With THC levels around 18-20%, it provides a balanced high that starts with a cerebral euphoria and settles into full-body relaxation. The terpene profile is dominated by myrcene and pinene, giving it a sweet berry aroma with earthy undertones. Users report feeling happy, creative, and relaxed, making it perfect for daytime use. It\'s excellent for treating stress, depression, and mild pain. This strain was created by crossing Blueberry with Haze genetics.', 
    description: 'Free-form text description of a cannabis strain with any details about effects, genetics, THC/CBD content, terpenes, etc.' 
  })
  @IsString()
  text: string;

  @ApiProperty({ 
    example: 'Blue Dream', 
    description: 'Optional hint for the strain name if known',
    required: false 
  })
  @IsOptional()
  @IsString()
  strainNameHint?: string;

  @ApiProperty({ 
    example: 'hybrid', 
    description: 'Optional hint for the strain type if known',
    required: false 
  })
  @IsOptional()
  @IsString()
  strainTypeHint?: string;
}

export class ProcessedStrainResponseDto {
  @ApiProperty({ 
    example: 'strain-uuid-123', 
    description: 'Generated UUID for the processed strain' 
  })
  id: string;

  @ApiProperty({ 
    example: 'Blue Dream', 
    description: 'Extracted strain name' 
  })
  name: string;

  @ApiProperty({ 
    example: 'hybrid', 
    description: 'Extracted strain type' 
  })
  type: string;

  @ApiProperty({ 
    example: 'A balanced hybrid strain that provides cerebral euphoria followed by full-body relaxation', 
    description: 'Processed and cleaned description' 
  })
  description: string;

  @ApiProperty({ 
    example: 19, 
    description: 'Extracted THC percentage',
    required: false 
  })
  thc?: number;

  @ApiProperty({ 
    example: 0.1, 
    description: 'Extracted CBD percentage',
    required: false 
  })
  cbd?: number;

  @ApiProperty({ 
    example: ['happy', 'creative', 'relaxed'], 
    description: 'Extracted effects',
    isArray: true,
    type: String
  })
  effects: string[];

  @ApiProperty({ 
    example: ['berry', 'sweet', 'earthy'], 
    description: 'Extracted flavors',
    isArray: true,
    type: String,
    required: false
  })
  flavors?: string[];

  @ApiProperty({ 
    example: ['stress', 'depression', 'pain'], 
    description: 'Extracted medical uses',
    isArray: true,
    type: String,
    required: false
  })
  medical?: string[];

  @ApiProperty({ 
    example: [{ name: 'myrcene', percentage: 0.8 }, { name: 'pinene', percentage: 0.6 }], 
    description: 'Extracted terpene information',
    required: false
  })
  terpenes?: Array<{ name: string; percentage: number }>;

  @ApiProperty({ 
    example: 'Blueberry x Haze', 
    description: 'Extracted genetics information',
    required: false 
  })
  genetics?: string;

  @ApiProperty({ 
    example: true, 
    description: 'Whether the strain was successfully stored in Cognee knowledge graph' 
  })
  storedInCognee: boolean;

  @ApiProperty({ 
    example: 'strain-cognee-entry-456', 
    description: 'Cognee knowledge graph entry ID',
    required: false 
  })
  cogneeId?: string;

  @ApiProperty({ 
    example: 2500, 
    description: 'Processing time in milliseconds' 
  })
  processingTime: number;

  @ApiProperty({ 
    example: 0.92, 
    description: 'Confidence score of the extraction (0-1)' 
  })
  confidence: number;

  @ApiProperty({ 
    example: { extractedEntities: 12, identifiedRelationships: 8 }, 
    description: 'Additional metadata about the processing' 
  })
  metadata: Record<string, any>;
}