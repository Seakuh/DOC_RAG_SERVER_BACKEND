import { IsString, IsObject, IsArray, ValidateNested, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class StilDto {
  @ApiProperty({ example: 0.45, minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  risikofreude: number;

  @ApiProperty({ example: 0.75, minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  geduld: number;

  @ApiProperty({ example: 0.6, minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  aggressivität: number;

  @ApiProperty({ example: 0.55, minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  anpassungsfähigkeit: number;

  @ApiProperty({ example: 0.4, minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  bluffneigung: number;
}

class ProfileAnswerDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  scenarioId: number;

  @ApiProperty({ example: 'Pocket Aces!' })
  @IsString()
  scenarioTitle: string;

  @ApiProperty({ example: 'Großen Raise machen' })
  @IsString()
  answer: string;

  @ApiProperty({ example: 'right' })
  @IsString()
  direction: string;
}

export class SaveProfileDto {
  @ApiProperty({
    description: 'User ID (optional, for authenticated users)',
    example: 'user-123',
    required: false,
  })
  @IsString()
  userId?: string;

  @ApiProperty({ example: 'Der Analytische Beobachter' })
  @IsString()
  name: string;

  @ApiProperty({ type: StilDto })
  @IsObject()
  @ValidateNested()
  @Type(() => StilDto)
  stil: StilDto;

  @ApiProperty({ example: 'Du spielst Poker wie ein Schachspieler...' })
  @IsString()
  beschreibung: string;

  @ApiProperty({ example: 'Fredolin das Pokerfrettchen' })
  @IsString()
  tierMentor: string;

  @ApiProperty({ example: 'Tight-Aggressive Light – spiele selektiv...' })
  @IsString()
  empfohleneStrategie: string;

  @ApiProperty({ type: [ProfileAnswerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProfileAnswerDto)
  answers: ProfileAnswerDto[];
}
