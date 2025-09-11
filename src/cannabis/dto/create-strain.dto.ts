import { IsString, IsNumber, IsArray, IsOptional, IsEnum, Min, Max, ArrayNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum StrainType {
  INDICA = 'indica',
  SATIVA = 'sativa',
  HYBRID = 'hybrid'
}

export class TerpeneProfile {
  @ApiProperty({ example: 'Myrcene', description: 'Name of the terpene' })
  @IsString()
  name: string;

  @ApiProperty({ example: 0.8, description: 'Percentage of terpene (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage: number;
}

export class CreateStrainDto {
  @ApiProperty({ 
    example: 'Blue Dream', 
    description: 'Name of the cannabis strain' 
  })
  @IsString()
  name: string;

  @ApiProperty({ 
    enum: StrainType, 
    example: StrainType.HYBRID,
    description: 'Type of cannabis strain' 
  })
  @IsEnum(StrainType)
  type: StrainType;

  @ApiProperty({ 
    example: 'A balanced hybrid strain known for its sweet berry aroma and relaxing effects', 
    description: 'Detailed description of the strain' 
  })
  @IsString()
  description: string;

  @ApiProperty({ 
    example: 18.5, 
    description: 'THC content percentage',
    required: false 
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  thc?: number;

  @ApiProperty({ 
    example: 0.1, 
    description: 'CBD content percentage',
    required: false 
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  cbd?: number;

  @ApiProperty({ 
    example: ['happy', 'relaxed', 'euphoric', 'creative'], 
    description: 'Array of effects this strain produces',
    isArray: true,
    type: String
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  effects: string[];

  @ApiProperty({ 
    example: ['berry', 'sweet', 'vanilla'], 
    description: 'Flavor profile of the strain',
    isArray: true,
    type: String,
    required: false
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  flavors?: string[];

  @ApiProperty({ 
    example: ['stress', 'depression', 'pain'], 
    description: 'Medical conditions this strain may help with',
    isArray: true,
    type: String,
    required: false
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  medical?: string[];

  @ApiProperty({ 
    type: [TerpeneProfile], 
    description: 'Terpene profile of the strain',
    required: false
  })
  @IsOptional()
  @IsArray()
  terpenes?: TerpeneProfile[];

  @ApiProperty({ 
    example: 'Blueberry x Haze', 
    description: 'Genetic lineage of the strain',
    required: false 
  })
  @IsOptional()
  @IsString()
  genetics?: string;

  @ApiProperty({ 
    example: 'DJ Short', 
    description: 'Breeder or company that created this strain',
    required: false 
  })
  @IsOptional()
  @IsString()
  breeder?: string;

  @ApiProperty({ 
    example: 4.2, 
    description: 'Average user rating (0-5)',
    required: false 
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number;
}