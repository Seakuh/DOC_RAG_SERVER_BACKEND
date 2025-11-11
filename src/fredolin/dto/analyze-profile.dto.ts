import { IsArray, IsString, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class AnswerDto {
  @ApiProperty({
    description: 'Title of the scenario',
    example: 'Pocket Aces!',
  })
  @IsString()
  scenarioTitle: string;

  @ApiProperty({
    description: 'Answer text chosen by user',
    example: 'Großen Raise machen',
  })
  @IsString()
  answer: string;

  @ApiProperty({
    description: 'Direction of swipe or tap',
    example: 'right',
    enum: ['up', 'down', 'left', 'right'],
  })
  @IsString()
  @IsIn(['up', 'down', 'left', 'right'])
  direction: string;
}

export class AnalyzeProfileDto {
  @ApiProperty({
    description: 'Array of user answers to poker scenarios',
    type: [AnswerDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];
}
