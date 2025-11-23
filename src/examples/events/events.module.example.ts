import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { UserEventHandler } from './handlers/user-event.handler';
import { AnalyticsEventHandler } from './handlers/analytics-event.handler';
import { VectorSyncHandler } from './handlers/vector-sync.handler';
import { EventEmitterService } from './emitter/event-emitter.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Event, EventSchema } from './schemas/event.schema';

/**
 * EventsModule - Zentrales Event-System
 *
 * Dieses Modul nutzt @nestjs/event-emitter für Event-Driven Architecture.
 * Alle User-Actions werden als Events emitted und von verschiedenen Handlers verarbeitet.
 *
 * Installation:
 * npm install @nestjs/event-emitter
 *
 * Usage in app.module.ts:
 * imports: [
 *   EventEmitterModule.forRoot({
 *     wildcard: true,
 *     delimiter: '.',
 *     newListener: false,
 *     removeListener: false,
 *     maxListeners: 10,
 *     verboseMemoryLeak: true,
 *     ignoreErrors: false,
 *   }),
 *   EventsModule,
 *   ...
 * ]
 */
@Module({
  imports: [
    EventEmitterModule.forRoot(),
    MongooseModule.forFeature([{ name: Event.name, schema: EventSchema }]),
  ],
  providers: [
    EventEmitterService,
    UserEventHandler,
    AnalyticsEventHandler,
    VectorSyncHandler,
  ],
  exports: [EventEmitterService],
})
export class EventsModule {}
