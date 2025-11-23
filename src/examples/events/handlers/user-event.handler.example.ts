import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserEvent } from '../dto/user-event.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Event, EventDocument } from '../schemas/event.schema';

/**
 * UserEventHandler - Speichert alle Events in MongoDB
 *
 * Dieser Handler wird für ALLE User-Events ausgeführt und
 * speichert sie persistent in der Datenbank.
 */
@Injectable()
export class UserEventHandler {
  private readonly logger = new Logger(UserEventHandler.name);

  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
  ) {}

  /**
   * Handles all user events
   * Listener für 'user.event' wird für ALLE User-Events getriggert
   */
  @OnEvent('user.event', { async: true })
  async handleUserEvent(event: UserEvent): Promise<void> {
    try {
      this.logger.log(
        `Storing event: ${event.eventType} for user ${event.userId}`,
      );

      await this.eventModel.create({
        eventId: event.id,
        userId: event.userId,
        eventType: event.eventType,
        category: event.category,
        intent: event.intent,
        metadata: event.metadata,
        timestamp: event.timestamp,
        sessionId: event.sessionId,
        sourceApp: event.sourceApp,
      });

      this.logger.log(`Event stored successfully: ${event.id}`);
    } catch (error) {
      this.logger.error(`Failed to store event: ${error.message}`, error.stack);
      // Wichtig: Nicht werfen, um andere Handler nicht zu blockieren
    }
  }

  /**
   * Handles specific query events
   * Listener für 'user.event.query.executed'
   */
  @OnEvent('user.event.query.executed', { async: true })
  async handleQueryEvent(event: UserEvent): Promise<void> {
    this.logger.log(`Query executed by user ${event.userId}: ${event.metadata.query}`);

    // Spezifische Logik für Query-Events
    // z.B. update user's query history, track popular queries, etc.
  }

  /**
   * Handles category-specific events
   */
  @OnEvent('user.category.learning', { async: true })
  async handleLearningEvent(event: UserEvent): Promise<void> {
    this.logger.log(`Learning event from user ${event.userId}`);
    // Track learning progress, suggest related content, etc.
  }
}
