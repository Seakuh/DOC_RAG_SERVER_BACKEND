import { applyDecorators, SetMetadata, UseInterceptors } from '@nestjs/common';
import { EventTrackingInterceptor } from '../interceptors/event-tracking.interceptor';
import { UserEventType, EventCategory } from '../../events/dto/user-event.dto';

/**
 * TrackEvent Decorator - Automatisches Event Tracking für Controller-Methoden
 *
 * Dieser Decorator nutzt einen Interceptor, um automatisch Events zu emittieren
 * wenn bestimmte Controller-Endpoints aufgerufen werden.
 *
 * @param eventType - Der Typ des Events (z.B. UserEventType.QUERY_EXECUTED)
 * @param category - Die Kategorie (z.B. EventCategory.LEARNING)
 * @param options - Optionale Konfiguration
 *
 * @example
 * ```typescript
 * @Controller('query')
 * export class QueryController {
 *   @Post()
 *   @TrackEvent(UserEventType.QUERY_EXECUTED, EventCategory.LEARNING)
 *   async executeQuery(@Body() queryDto: QueryDto, @User() user: UserPayload) {
 *     return this.queryService.execute(queryDto, user.userId);
 *   }
 * }
 * ```
 */
export const TrackEvent = (
  eventType: UserEventType,
  category: EventCategory,
  options?: {
    captureBody?: boolean;
    captureQuery?: boolean;
    captureHeaders?: string[];
    async?: boolean;
  },
) => {
  return applyDecorators(
    SetMetadata('event:type', eventType),
    SetMetadata('event:category', category),
    SetMetadata('event:options', options || {}),
    UseInterceptors(EventTrackingInterceptor),
  );
};

/**
 * TrackLearningEvent - Convenience Decorator für Learning Events
 */
export const TrackLearningEvent = (eventType: UserEventType) => {
  return TrackEvent(eventType, EventCategory.LEARNING, {
    captureBody: true,
    captureQuery: true,
  });
};

/**
 * TrackSocialEvent - Convenience Decorator für Social Events
 */
export const TrackSocialEvent = (eventType: UserEventType) => {
  return TrackEvent(eventType, EventCategory.SOCIAL, {
    captureBody: false,
    async: true,
  });
};

/**
 * TrackCreativeEvent - Convenience Decorator für Creative Events
 */
export const TrackCreativeEvent = (eventType: UserEventType) => {
  return TrackEvent(eventType, EventCategory.CREATIVE, {
    captureBody: true,
    captureHeaders: ['x-style-preset'],
  });
};
