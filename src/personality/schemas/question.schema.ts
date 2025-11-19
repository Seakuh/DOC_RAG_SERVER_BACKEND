import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type QuestionDocument = Question & Document;

export interface QuestionOption {
  value: string;
  label: string;
  description?: string;
}

export interface ScaleLabels {
  [key: string]: string;
}

@Schema()
export class Question {
  @Prop({ required: true, unique: true })
  key: string;

  @Prop({ required: true })
  question: string;

  @Prop({
    required: true,
    enum: ['multiple_choice', 'single_choice', 'single_choice_other', 'multi_choice', 'text', 'free_text', 'scale_1_5'],
  })
  type: string;

  @Prop({ type: [String], required: false })
  options: string[];

  @Prop({ type: Object, required: false })
  structuredOptions?: QuestionOption[];

  @Prop({ required: false })
  dimension?: string;

  @Prop({ required: false })
  section?: string;

  @Prop({ required: false })
  sectionTitle?: string;

  @Prop({ required: false })
  sectionDescription?: string;

  @Prop({ required: false })
  scaleType?: string;

  @Prop({ type: Object, required: false })
  scaleLabels?: ScaleLabels;

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
