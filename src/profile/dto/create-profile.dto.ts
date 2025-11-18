import { IsString, IsEmail, IsOptional, IsObject, IsArray, IsNumber } from 'class-validator';

export class CreateProfileDto {
  @IsString()
  userId: string;

  @IsString()
  username: string;

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
}
