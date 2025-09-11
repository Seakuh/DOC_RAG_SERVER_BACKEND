import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max, IsArray } from 'class-validator';

export class ScientificQuestionDto {
  @ApiProperty({ 
    description: 'Wissenschaftliche Frage über Cannabis',
    example: 'Welche Wirkmechanismen hat CBD bei der Behandlung von Epilepsie?'
  })
  @IsNotEmpty()
  @IsString()
  question: string;

  @ApiProperty({ 
    description: 'Kontext oder spezifisches Fachgebiet für die Frage',
    example: 'neurologie',
    required: false
  })
  @IsOptional()
  @IsString()
  context?: string;

  @ApiProperty({ 
    description: 'Maximale Anzahl der zu berücksichtigenden Forschungsquellen',
    example: 5,
    default: 5,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  maxSources?: number = 5;

  @ApiProperty({ 
    description: 'Sprache der Antwort',
    example: 'de',
    enum: ['de', 'en'],
    default: 'de',
    required: false
  })
  @IsOptional()
  @IsString()
  language?: 'de' | 'en' = 'de';

  @ApiProperty({ 
    description: 'Spezifische Forschungsbereiche die berücksichtigt werden sollen',
    example: ['medical', 'pharmacology', 'clinical-trials'],
    required: false
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  researchAreas?: string[];
}

export class ScientificAnswerDto {
  @ApiProperty({ 
    description: 'Die wissenschaftliche Antwort auf die gestellte Frage',
    example: 'CBD (Cannabidiol) wirkt bei Epilepsie hauptsächlich durch...'
  })
  answer: string;

  @ApiProperty({ 
    description: 'Vertrauen in die Antwort basierend auf verfügbaren Quellen',
    example: 0.85
  })
  confidence: number;

  @ApiProperty({ 
    description: 'Verwendete Forschungsquellen und deren Relevanz'
  })
  sources: Array<{
    title: string;
    type: 'research_paper' | 'clinical_study' | 'review_article' | 'case_study';
    relevanceScore: number;
    keyFindings: string[];
    authors?: string[];
    year?: number;
    journal?: string;
  }>;

  @ApiProperty({ 
    description: 'Relevante Entitäten aus dem Cognee Knowledge Graph'
  })
  relatedEntities: Array<{
    name: string;
    type: string;
    relationship: string;
    confidence: number;
  }>;

  @ApiProperty({ 
    description: 'Zusätzliche wissenschaftliche Erkenntnisse und Zusammenhänge'
  })
  insights: {
    mechanismsOfAction: string[];
    clinicalEvidence: string[];
    contraindications: string[];
    futureResearch: string[];
  };

  @ApiProperty({ 
    description: 'Verwandte Cannabis-Strains basierend auf wissenschaftlichen Erkenntnissen'
  })
  relatedStrains?: Array<{
    name: string;
    relevance: string;
    scientificBasis: string;
  }>;

  @ApiProperty({ 
    description: 'Metadaten zur Antwortgenerierung'
  })
  metadata: {
    processingTime: number;
    sourcesAnalyzed: number;
    cogneeEntitiesFound: number;
    timestamp: string;
  };
}