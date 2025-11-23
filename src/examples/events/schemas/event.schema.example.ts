import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { EventCategory, EventIntent, UserEventType } from '../dto/user-event.dto';

export type EventDocument = Event & Document;

/**
 * Event Schema - Persistiert User-Events in MongoDB
 *
 * Separate Collection für Events ermöglicht:
 * - Event Sourcing
 * - Audit Logs
 * - Time-series Analytics
 * - Replay von Events
 */
@Schema({ timestamps: true, collection: 'user_events' })
export class Event {
  @Prop({ required: true, unique: true, index: true })
  eventId: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, enum: UserEventType })
  eventType: string;

  @Prop({ required: true, enum: EventCategory, index: true })
  category: string;

  @Prop({ enum: EventIntent })
  intent?: string;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;

  @Prop({ required: true, index: true })
  timestamp: Date;

  @Prop({ index: true })
  sessionId?: string;

  @Prop({ index: true })
  sourceApp?: string;

  // Classification results (filled by EventCategorizerService)
  @Prop()
  sentiment?: string;

  @Prop()
  complexity?: string;

  @Prop()
  engagementLevel?: number;

  @Prop({ type: [String] })
  tags?: string[];

  // Vector reference
  @Prop()
  vectorId?: string; // Reference to Qdrant vector

  // Processing status
  @Prop({ default: false })
  processed: boolean;

  @Prop({ default: false })
  vectorized: boolean;

  // Timestamps (via @Schema timestamps: true)
  createdAt: Date;
  updatedAt: Date;
}

export const EventSchema = SchemaFactory.createForClass(Event);

// Indexes für Performance
EventSchema.index({ userId: 1, timestamp: -1 });
EventSchema.index({ category: 1, timestamp: -1 });
EventSchema.index({ sourceApp: 1, timestamp: -1 });
EventSchema.index({ sessionId: 1 });
EventSchema.index({ processed: 1, vectorized: 1 });

// Compound index für häufige Queries
EventSchema.index({ userId: 1, category: 1, timestamp: -1 });
