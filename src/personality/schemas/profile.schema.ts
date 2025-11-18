import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProfileDocument = Profile & Document;

export interface Answer {
  questionKey: string;
  answer: string | string[];
}

@Schema({ timestamps: true })
export class Profile {
  @Prop({ required: true, unique: true })
  userId: string;

  // Basic Info
  @Prop({ required: true })
  username: string;

  @Prop()
  avatar: string;

  @Prop()
  bio: string;

  @Prop()
  region: string; // For regional matching (e.g., "Europe/Berlin", "America/New_York", "Asia/Tokyo")

  // Personality & Vector Data
  @Prop({ type: [Object], required: true })
  answers: Answer[];

  @Prop({ required: true })
  vectorId: string; // ID in Qdrant

  @Prop()
  generatedText: string; // LLM-generated summary of the profile

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

  // Public Statistics (visible to all)
  @Prop({ default: 0 })
  rank: number;

  @Prop({ default: 0 })
  totalWins: number;

  @Prop({ default: 0 })
  totalGamesPlayed: number;

  @Prop({ default: 0 })
  tournamentParticipations: number;

  @Prop({ type: [String], default: [] })
  workshopsAttended: string[];

  @Prop({ type: [Object], default: [] })
  workshopCompletions: Array<{
    workshopId: string;
    completedAt: Date;
    certificateUrl?: string;
  }>;

  // Activity Tracking (public)
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

  // Private Statistics (only owner or admin)
  @Prop({ type: [String], default: [] })
  participatingEvents: string[];

  @Prop({ type: [String], default: [] })
  pastEvents: string[];

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

// Create indexes for faster lookups
ProfileSchema.index({ userId: 1 });
ProfileSchema.index({ region: 1 });
ProfileSchema.index({ rank: -1 });
