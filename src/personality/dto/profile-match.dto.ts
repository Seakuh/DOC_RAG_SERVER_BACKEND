import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProfileMatchDto {
  @ApiProperty({ description: 'Profile ID of the matched user' })
  profileId: string;

  @ApiProperty({ description: 'User ID of the matched user' })
  userId: string;

  @ApiProperty({ description: 'Username of the matched user', example: 'JohnPoker' })
  username?: string;

  @ApiPropertyOptional({ description: 'Profile image URL of the matched user' })
  avatar?: string;

  @ApiProperty({ description: 'Match score (0-1)', example: 0.92 })
  score: number;

  @ApiPropertyOptional({ description: 'Generated text summary of the matched profile' })
  generatedText?: string;

  @ApiPropertyOptional({ description: 'Region of the matched user', example: 'Europe/Berlin' })
  region?: string;

  @ApiPropertyOptional({ description: 'Bio of the matched user' })
  bio?: string;
}

export class ProfileMatchResponseDto {
  @ApiProperty({ description: 'Top matching profiles', type: [ProfileMatchDto] })
  matches: ProfileMatchDto[];

  @ApiProperty({ description: 'Number of matches found' })
  totalMatches: number;
}
