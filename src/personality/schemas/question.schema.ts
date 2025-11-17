import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type QuestionDocument = Question & Document;

@Schema()
export class Question {
  @Prop({ required: true, unique: true })
  key: string;

  @Prop({ required: true })
  question: string;

  @Prop({
    required: true,
    enum: ['multiple_choice', 'single_choice', 'text'],
  })
  type: string;

  @Prop({ type: [String], required: true })
  options: string[];

  @Prop({ default: true })
  active: boolean;

  @Prop({ default: 0 })
  order: number;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const QuestionSchema = SchemaFactory.createForClass(Question);
