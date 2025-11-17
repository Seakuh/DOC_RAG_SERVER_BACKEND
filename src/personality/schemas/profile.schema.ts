import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProfileDocument = Profile & Document;

export interface Answer {
  questionKey: string;
  answer: string | string[];
}

@Schema()
export class Profile {
  @Prop({ required: true })
  userId: string;

  @Prop({ type: [Object], required: true })
  answers: Answer[];

  @Prop({ required: true })
  vectorId: string; // ID in Qdrant

  @Prop()
  generatedText: string; // LLM-generated summary of the profile

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const ProfileSchema = SchemaFactory.createForClass(Profile);

// Create index on userId for faster lookups
ProfileSchema.index({ userId: 1 });
