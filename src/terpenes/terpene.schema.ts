import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TerpeneDocument = Terpene & Document;

@Schema({ timestamps: true })
export class Terpene {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop()
  aromas: string[]; // e.g., ["citrus", "pine", "earthy"]

  @Prop()
  effects: string[]; // e.g., ["relaxing", "uplifting", "focus"]

  @Prop()
  medicalBenefits: string[]; // e.g., ["anti-inflammatory", "pain relief"]

  @Prop()
  boilingPoint: number; // in Celsius

  @Prop()
  molecularFormula: string;

  @Prop()
  alsoFoundIn: string[]; // e.g., ["lavender", "lemon", "hops"]

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Strain' }] })
  relatedStrains: Types.ObjectId[]; // References to cannabis strains

  @Prop()
  imageUrl: string;

  @Prop()
  vectorId: string; // Qdrant vector ID for semantic search

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Object })
  metadata: Record<string, any>;
}

export const TerpeneSchema = SchemaFactory.createForClass(Terpene);

// Add indexes
TerpeneSchema.index({ name: 1 });
TerpeneSchema.index({ effects: 1 });
TerpeneSchema.index({ relatedStrains: 1 });
