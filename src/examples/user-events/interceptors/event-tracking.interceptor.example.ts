import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitterService } from '../../events/emitter/event-emitter.service';
import { UserEventType, EventCategory } from '../../events/dto/user-event.dto';

/**
 * EventTrackingInterceptor - Automatisches Event Tracking
 *
 * Dieser Interceptor wird vom @TrackEvent Decorator verwendet,
 * um automatisch Events zu emittieren wenn Controller-Endpoints aufgerufen werden.
 */
@Injectable()
export class EventTrackingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(EventTrackingInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly eventEmitter: EventEmitterService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // Extract metadata from decorator
    const eventType = this.reflector.get<UserEventType>(
      'event:type',
      context.getHandler(),
    );
    const category = this.reflector.get<EventCategory>(
      'event:category',
      context.getHandler(),
    );
    const options = this.reflector.get<any>(
      'event:options',
      context.getHandler(),
    ) || {};

    // Wenn kein eventType vorhanden, skip tracking
    if (!eventType) {
      return next.handle();
    }

    // Build metadata
    const metadata: any = {
      path: request.path,
      method: request.method,
    };

    if (options.captureBody !== false) {
      metadata.body = this.sanitizeData(request.body);
    }

    if (options.captureQuery) {
      metadata.query = request.query;
    }

    if (options.captureHeaders && Array.isArray(options.captureHeaders)) {
      metadata.headers = {};
      options.captureHeaders.forEach(header => {
        if (request.headers[header]) {
          metadata.headers[header] = request.headers[header];
        }
      });
    }

    // Build event
    const event = {
      id: uuidv4(),
      userId: request.user?.userId || request.user?.sub || 'anonymous',
      eventType,
      category,
      metadata,
      timestamp: new Date(),
      sessionId: request.sessionId || request.headers['x-session-id'],
      sourceApp: request.headers['x-app-id'] || 'unknown',
    };

    // Emit event (asynchronously to not block request)
    setImmediate(() => {
      this.eventEmitter
        .emitUserEvent(event)
        .catch(error => {
          this.logger.error(`Failed to emit event: ${error.message}`);
        });
    });

    // Continue request processing
    return next.handle().pipe(
      tap({
        next: (response) => {
          // Optionally track successful responses
          if (options.trackResponse) {
            const successEvent = {
              ...event,
              id: uuidv4(),
              eventType: `${eventType}.success` as UserEventType,
              metadata: {
                ...metadata,
                responseSize: JSON.stringify(response).length,
              },
            };

            setImmediate(() => {
              this.eventEmitter.emitUserEvent(successEvent).catch(() => {});
            });
          }
        },
        error: (error) => {
          // Track errors
          const errorEvent = {
            ...event,
            id: uuidv4(),
            eventType: `${eventType}.error` as UserEventType,
            metadata: {
              ...metadata,
              error: error.message,
              statusCode: error.status,
            },
          };

          setImmediate(() => {
            this.eventEmitter.emitUserEvent(errorEvent).catch(() => {});
          });
        },
      }),
    );
  }

  /**
   * Sanitizes sensitive data from request body/query
   */
  private sanitizeData(data: any): any {
    if (!data) return data;

    const sensitiveFields = [
      'password',
      'token',
      'apiKey',
      'secret',
      'creditCard',
      'ssn',
    ];

    const sanitized = { ...data };

    Object.keys(sanitized).forEach(key => {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}
