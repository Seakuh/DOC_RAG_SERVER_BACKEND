import { IsString, IsEmail, IsOptional, IsObject, IsArray, IsNumber, IsBoolean } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  username?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  avatar?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsArray()
  @IsOptional()
  answers?: Array<{ questionKey: string; answer: any }>;

  @IsObject()
  @IsOptional()
  testResults?: Record<string, any>;

  @IsObject()
  @IsOptional()
  weights?: Record<string, any>;

  @IsNumber()
  @IsOptional()
  rank?: number;

  @IsNumber()
  @IsOptional()
  totalWins?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class AddEventDto {
  @IsString()
  eventId: string;
}

export class AddWorkshopDto {
  @IsString()
  workshopId: string;

  @IsString()
  @IsOptional()
  certificateUrl?: string;
}

export class RecordActivityDto {
  @IsString()
  @IsOptional()
  date?: string; // ISO date string, defaults to today
}

export class RecordGameResultDto {
  @IsString()
  gameId: string;

  @IsBoolean()
  won: boolean;

  @IsNumber()
  @IsOptional()
  hoursPlayed?: number;
}

export class RecordTournamentDto {
  @IsString()
  tournamentId: string;

  @IsBoolean()
  won: boolean;
}
