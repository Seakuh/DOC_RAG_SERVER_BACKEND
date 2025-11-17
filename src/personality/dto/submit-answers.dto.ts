import { IsArray, ValidateNested, IsString, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class AnswerDto {
  @ApiProperty({ description: 'Question key' })
  @IsString()
  @IsNotEmpty()
  questionKey: string;

  @ApiProperty({
    description: 'Answer value(s)',
    oneOf: [
      { type: 'string' },
      { type: 'array', items: { type: 'string' } }
    ]
  })
  @IsNotEmpty()
  answer: string | string[];
}

export class SubmitAnswersDto {
  @ApiProperty({
    description: 'Array of question answers',
    type: [AnswerDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];
}
