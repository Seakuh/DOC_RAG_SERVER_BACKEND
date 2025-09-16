import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type StrainDocument = Strain & Document;

@Schema()
export class Strain {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: ['indica', 'sativa', 'hybrid'] })
  type: string;

  @Prop()
  description: string;

  @Prop()
  thc: number;

  @Prop()
  cbd: number;

  @Prop([String])
  effects: string[];

  @Prop([String])
  flavors: string[];

  @Prop([String])
  medical: string[];

  @Prop()
  genetics: string;

  @Prop()
  breeder: string;

  @Prop()
  rating: number;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop()
  terpenes: Array<{ name: string; percentage: number }>;
}

export const StrainSchema = SchemaFactory.createForClass(Strain);