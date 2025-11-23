# Implementation Guide - Event-Driven RAG Server

Diese Anleitung führt dich Schritt für Schritt durch die Implementierung der empfohlenen Architektur.

## 📋 Voraussetzungen

Bevor du startest:

```bash
# 1. Installiere benötigte Dependencies
npm install @nestjs/event-emitter @nestjs/cache-manager @nestjs/terminus @willsoto/nestjs-prometheus
npm install cache-manager cache-manager-redis-store ioredis winston nest-winston

# 2. Stelle sicher, dass Qdrant läuft
docker run -p 6333:6333 qdrant/qdrant

# 3. Optional: Redis für Caching
docker run -p 6379:6379 redis:7-alpine
```

## 🚀 Phase 1: Event System Setup (Tag 1-2)

### Schritt 1.1: Events Module erstellen

```bash
# Erstelle Module-Struktur
mkdir -p src/events/{emitter,handlers,dto,schemas}
mkdir -p src/user-events/{decorators,interceptors,categorizers}
```

### Schritt 1.2: EventEmitter konfigurieren

**`src/app.module.ts`** - EventEmitter hinzufügen:

```typescript
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    ConfigModule.forRoot({ ... }),
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
    // ... andere Module
  ],
})
export class AppModule {}
```

### Schritt 1.3: Basis-DTOs erstellen

Kopiere folgende Dateien aus `src/examples/events/dto/`:
- `user-event.dto.example.ts` → `src/events/dto/user-event.dto.ts`

Entferne `.example` Extension.

### Schritt 1.4: Event Schema erstellen

Kopiere:
- `src/examples/events/schemas/event.schema.example.ts` → `src/events/schemas/event.schema.ts`

Registriere in `events.module.ts`:

```typescript
import { MongooseModule } from '@nestjs/mongoose';
import { Event, EventSchema } from './schemas/event.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Event.name, schema: EventSchema }]),
  ],
})
export class EventsModule {}
```

### Schritt 1.5: Event Handlers erstellen

Kopiere und adaptiere:
- `user-event.handler.example.ts` → `src/events/handlers/user-event.handler.ts`
- `vector-sync.handler.example.ts` → `src/events/handlers/vector-sync.handler.ts`

**Wichtig:** Passe Imports an deine Projekt-Struktur an!

### Schritt 1.6: EventEmitterService erstellen

Kopiere:
- `event-emitter.service.example.ts` → `src/events/emitter/event-emitter.service.ts`

### Schritt 1.7: Events Module finalisieren

```typescript
// src/events/events.module.ts
import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MongooseModule } from '@nestjs/mongoose';
import { Event, EventSchema } from './schemas/event.schema';
import { EventEmitterService } from './emitter/event-emitter.service';
import { UserEventHandler } from './handlers/user-event.handler';
import { VectorSyncHandler } from './handlers/vector-sync.handler';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Event.name, schema: EventSchema }]),
  ],
  providers: [
    EventEmitterService,
    UserEventHandler,
    VectorSyncHandler,
  ],
  exports: [EventEmitterService],
})
export class EventsModule {}
```

Importiere in `app.module.ts`:

```typescript
import { EventsModule } from './events/events.module';

@Module({
  imports: [
    // ...
    EventsModule,
  ],
})
```

### Schritt 1.8: Teste das Event System

Erstelle Test-Endpoint:

```typescript
// src/app.controller.ts
import { EventEmitterService } from './events/emitter/event-emitter.service';
import { UserEventType, EventCategory } from './events/dto/user-event.dto';

@Controller()
export class AppController {
  constructor(
    private readonly eventEmitter: EventEmitterService,
  ) {}

  @Get('test-event')
  async testEvent() {
    await this.eventEmitter.emitUserEvent({
      userId: 'test-user-123',
      eventType: UserEventType.QUERY_EXECUTED,
      category: EventCategory.LEARNING,
      metadata: { query: 'Test query' },
      sourceApp: 'test-app',
    });

    return { message: 'Event emitted successfully' };
  }
}
```

**Test:**
```bash
npm run start:dev
curl http://localhost:3000/test-event
```

Prüfe Logs - du solltest sehen:
```
[EventEmitterService] Emitting event: query.executed for user test-user-123
[UserEventHandler] Storing event: query.executed for user test-user-123
[VectorSyncHandler] Syncing event to Qdrant: query.executed for user test-user-123
```

Prüfe MongoDB:
```bash
mongo
use rag-backend
db.user_events.find().pretty()
```

---

## 🔄 Phase 2: Automatisches Event Tracking (Tag 3-4)

### Schritt 2.1: TrackEvent Decorator erstellen

Kopiere:
- `track-event.decorator.example.ts` → `src/user-events/decorators/track-event.decorator.ts`
- `event-tracking.interceptor.example.ts` → `src/user-events/interceptors/event-tracking.interceptor.ts`

### Schritt 2.2: Wende Decorator auf bestehende Controller an

**Beispiel: Query Controller**

```typescript
// src/query/query.controller.ts
import { TrackEvent } from '../user-events/decorators/track-event.decorator';
import { UserEventType, EventCategory } from '../events/dto/user-event.dto';

@Controller('api/v1/query')
export class QueryController {
  @Post()
  @TrackEvent(UserEventType.QUERY_EXECUTED, EventCategory.LEARNING)
  async executeQuery(@Body() queryDto: QueryDto, @User() user: UserPayload) {
    return this.queryService.execute(queryDto, user.userId);
  }
}
```

**Beispiel: Documents Controller**

```typescript
// src/documents/documents.controller.ts
@Controller('api/v1/documents')
export class DocumentsController {
  @Post('upload')
  @TrackEvent(UserEventType.DOCUMENT_UPLOADED, EventCategory.LEARNING)
  async uploadDocument(@UploadedFile() file: Express.Multer.File, @User() user) {
    return this.documentsService.uploadDocument(file, user.userId);
  }
}
```

### Schritt 2.3: Füge weitere Event-Typen hinzu

Erweitere `UserEventType` in `user-event.dto.ts` basierend auf deinen Endpoints:

```typescript
export enum UserEventType {
  // Existing...

  // Add your specific events:
  PERSONALITY_MATCH_REQUESTED = 'personality.match.requested',
  STRAIN_RECOMMENDATION_REQUESTED = 'strain.recommendation.requested',
  WORKSHOP_ENROLLED = 'workshop.enrolled',
  // ... etc
}
```

---

## 🗄️ Phase 3: Qdrant Service Refactoring (Tag 5-7)

### Schritt 3.1: Backup des aktuellen QdrantService

```bash
cp src/qdrant/qdrant.service.ts src/qdrant/qdrant.service.backup.ts
```

### Schritt 3.2: Erstelle Collection-Klassen

```bash
mkdir -p src/qdrant/collections
```

Kopiere:
- `base.collection.example.ts` → `src/qdrant/collections/base.collection.ts`
- `user-events.collection.example.ts` → `src/qdrant/collections/user-events.collection.ts`

### Schritt 3.3: Erstelle Collections für bestehende Use Cases

**Cannabis Collection:**

```typescript
// src/qdrant/collections/cannabis.collection.ts
import { Injectable } from '@nestjs/common';
import { BaseCollection } from './base.collection';

@Injectable()
export class CannabisCollection extends BaseCollection {
  collectionName = 'cannabis-strains';
  vectorSize = 1536;
  distance = 'Cosine' as const;

  buildPayload(strain: any) {
    return {
      name: strain.name,
      type: strain.type,
      thc: strain.thc,
      cbd: strain.cbd,
      effects: strain.effects,
      description: strain.description,
    };
  }

  buildSearchText(strain: any): string {
    const parts = [
      `Cannabis strain: ${strain.name}`,
      `Type: ${strain.type}`,
      `Description: ${strain.description}`,
    ];

    if (strain.thc) parts.push(`THC: ${strain.thc}%`);
    if (strain.cbd) parts.push(`CBD: ${strain.cbd}%`);
    if (strain.effects?.length) parts.push(`Effects: ${strain.effects.join(', ')}`);

    return parts.join('. ');
  }
}
```

**Personality Collection:**

```typescript
// src/qdrant/collections/personality.collection.ts
import { Injectable } from '@nestjs/common';
import { BaseCollection } from './base.collection';

@Injectable()
export class PersonalityCollection extends BaseCollection {
  collectionName = 'personality-profiles';
  vectorSize = 1536;
  distance = 'Cosine' as const;

  buildPayload(profile: any) {
    return {
      userId: profile.userId,
      username: profile.username,
      region: profile.region,
      createdAt: new Date().toISOString(),
    };
  }

  buildSearchText(profile: any): string {
    return profile.generatedText || profile.personalityText || '';
  }
}
```

### Schritt 3.4: Refactore QdrantService

Kopiere:
- `qdrant.service.refactored.example.ts` → `src/qdrant/qdrant.service.new.ts`

**Wichtig:** Passe die Imports an!

### Schritt 3.5: Registriere Collections im Qdrant Module

```typescript
// src/qdrant/qdrant.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QdrantService } from './qdrant.service';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { BaseCollection } from './collections/base.collection';
import { UserEventsCollection } from './collections/user-events.collection';
import { CannabisCollection } from './collections/cannabis.collection';
import { PersonalityCollection } from './collections/personality.collection';

@Module({
  imports: [ConfigModule, EmbeddingsModule],
  providers: [
    QdrantService,
    UserEventsCollection,
    CannabisCollection,
    PersonalityCollection,
    {
      provide: 'QDRANT_COLLECTIONS',
      useFactory: (
        userEvents: UserEventsCollection,
        cannabis: CannabisCollection,
        personality: PersonalityCollection,
      ): BaseCollection[] => {
        return [userEvents, cannabis, personality];
      },
      inject: [UserEventsCollection, CannabisCollection, PersonalityCollection],
    },
  ],
  exports: [QdrantService],
})
export class QdrantModule {}
```

### Schritt 3.6: Migriere bestehende Qdrant-Nutzung

**Vorher (CannabisService):**

```typescript
await this.qdrant.upsertVectors([{
  id: strain._id,
  vector: embedding,
  payload: { name: strain.name, ... },
}]);
```

**Nachher:**

```typescript
await this.qdrant.upsert('cannabis-strains', {
  id: strain._id,
  data: strain,
});
```

**Migriere PersonalityService:**

Ersetze direkte `QdrantClient` Nutzung durch `QdrantService`:

```typescript
// Vorher:
await this.qdrantClient.upsert(this.collectionName, {
  wait: true,
  points: [{ id: vectorId, vector: embedding, payload: { userId } }],
});

// Nachher:
await this.qdrant.upsert('personality-profiles', {
  id: vectorId,
  data: profile,
});
```

### Schritt 3.7: Teste die Migration

```bash
npm run start:dev
```

Teste bestehende Features:
- Cannabis Recommendations
- Personality Matching
- Query System

Alles sollte weiterhin funktionieren!

---

## 📊 Phase 4: Analytics Module (Tag 8-10)

### Schritt 4.1: Erstelle Analytics Schemas

```bash
mkdir -p src/analytics/schemas
```

**Interaction Schema:**

```typescript
// src/analytics/schemas/interaction.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type InteractionDocument = Interaction & Document;

@Schema({ timestamps: true })
export class Interaction {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  sessionId: string;

  @Prop({ required: true })
  eventType: string;

  @Prop({ required: true, index: true })
  category: string;

  @Prop({ type: Object })
  metadata: Record<string, any>;

  @Prop({ required: true })
  timestamp: Date;
}

export const InteractionSchema = SchemaFactory.createForClass(Interaction);

InteractionSchema.index({ userId: 1, timestamp: -1 });
InteractionSchema.index({ sessionId: 1, timestamp: 1 });
```

**Session Schema:**

```typescript
// src/analytics/schemas/session.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SessionDocument = Session & Document;

@Schema({ timestamps: true })
export class Session {
  @Prop({ required: true, unique: true })
  sessionId: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ default: 0 })
  interactionCount: number;

  @Prop()
  lastActivity: Date;

  @Prop()
  sourceApp: string;
}

export const SessionSchema = SchemaFactory.createForClass(Session);
```

### Schritt 4.2: Erstelle Analytics Service

Kopiere:
- `analytics.service.example.ts` → `src/analytics/analytics.service.ts`

Passe Imports an!

### Schritt 4.3: Erstelle Analytics Controller

```typescript
// src/analytics/analytics.controller.ts
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('api/v1/analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('users/:userId/behavior')
  async getUserBehavior(
    @Param('userId') userId: string,
    @Query('days') days: number = 30,
  ) {
    return this.analytics.getUserBehaviorPattern(userId, days);
  }

  @Get('users/:userId/similar')
  async getSimilarUsers(
    @Param('userId') userId: string,
    @Query('limit') limit: number = 10,
  ) {
    return this.analytics.findSimilarUsers(userId, limit);
  }

  @Get('users/:userId/engagement')
  async getUserEngagement(
    @Param('userId') userId: string,
    @Query('days') days: number = 30,
  ) {
    return this.analytics.getUserEngagementMetrics(userId, days);
  }

  @Get('users/:userId/predict')
  async predictNextAction(@Param('userId') userId: string) {
    return this.analytics.predictNextAction(userId);
  }

  @Get('users/:userId/journey')
  async getUserJourney(
    @Param('userId') userId: string,
    @Query('sessionId') sessionId?: string,
  ) {
    return this.analytics.getUserJourney(userId, { sessionId });
  }
}
```

### Schritt 4.4: Analytics Module

```typescript
// src/analytics/analytics.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { Interaction, InteractionSchema } from './schemas/interaction.schema';
import { Session, SessionSchema } from './schemas/session.schema';
import { QdrantModule } from '../qdrant/qdrant.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Interaction.name, schema: InteractionSchema },
      { name: Session.name, schema: SessionSchema },
    ]),
    QdrantModule,
  ],
  providers: [AnalyticsService],
  controllers: [AnalyticsController],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
```

Importiere in `app.module.ts`:

```typescript
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    // ...
    AnalyticsModule,
  ],
})
```

### Schritt 4.5: Füge Analytics Handler hinzu

```typescript
// src/events/handlers/analytics-event.handler.ts
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserEvent } from '../dto/user-event.dto';
import { AnalyticsService } from '../../analytics/analytics.service';

@Injectable()
export class AnalyticsEventHandler {
  private readonly logger = new Logger(AnalyticsEventHandler.name);

  constructor(private readonly analytics: AnalyticsService) {}

  @OnEvent('user.event', { async: true })
  async handleUserEvent(event: UserEvent): Promise<void> {
    try {
      await this.analytics.recordInteraction({
        userId: event.userId,
        sessionId: event.sessionId,
        eventType: event.eventType,
        category: event.category,
        metadata: event.metadata,
      });

      this.logger.log(`Recorded interaction for user ${event.userId}`);
    } catch (error) {
      this.logger.error(`Failed to record interaction: ${error.message}`);
    }
  }
}
```

Registriere in `events.module.ts`:

```typescript
import { AnalyticsEventHandler } from './handlers/analytics-event.handler';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [
    // ...
    AnalyticsModule,
  ],
  providers: [
    // ...
    AnalyticsEventHandler,
  ],
})
```

### Schritt 4.6: Teste Analytics

```bash
# Start server
npm run start:dev

# Führe einige Aktionen aus (z.B. Queries)
curl -X POST http://localhost:3000/api/v1/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"query": "Test query"}'

# Prüfe Behavior Pattern
curl http://localhost:3000/api/v1/analytics/users/USER_ID/behavior

# Finde ähnliche Nutzer
curl http://localhost:3000/api/v1/analytics/users/USER_ID/similar
```

---

## 🤖 Phase 5: Event Categorization (Tag 11-12)

### Schritt 5.1: Erstelle Categorizer Service

Kopiere:
- `event-categorizer.service.example.ts` → `src/user-events/categorizers/event-categorizer.service.ts`

### Schritt 5.2: Registriere im Module

```typescript
// src/user-events/user-events.module.ts
import { Module } from '@nestjs/common';
import { EventCategorizerService } from './categorizers/event-categorizer.service';

@Module({
  providers: [EventCategorizerService],
  exports: [EventCategorizerService],
})
export class UserEventsModule {}
```

### Schritt 5.3: Nutze Categorizer in VectorSyncHandler

```typescript
// src/events/handlers/vector-sync.handler.ts
import { EventCategorizerService } from '../../user-events/categorizers/event-categorizer.service';

@Injectable()
export class VectorSyncHandler {
  constructor(
    private readonly categorizer: EventCategorizerService,
    // ...
  ) {}

  @OnEvent('user.event', { async: true })
  async syncEventToVectorDB(event: UserEvent): Promise<void> {
    // Kategorisiere, falls kein Intent vorhanden
    if (!event.intent) {
      const classification = await this.categorizer.categorize(event);
      event.intent = classification.intent;
      // Speichere auch andere Classifications im Payload
    }

    // ... rest of handler
  }
}
```

---

## 🎯 Phase 6: Testing & Validation (Tag 13-14)

### Schritt 6.1: Erstelle Integration Tests

```typescript
// test/events.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Events System (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('should track event when query is executed', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/query')
      .set('Authorization', 'Bearer TEST_TOKEN')
      .send({ query: 'Test query' })
      .expect(200);

    // Verify event was stored
    // ... check MongoDB for event
  });

  afterAll(async () => {
    await app.close();
  });
});
```

### Schritt 6.2: Load Testing

```bash
# Install k6
brew install k6  # macOS
# or: https://k6.io/docs/getting-started/installation/

# Create load test script
```

```javascript
// test/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 10 },  // Ramp up
    { duration: '3m', target: 50 },  // Sustained load
    { duration: '1m', target: 0 },   // Ramp down
  ],
};

export default function () {
  const res = http.post('http://localhost:3000/api/v1/query', JSON.stringify({
    query: 'Test query',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'event tracked': (r) => r.json('tracked') === true,
  });

  sleep(1);
}
```

Run:
```bash
k6 run test/load-test.js
```

---

## 📈 Phase 7: Monitoring & Optimization (Tag 15+)

### Schritt 7.1: Add Health Checks

```bash
npm install @nestjs/terminus
```

```typescript
// src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, MongooseHealthIndicator } from '@nestjs/terminus';
import { QdrantHealthIndicator } from './indicators/qdrant.indicator';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: MongooseHealthIndicator,
    private qdrant: QdrantHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('mongodb'),
      () => this.qdrant.isHealthy('qdrant'),
    ]);
  }
}
```

### Schritt 7.2: Add Prometheus Metrics

```bash
npm install @willsoto/nestjs-prometheus prom-client
```

```typescript
// src/metrics/metrics.module.ts
import { Module } from '@nestjs/common';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
      },
    }),
  ],
})
export class MetricsModule {}
```

### Schritt 7.3: Add Custom Metrics

```typescript
// Track event processing time
import { makeHistogramProvider } from '@willsoto/nestjs-prometheus';

export const EventProcessingHistogram = makeHistogramProvider({
  name: 'event_processing_duration_seconds',
  help: 'Duration of event processing in seconds',
  labelNames: ['event_type', 'status'],
});
```

---

## ✅ Checklist für Production

Vor dem Go-Live prüfen:

### Code Quality
- [ ] Alle TypeScript errors behoben
- [ ] ESLint warnings behoben
- [ ] Unit tests für alle Services
- [ ] E2E tests für kritische Flows
- [ ] Load tests bestanden

### Security
- [ ] JWT Auth auf allen protected Endpoints
- [ ] Event Sanitization (keine sensiblen Daten)
- [ ] Rate Limiting konfiguriert
- [ ] CORS richtig konfiguriert
- [ ] Environment Variables gesichert

### Performance
- [ ] Redis Caching aktiviert
- [ ] MongoDB Indexes optimiert
- [ ] Qdrant Performance getestet
- [ ] Event Batching implementiert
- [ ] Async Handlers nutzen

### Monitoring
- [ ] Health Checks funktionieren
- [ ] Prometheus Metrics exportiert
- [ ] Logging strukturiert (Winston/Pino)
- [ ] Error Tracking (Sentry/etc.)
- [ ] Alerting konfiguriert

### Infrastructure
- [ ] Docker Compose für dev funktioniert
- [ ] Production Dockerfile optimiert
- [ ] Qdrant Persistence konfiguriert
- [ ] MongoDB Backups konfiguriert
- [ ] Redis Persistence konfiguriert

### Documentation
- [ ] API Docs (Swagger) aktuell
- [ ] README aktualisiert
- [ ] CLAUDE.md aktualisiert
- [ ] Deployment Guide geschrieben

---

## 🆘 Troubleshooting

### Events werden nicht emitted

**Problem:** Events erscheinen nicht in MongoDB/Qdrant

**Lösung:**
1. Prüfe ob EventEmitterModule registriert ist
2. Prüfe Logs: `[EventEmitterService] Emitting event: ...`
3. Prüfe ob Handler registriert sind: `@OnEvent('user.event')`
4. Prüfe ob Handler Fehler wirft (catche Errors!)

### Qdrant Connection Fails

**Problem:** `Qdrant service is not available`

**Lösung:**
```bash
# Prüfe ob Qdrant läuft
curl http://localhost:6333/collections

# Starte Qdrant
docker run -p 6333:6333 qdrant/qdrant

# Prüfe .env
QDRANT_API_URL=http://localhost:6333
```

### Performance Issues

**Problem:** Requests werden langsam

**Lösung:**
1. Aktiviere Redis Caching
2. Nutze Event Batching
3. Mache Handler async
4. Prüfe MongoDB Indexes
5. Reduziere Qdrant Batch Size

### Vector Dimension Mismatch

**Problem:** `Vector dimension mismatch: expected 1536, got ...`

**Lösung:**
```typescript
// Stelle sicher, dass Embedding Dimensions konsistent sind
const response = await this.openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: text,
  dimensions: 1536, // ← WICHTIG!
});
```

---

## 📞 Support

Bei Fragen oder Problemen:
1. Check ARCHITECTURE_RECOMMENDATION.md
2. Check Beispiel-Dateien in `src/examples/`
3. Erstelle Issue auf GitHub
4. Kontaktiere Team

---

## 🎉 Fertig!

Nach erfolgreicher Implementation hast du:

✅ Event-Driven Architecture
✅ Automatisches User Tracking
✅ KI-basierte Event Kategorisierung
✅ Verhaltensanalyse & Predictions
✅ Similar User Matching
✅ Production-Ready Infrastructure

**Next Steps:**
- Erweitere Event-Typen für deine spezifischen Use Cases
- Baue Dashboard für Analytics
- Implementiere Webhooks für externe Apps
- Optimiere ML-Models für bessere Predictions

Happy Coding! 🚀
