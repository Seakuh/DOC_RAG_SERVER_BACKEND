import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GenerateImageDto {
  @IsString()
  prompt!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  n?: number; // Anzahl der Bilder (Default 1)

  @IsOptional()
  @IsString()
  aspect_ratio?: string; // z. B. "1:1", "3:4", "16:9"
}

