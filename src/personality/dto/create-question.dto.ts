import { IsString, IsEnum, IsArray, IsBoolean, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateQuestionDto {
  @ApiProperty({ description: 'Unique identifier for the question' })
  @IsString()
  key: string;

  @ApiProperty({ description: 'The question text' })
  @IsString()
  question: string;

  @ApiProperty({
    description: 'Type of question',
    enum: ['multiple_choice', 'single_choice', 'text'],
  })
  @IsEnum(['multiple_choice', 'single_choice', 'text'])
  type: string;

  @ApiProperty({ description: 'Available options for the question', type: [String] })
  @IsArray()
  @IsString({ each: true })
  options: string[];

  @ApiProperty({ description: 'Whether the question is active', required: false, default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiProperty({ description: 'Display order of the question', required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  order?: number;
}
