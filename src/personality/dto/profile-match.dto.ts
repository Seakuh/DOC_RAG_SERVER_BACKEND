import { ApiProperty } from '@nestjs/swagger';

export class ProfileMatchDto {
  @ApiProperty({ description: 'Profile ID of the matched user' })
  profileId: string;

  @ApiProperty({ description: 'User ID of the matched user' })
  userId: string;

  @ApiProperty({ description: 'Match score (0-1)' })
  score: number;

  @ApiProperty({ description: 'Generated text summary of the matched profile' })
  generatedText?: string;
}

export class ProfileMatchResponseDto {
  @ApiProperty({ description: 'Top matching profiles', type: [ProfileMatchDto] })
  matches: ProfileMatchDto[];

  @ApiProperty({ description: 'Number of matches found' })
  totalMatches: number;
}
