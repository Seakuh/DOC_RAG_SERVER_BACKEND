import { ApiProperty } from '@nestjs/swagger';
import { StrainType, TerpeneProfile } from './create-strain.dto';

export class StrainMatch {
  @ApiProperty({ example: 'strain-uuid-123' })
  id: string;

  @ApiProperty({ example: 'Blue Dream' })
  name: string;

  @ApiProperty({ enum: StrainType, example: StrainType.HYBRID })
  type: StrainType;

  @ApiProperty({ example: 'A balanced hybrid strain...' })
  description: string;

  @ApiProperty({ example: 18.5, required: false })
  thc?: number;

  @ApiProperty({ example: 0.1, required: false })
  cbd?: number;

  @ApiProperty({ example: ['happy', 'relaxed', 'euphoric'], isArray: true })
  effects: string[];

  @ApiProperty({ example: ['berry', 'sweet'], isArray: true, required: false })
  flavors?: string[];

  @ApiProperty({ example: ['stress', 'depression'], isArray: true, required: false })
  medical?: string[];

  @ApiProperty({ type: [TerpeneProfile], required: false })
  terpenes?: TerpeneProfile[];

  @ApiProperty({ example: 4.2, required: false })
  rating?: number;

  @ApiProperty({ example: 0.89, description: 'Similarity score (0-1)' })
  similarity: number;

  @ApiProperty({ example: 'Perfect for evening relaxation after stressful work days', description: 'AI-generated reasoning for this recommendation' })
  reasoning: string;

  @ApiProperty({ example: 'Start with 1-2 small puffs', description: 'Suggested dosage for this mood/context' })
  dosageRecommendation: string;
}

export class RecommendationContext {
  @ApiProperty({ example: 'Stressed after work, seeking relaxation' })
  analyzedMood: string;

  @ApiProperty({ example: ['relaxation', 'stress-relief', 'evening-use'] })
  extractedKeywords: string[];

  @ApiProperty({ example: 'evening' })
  timeContext: string;

  @ApiProperty({ example: 'relaxation' })
  activityContext: string;

  @ApiProperty({ example: 'Based on your stress level and evening timing, I recommend strains with relaxing terpenes like Myrcene' })
  explanation: string;
}

export class StrainRecommendationResponseDto {
  @ApiProperty({ type: [StrainMatch] })
  recommendations: StrainMatch[];

  @ApiProperty({ type: RecommendationContext })
  context: RecommendationContext;

  @ApiProperty({ example: 5 })
  totalResults: number;

  @ApiProperty({ example: 'Your mood has been analyzed and matched with suitable strains from our knowledge base' })
  summary: string;

  @ApiProperty({ 
    example: [
      'Try consuming 30 minutes before your planned activity',
      'Stay hydrated and have snacks nearby',
      'Consider your tolerance level when dosing'
    ],
    isArray: true 
  })
  generalTips: string[];
}