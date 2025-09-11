import { IsString, IsOptional, IsNumber, IsArray, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum TimeOfDay {
  MORNING = 'morning',
  AFTERNOON = 'afternoon',
  EVENING = 'evening',
  NIGHT = 'night'
}

export enum ActivityContext {
  WORK = 'work',
  RELAXATION = 'relaxation',
  SOCIAL = 'social',
  CREATIVE = 'creative',
  EXERCISE = 'exercise',
  SLEEP = 'sleep'
}

export class MoodRecommendationDto {
  @ApiProperty({ 
    example: 'I feel stressed after a long day at work and want to relax while watching Netflix', 
    description: 'Free text description of current mood and desired effects' 
  })
  @IsString()
  moodDescription: string;

  @ApiProperty({ 
    enum: TimeOfDay, 
    example: TimeOfDay.EVENING,
    description: 'Time of day when planning to consume',
    required: false 
  })
  @IsOptional()
  @IsEnum(TimeOfDay)
  timeOfDay?: TimeOfDay;

  @ApiProperty({ 
    enum: ActivityContext, 
    example: ActivityContext.RELAXATION,
    description: 'Planned activity context',
    required: false 
  })
  @IsOptional()
  @IsEnum(ActivityContext)
  activityContext?: ActivityContext;

  @ApiProperty({ 
    example: ['stress', 'anxiety'], 
    description: 'Specific symptoms or conditions to address',
    isArray: true,
    type: String,
    required: false
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetSymptoms?: string[];

  @ApiProperty({ 
    example: 7, 
    description: 'Stress level (1-10 scale)',
    required: false 
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  stressLevel?: number;

  @ApiProperty({ 
    example: 5, 
    description: 'Energy level (1-10 scale)',
    required: false 
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  energyLevel?: number;

  @ApiProperty({ 
    example: 5, 
    description: 'Maximum number of recommendations to return',
    default: 5
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  maxResults?: number = 5;

  @ApiProperty({ 
    example: 0.7, 
    description: 'Minimum similarity score for recommendations (0-1)',
    default: 0.7
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minScore?: number = 0.7;
}