import { IsString, IsEnum, IsArray, IsBoolean, IsOptional, IsNumber, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { QuestionOption, ScaleLabels } from '../schemas/question.schema';

export class CreateQuestionDto {
  @ApiProperty({ description: 'Unique identifier for the question' })
  @IsString()
  key: string;

  @ApiProperty({ description: 'The question text' })
  @IsString()
  question: string;

  @ApiProperty({
    description: 'Type of question',
    enum: ['multiple_choice', 'single_choice', 'single_choice_other', 'multi_choice', 'text', 'free_text', 'scale_1_5'],
  })
  @IsEnum(['multiple_choice', 'single_choice', 'single_choice_other', 'multi_choice', 'text', 'free_text', 'scale_1_5'])
  type: string;

  @ApiProperty({ description: 'Available options for the question (simple format)', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @ApiProperty({ description: 'Structured options with value, label, and description', required: false })
  @IsOptional()
  @IsArray()
  structuredOptions?: QuestionOption[];

  @ApiProperty({ description: 'Dimension for analysis (e.g., big_five.offenheit)', required: false })
  @IsOptional()
  @IsString()
  dimension?: string;

  @ApiProperty({ description: 'Section ID this question belongs to', required: false })
  @IsOptional()
  @IsString()
  section?: string;

  @ApiProperty({ description: 'Section title', required: false })
  @IsOptional()
  @IsString()
  sectionTitle?: string;

  @ApiProperty({ description: 'Section description', required: false })
  @IsOptional()
  @IsString()
  sectionDescription?: string;

  @ApiProperty({ description: 'Scale type (e.g., likert_1_5)', required: false })
  @IsOptional()
  @IsString()
  scaleType?: string;

  @ApiProperty({ description: 'Labels for scale values', required: false })
  @IsOptional()
  @IsObject()
  scaleLabels?: ScaleLabels;

  @ApiProperty({ description: 'Whether the question is active', required: false, default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiProperty({ description: 'Display order of the question', required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  order?: number;
}
