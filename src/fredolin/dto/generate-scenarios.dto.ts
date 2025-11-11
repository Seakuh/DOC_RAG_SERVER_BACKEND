import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateScenariosDto {
  @ApiProperty({
    description: 'Number of scenarios to generate',
    example: 8,
    minimum: 1,
    maximum: 20,
    default: 8,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  count?: number = 8;
}
