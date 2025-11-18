import { ApiProperty } from '@nestjs/swagger';

// Public Statistics - visible to everyone
export class PublicStatisticsDto {
  @ApiProperty({ description: 'User ID', example: 'user123' })
  userId: string;

  @ApiProperty({ description: 'Username', example: 'JohnPoker' })
  username: string;

  @ApiProperty({ description: 'Avatar URL', example: 'https://example.com/avatar.jpg', required: false })
  avatar?: string;

  @ApiProperty({ description: 'User bio', example: 'Passionate poker player', required: false })
  bio?: string;

  @ApiProperty({ description: 'User region', example: 'Europe/Berlin', required: false })
  region?: string;

  @ApiProperty({ description: 'User rank', example: 1500, default: 0 })
  rank: number;

  @ApiProperty({ description: 'Total wins', example: 42, default: 0 })
  totalWins: number;

  @ApiProperty({ description: 'Total games played', example: 100, default: 0 })
  totalGamesPlayed: number;

  @ApiProperty({ description: 'Tournament participations', example: 15, default: 0 })
  tournamentParticipations: number;

  @ApiProperty({ description: 'Workshops attended', example: ['workshop-1', 'workshop-2'], default: [] })
  workshopsAttended: string[];

  @ApiProperty({
    description: 'Workshop completions with certificates',
    example: [{ workshopId: 'ws-1', completedAt: '2025-01-15T10:00:00Z', certificateUrl: 'https://...' }],
    default: [],
  })
  workshopCompletions: Array<{
    workshopId: string;
    completedAt: Date;
    certificateUrl?: string;
  }>;

  @ApiProperty({ description: 'Total activity days', example: 45, default: 0 })
  totalActivityDays: number;

  @ApiProperty({ description: 'Current streak', example: 7, default: 0 })
  currentStreak: number;

  @ApiProperty({ description: 'Longest streak', example: 21, default: 0 })
  longestStreak: number;

  @ApiProperty({ description: 'Last active date', example: '2025-01-18T12:00:00Z', required: false })
  lastActiveDate?: Date;

  @ApiProperty({ description: 'Win rate percentage', example: 42.5 })
  winRate: number;

  @ApiProperty({ description: 'Profile created at', example: '2024-01-01T10:00:00Z' })
  createdAt: Date;
}

// Private Statistics - only visible to owner or admin
export class PrivateStatisticsDto extends PublicStatisticsDto {
  @ApiProperty({ description: 'Participating events', example: ['event-1', 'event-2'], default: [] })
  participatingEvents: string[];

  @ApiProperty({ description: 'Past events', example: ['event-3', 'event-4'], default: [] })
  pastEvents: string[];

  @ApiProperty({ description: 'Total hours played', example: 150.5, default: 0 })
  totalHoursPlayed: number;

  @ApiProperty({ description: 'Matches found through matching system', example: 12, default: 0 })
  matchesFound: number;

  @ApiProperty({
    description: 'Test results',
    example: {
      pokerSkillLevel: 85,
      businessAcumen: 75,
      strategicThinking: 90,
      riskTolerance: 70,
      leadership: 80,
    },
    required: false,
  })
  testResults?: {
    pokerSkillLevel?: number;
    businessAcumen?: number;
    strategicThinking?: number;
    riskTolerance?: number;
    leadership?: number;
    [key: string]: any;
  };

  @ApiProperty({
    description: 'Preference weights',
    example: {
      poker: 0.4,
      business: 0.3,
      networking: 0.2,
      learning: 0.1,
    },
    required: false,
  })
  weights?: {
    poker?: number;
    business?: number;
    networking?: number;
    learning?: number;
    [key: string]: any;
  };

  @ApiProperty({ description: 'Activity days map', example: { '2025-01-15': 5, '2025-01-16': 3 }, required: false })
  activityDays?: Record<string, number>;

  @ApiProperty({ description: 'Is profile active', example: true, default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Profile updated at', example: '2025-01-18T12:00:00Z' })
  updatedAt: Date;
}

// Global Statistics Response
export class GlobalStatisticsDto {
  @ApiProperty({ description: 'Total number of profiles', example: 1000 })
  totalProfiles: number;

  @ApiProperty({ description: 'Active profiles (last 30 days)', example: 750 })
  activeProfiles: number;

  @ApiProperty({ description: 'Total games played across all users', example: 50000 })
  totalGamesPlayed: number;

  @ApiProperty({ description: 'Total workshops attended', example: 5000 })
  totalWorkshopsAttended: number;

  @ApiProperty({ description: 'Average rank', example: 1200.5 })
  averageRank: number;

  @ApiProperty({ description: 'Top ranked profiles', type: [PublicStatisticsDto] })
  topRanked: PublicStatisticsDto[];

  @ApiProperty({ description: 'Most active profiles', type: [PublicStatisticsDto] })
  mostActive: PublicStatisticsDto[];

  @ApiProperty({ description: 'Regional distribution', example: { 'Europe/Berlin': 300, 'America/New_York': 250 } })
  regionalDistribution: Record<string, number>;
}
