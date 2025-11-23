import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserEvent } from '../dto/user-event.dto';
import { v4 as uuidv4 } from 'uuid';

/**
 * EventEmitterService - Wrapper für EventEmitter2
 *
 * Vereinfacht das Emitting von Events mit Validation und Logging
 */
@Injectable()
export class EventEmitterService {
  private readonly logger = new Logger(EventEmitterService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Emits a user event
   *
   * @example
   * await this.eventEmitterService.emitUserEvent({
   *   userId: 'user-123',
   *   eventType: UserEventType.QUERY_EXECUTED,
   *   category: EventCategory.LEARNING,
   *   metadata: { query: 'What is a flush?' },
   *   sourceApp: 'poker-app',
   * });
   */
  async emitUserEvent(event: Partial<UserEvent>): Promise<void> {
    const fullEvent: UserEvent = {
      id: event.id || uuidv4(),
      userId: event.userId,
      eventType: event.eventType,
      category: event.category,
      intent: event.intent,
      metadata: event.metadata || {},
      timestamp: event.timestamp || new Date(),
      sessionId: event.sessionId,
      sourceApp: event.sourceApp,
    };

    this.logger.log(
      `Emitting event: ${fullEvent.eventType} for user ${fullEvent.userId}`,
    );

    // Emit mit verschiedenen Event-Namen für flexible Handler
    this.eventEmitter.emit('user.event', fullEvent);
    this.eventEmitter.emit(`user.event.${fullEvent.eventType}`, fullEvent);
    this.eventEmitter.emit(`user.category.${fullEvent.category}`, fullEvent);
  }

  /**
   * Emits a system event
   */
  async emitSystemEvent(eventType: string, data: any): Promise<void> {
    this.logger.log(`Emitting system event: ${eventType}`);
    this.eventEmitter.emit(`system.${eventType}`, data);
  }

  /**
   * Emits an analytics event
   */
  async emitAnalyticsEvent(data: any): Promise<void> {
    this.eventEmitter.emit('analytics.event', data);
  }
}
