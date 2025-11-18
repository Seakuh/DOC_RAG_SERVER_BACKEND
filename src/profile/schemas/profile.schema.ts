import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProfileDocument = Profile & Document;

@Schema({ timestamps: true })
export class Profile {
  @Prop({ required: true, unique: true })
  userId: string;

  @Prop({ required: true })
  username: string;

  @Prop()
  email: string;

  @Prop()
  firstName: string;

  @Prop()
  lastName: string;

  @Prop()
  avatar: string;

  @Prop()
  bio: string;

  // Personality & Vector Data
  @Prop()
  vectorId: string;

  @Prop({ type: [Object] })
  answers: Array<{ questionKey: string; answer: any }>;

  @Prop()
  personalityText: string;

  // Test Results & Weights
  @Prop({ type: Object })
  testResults: {
    pokerSkillLevel?: number;
    businessAcumen?: number;
    strategicThinking?: number;
    riskTolerance?: number;
    leadership?: number;
    [key: string]: any;
  };

  @Prop({ type: Object })
  weights: {
    poker?: number;
    business?: number;
    networking?: number;
    learning?: number;
    [key: string]: any;
  };

  // Ranking & Statistics
  @Prop({ default: 0 })
  rank: number;

  @Prop({ default: 0 })
  totalWins: number;

  @Prop({ default: 0 })
  totalGamesPlayed: number;

  @Prop({ default: 0 })
  tournamentParticipations: number;

  @Prop({ type: [String], default: [] })
  tournamentsWon: string[];

  // Events
  @Prop({ type: [String], default: [] })
  participatingEvents: string[];

  @Prop({ type: [String], default: [] })
  pastEvents: string[];

  // Workshops
  @Prop({ type: [String], default: [] })
  workshopsAttended: string[];

  @Prop({ type: [Object], default: [] })
  workshopCompletions: Array<{
    workshopId: string;
    completedAt: Date;
    certificateUrl?: string;
  }>;

  // Activity Tracking
  @Prop({ type: Map, of: Number, default: {} })
  activityDays: Map<string, number>;

  @Prop({ default: 0 })
  totalActivityDays: number;

  @Prop({ default: 0 })
  currentStreak: number;

  @Prop({ default: 0 })
  longestStreak: number;

  @Prop()
  lastActiveDate: Date;

  // Additional Stats
  @Prop({ default: 0 })
  totalHoursPlayed: number;

  @Prop({ default: 0 })
  matchesFound: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const ProfileSchema = SchemaFactory.createForClass(Profile);
