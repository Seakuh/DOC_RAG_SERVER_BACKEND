# RAG Server - Architektur-Empfehlungen

## Executive Summary

Dieser Dokument beschreibt die empfohlene Architektur für einen Production-Ready RAG Server, der als zentrale Datenquelle für mehrere Applikationen dient und Nutzerverhalten/Entscheidungen mittels Embeddings analysiert.

## 🎯 Kernziele

1. **Multi-Tenant Support**: Verschiedene Apps nutzen denselben RAG Server
2. **Event-Driven User Analytics**: Jede Nutzeraktion wird erfasst und vektorisiert
3. **Intelligente Kategorisierung**: Automatische Klassifizierung von Nutzeraktionen
4. **Qdrant als primäre Vector DB**: Zentralisierte, skalierbare Vector-Verwaltung
5. **Real-time Insights**: Verhaltensanalyse in Echtzeit

---

## 📐 Vorgeschlagene Architektur

### 1. Event-Driven Architecture (EDA)

```
┌─────────────┐
│   Client    │
│  (Any App)  │
└──────┬──────┘
       │ HTTP Request
       ▼
┌─────────────────────────────────────────┐
│         NestJS RAG Server               │
│  ┌────────────────────────────────┐     │
│  │  Controller Layer              │     │
│  └────────┬───────────────────────┘     │
│           │                             │
│           ▼                             │
│  ┌────────────────────────────────┐     │
│  │  Service Layer                 │     │
│  │  - Emit UserEvent              │     │
│  └────────┬───────────────────────┘     │
│           │                             │
│           ▼                             │
│  ┌────────────────────────────────┐     │
│  │  EventEmitter                  │     │
│  │  (@nestjs/event-emitter)       │     │
│  └────┬──────────┬─────────┬──────┘     │
│       │          │         │            │
│       ▼          ▼         ▼            │
│  ┌────────┐ ┌────────┐ ┌────────┐      │
│  │Analytics│ │Vector  │ │Webhook │      │
│  │Handler  │ │Sync    │ │Handler │      │
│  │         │ │Handler │ │        │      │
│  └────┬───┘ └───┬────┘ └───┬────┘      │
│       │         │           │           │
│       ▼         ▼           ▼           │
│  ┌─────────┐ ┌──────────┐ ┌──────┐     │
│  │ MongoDB │ │  Qdrant  │ │ HTTP │     │
│  │ Events  │ │ Vectors  │ │      │     │
│  └─────────┘ └──────────┘ └──────┘     │
└─────────────────────────────────────────┘
```

### 2. Neue Module-Struktur

```
src/
├── events/                          # Event System
│   ├── events.module.ts
│   ├── emitter/
│   │   └── event-emitter.service.ts
│   ├── handlers/
│   │   ├── analytics-event.handler.ts
│   │   ├── vector-sync.handler.ts
│   │   └── notification.handler.ts
│   ├── dto/
│   │   ├── base-event.dto.ts
│   │   └── user-event.dto.ts
│   └── schemas/
│       └── event.schema.ts
│
├── analytics/                       # User Analytics
│   ├── analytics.module.ts
│   ├── analytics.service.ts
│   ├── analytics.controller.ts
│   ├── dto/
│   │   ├── session.dto.ts
│   │   └── interaction.dto.ts
│   └── schemas/
│       ├── session.schema.ts
│       ├── interaction.schema.ts
│       └── user-journey.schema.ts
│
├── user-events/                     # User Event Tracking
│   ├── user-events.module.ts
│   ├── user-events.service.ts
│   ├── user-events.controller.ts
│   ├── decorators/
│   │   └── track-event.decorator.ts
│   ├── interceptors/
│   │   └── event-tracking.interceptor.ts
│   └── categorizers/
│       ├── event-categorizer.service.ts
│       └── intent-analyzer.service.ts
│
├── qdrant/                          # Refactored Qdrant
│   ├── qdrant.module.ts
│   ├── qdrant.service.ts            # Generic service
│   ├── collections/
│   │   ├── base.collection.ts
│   │   ├── personality.collection.ts
│   │   ├── cannabis.collection.ts
│   │   ├── documents.collection.ts
│   │   └── user-events.collection.ts
│   ├── strategies/
│   │   └── vectorization.strategy.ts
│   └── dto/
│       ├── collection-config.dto.ts
│       └── vector-query.dto.ts
│
├── cache/                           # Redis Caching
│   ├── cache.module.ts
│   ├── cache.service.ts
│   └── strategies/
│       ├── embedding-cache.strategy.ts
│       └── query-cache.strategy.ts
│
├── health/                          # Health Checks
│   ├── health.module.ts
│   ├── health.controller.ts
│   └── indicators/
│       ├── qdrant.indicator.ts
│       ├── mongodb.indicator.ts
│       └── openai.indicator.ts
│
├── metrics/                         # Prometheus Metrics
│   ├── metrics.module.ts
│   ├── metrics.service.ts
│   └── metrics.controller.ts
│
└── webhooks/                        # Outgoing Webhooks
    ├── webhooks.module.ts
    ├── webhooks.service.ts
    └── schemas/
        └── webhook-config.schema.ts
```

---

## 🔄 Event Flow: User Action → Vector Storage

### Beispiel: User führt Query aus

```typescript
// 1. Controller empfängt Request
@Post('query')
@TrackEvent(UserEventType.QUERY_EXECUTED, EventCategory.LEARNING)
async executeQuery(@Body() queryDto: QueryDto, @User() user: UserPayload) {
  return this.queryService.execute(queryDto, user.userId);
}

// 2. @TrackEvent Decorator emittiert Event
// (automatisch via Interceptor)

// 3. Event wird von mehreren Handlers verarbeitet:

// Handler 1: Analytics (MongoDB)
@OnEvent('user.event.query.executed')
async handleQueryEvent(event: UserEvent) {
  await this.analyticsService.recordInteraction({
    userId: event.userId,
    type: 'query',
    metadata: event.metadata,
    timestamp: event.timestamp,
  });
}

// Handler 2: Vector Sync (Qdrant)
@OnEvent('user.event.query.executed')
async syncToVectorDB(event: UserEvent) {
  // Kategorisiere Event
  const category = await this.categorizer.categorize(event);

  // Erstelle Embedding
  const text = this.buildEventText(event);
  const vector = await this.embeddings.generate(text);

  // Speichere in Qdrant
  await this.qdrant.upsert('user-events', {
    id: event.id,
    vector,
    payload: {
      userId: event.userId,
      eventType: event.eventType,
      category,
      timestamp: event.timestamp,
      sourceApp: event.sourceApp,
    },
  });
}

// Handler 3: Real-time Notifications
@OnEvent('user.event.query.executed')
async notifyConnectedApps(event: UserEvent) {
  await this.webhooks.broadcast(event);
}
```

---

## 📊 Event Kategorisierung System

### Event Categories (Hauptkategorien)

```typescript
enum EventCategory {
  LEARNING = 'learning',           // Wissensaufnahme
  SOCIAL = 'social',              // Soziale Interaktionen
  GAMING = 'gaming',              // Spielaktivitäten
  CREATIVE = 'creative',          // Kreative Aktivitäten
  COMMERCE = 'commerce',          // Kaufaktivitäten
  SYSTEM = 'system',              // System-Events
}

enum EventIntent {
  EXPLORE = 'explore',            // Nutzer erkundet
  DECIDE = 'decide',              // Nutzer trifft Entscheidung
  CREATE = 'create',              // Nutzer erstellt etwas
  CONNECT = 'connect',            // Nutzer verbindet sich
  CONSUME = 'consume',            // Nutzer konsumiert Content
}
```

### Automatische Kategorisierung via LLM

```typescript
class EventCategorizerService {
  async categorize(event: UserEvent): Promise<EventClassification> {
    const prompt = `
Analysiere folgende Nutzeraktion und kategorisiere sie:

Event Type: ${event.eventType}
Metadata: ${JSON.stringify(event.metadata)}

Kategorisiere nach:
1. Category: ${Object.values(EventCategory).join(', ')}
2. Intent: ${Object.values(EventIntent).join(', ')}
3. Sentiment: positive, neutral, negative
4. Complexity: low, medium, high
5. Engagement Level: 1-10

Antwort als JSON.
    `;

    const response = await this.llm.complete(prompt);
    return JSON.parse(response);
  }
}
```

---

## 🗄️ Qdrant Collection Strategy

### Multi-Collection Design

```typescript
// qdrant/collections/base.collection.ts
export abstract class BaseCollection {
  abstract collectionName: string;
  abstract vectorSize: number;
  abstract distance: 'Cosine' | 'Euclid' | 'Dot';

  abstract buildPayload(data: any): Record<string, any>;
  abstract buildSearchText(data: any): string;
}

// qdrant/collections/user-events.collection.ts
export class UserEventsCollection extends BaseCollection {
  collectionName = 'user-events';
  vectorSize = 1536;
  distance = 'Cosine';

  buildPayload(event: UserEvent) {
    return {
      userId: event.userId,
      eventType: event.eventType,
      category: event.category,
      intent: event.intent,
      sourceApp: event.sourceApp,
      timestamp: event.timestamp.toISOString(),
      sessionId: event.sessionId,
    };
  }

  buildSearchText(event: UserEvent) {
    return `
User action: ${event.eventType}
Category: ${event.category}
Intent: ${event.intent}
Context: ${JSON.stringify(event.metadata)}
    `.trim();
  }
}
```

### Qdrant Service Refactoring

```typescript
// qdrant/qdrant.service.ts
@Injectable()
export class QdrantService {
  private client: QdrantClient;
  private collections: Map<string, BaseCollection> = new Map();

  constructor(
    @Inject('QDRANT_COLLECTIONS') collections: BaseCollection[],
  ) {
    collections.forEach(col => {
      this.collections.set(col.collectionName, col);
    });
  }

  async upsert(collectionName: string, data: any) {
    const collection = this.getCollection(collectionName);
    const text = collection.buildSearchText(data);
    const vector = await this.embeddings.generate(text);
    const payload = collection.buildPayload(data);

    return this.client.upsert(collectionName, {
      points: [{
        id: data.id,
        vector,
        payload,
      }],
    });
  }

  async search(collectionName: string, query: VectorQuery) {
    // Unified search across all collections
  }

  private getCollection(name: string): BaseCollection {
    const collection = this.collections.get(name);
    if (!collection) {
      throw new Error(`Collection ${name} not registered`);
    }
    return collection;
  }
}
```

---

## 🚀 Implementation Roadmap

### Phase 1: Foundation (Woche 1-2)
- [ ] Install `@nestjs/event-emitter`
- [ ] Create EventsModule with base infrastructure
- [ ] Create UserEventsModule
- [ ] Create AnalyticsModule
- [ ] Setup MongoDB schemas for events/analytics

### Phase 2: Qdrant Refactoring (Woche 2-3)
- [ ] Refactor QdrantService to be collection-agnostic
- [ ] Create BaseCollection abstract class
- [ ] Migrate PersonalityService to use new QdrantService
- [ ] Create UserEventsCollection
- [ ] Update all existing collections (cannabis, personality)

### Phase 3: Event Tracking (Woche 3-4)
- [ ] Create @TrackEvent decorator
- [ ] Create EventTrackingInterceptor
- [ ] Implement EventCategorizerService
- [ ] Add event tracking to existing controllers
- [ ] Create event handlers (Analytics, VectorSync, Webhooks)

### Phase 4: Infrastructure (Woche 4-5)
- [ ] Setup Redis caching
- [ ] Implement CacheModule
- [ ] Create HealthModule with indicators
- [ ] Setup MetricsModule (Prometheus)
- [ ] Add structured logging (Winston/Pino)

### Phase 5: Analytics & Insights (Woche 5-6)
- [ ] Create analytics dashboard endpoints
- [ ] Implement user behavior queries
- [ ] Add similarity search for user patterns
- [ ] Create recommendation engine based on events
- [ ] Setup real-time analytics

---

## 📝 Code Examples

### 1. Event Decorator

```typescript
// user-events/decorators/track-event.decorator.ts
export const TrackEvent = (
  eventType: UserEventType,
  category: EventCategory,
) => {
  return applyDecorators(
    SetMetadata('event:type', eventType),
    SetMetadata('event:category', category),
    UseInterceptors(EventTrackingInterceptor),
  );
};
```

### 2. Event Tracking Interceptor

```typescript
// user-events/interceptors/event-tracking.interceptor.ts
@Injectable()
export class EventTrackingInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const eventType = this.reflector.get<UserEventType>(
      'event:type',
      context.getHandler(),
    );
    const category = this.reflector.get<EventCategory>(
      'event:category',
      context.getHandler(),
    );

    const event: UserEvent = {
      id: uuidv4(),
      userId: request.user?.userId,
      eventType,
      category,
      metadata: {
        path: request.path,
        method: request.method,
        body: request.body,
        query: request.query,
      },
      timestamp: new Date(),
      sessionId: request.sessionId,
      sourceApp: request.headers['x-app-id'],
    };

    // Emit event asynchronously
    this.eventEmitter.emit('user.event', event);

    return next.handle();
  }
}
```

### 3. Analytics Service

```typescript
// analytics/analytics.service.ts
@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Interaction.name) private interactionModel: Model<InteractionDocument>,
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
    private readonly qdrant: QdrantService,
  ) {}

  async recordInteraction(data: CreateInteractionDto) {
    const interaction = await this.interactionModel.create(data);

    // Update session
    await this.updateSession(data.userId, data.sessionId);

    return interaction;
  }

  async getUserBehaviorPattern(userId: string) {
    // Get user's recent events from Qdrant
    const recentEvents = await this.qdrant.search('user-events', {
      filter: {
        must: [{ key: 'userId', match: { value: userId } }],
      },
      limit: 100,
    });

    // Analyze patterns
    const categories = this.groupByCategory(recentEvents);
    const intents = this.analyzeIntents(recentEvents);
    const timeline = this.buildTimeline(recentEvents);

    return {
      categories,
      intents,
      timeline,
      dominantBehavior: this.identifyDominantBehavior(categories),
    };
  }

  async findSimilarUsers(userId: string, limit: number = 10) {
    // Get user's event vector centroid
    const userEvents = await this.qdrant.search('user-events', {
      filter: {
        must: [{ key: 'userId', match: { value: userId } }],
      },
      limit: 50,
    });

    // Calculate average vector
    const centroid = this.calculateCentroid(userEvents);

    // Find similar event patterns
    const similar = await this.qdrant.search('user-events', {
      vector: centroid,
      limit: limit * 10, // Over-fetch to deduplicate
    });

    // Group by userId and return top matches
    return this.deduplicateByUser(similar, userId, limit);
  }
}
```

---

## 🔒 Security Considerations

1. **Event Sanitization**: Entferne sensible Daten aus Event Metadata
2. **Rate Limiting per User**: Verhindere Event-Flooding
3. **GDPR Compliance**: Anonymisierung/Löschung von User Events
4. **Access Control**: Events nur für authorisierte Apps sichtbar

---

## 📈 Performance Optimizations

1. **Event Batching**: Events in Batches zu Qdrant schreiben
2. **Async Handlers**: Alle Event Handler asynchron
3. **Redis Caching**: Cache für häufige Embedding-Requests
4. **Qdrant Sharding**: Für große Event-Volumes
5. **MongoDB Indexing**: Optimierte Indexes für Analytics-Queries

---

## 🧪 Testing Strategy

```typescript
// user-events/user-events.service.spec.ts
describe('UserEventsService', () => {
  it('should emit event on user action', async () => {
    const spy = jest.spyOn(eventEmitter, 'emit');

    await service.trackEvent({
      userId: 'test-user',
      eventType: UserEventType.QUERY_EXECUTED,
    });

    expect(spy).toHaveBeenCalledWith('user.event', expect.any(Object));
  });

  it('should categorize event correctly', async () => {
    const event = {
      eventType: UserEventType.QUERY_EXECUTED,
      metadata: { query: 'test' },
    };

    const category = await categorizer.categorize(event);

    expect(category.category).toBe(EventCategory.LEARNING);
    expect(category.intent).toBe(EventIntent.EXPLORE);
  });
});
```

---

## 📚 Dependencies to Add

```json
{
  "dependencies": {
    "@nestjs/event-emitter": "^2.0.4",
    "@nestjs/cache-manager": "^2.2.0",
    "@nestjs/terminus": "^10.2.0",
    "@willsoto/nestjs-prometheus": "^6.0.0",
    "cache-manager": "^5.4.0",
    "cache-manager-redis-store": "^3.0.1",
    "ioredis": "^5.3.2",
    "winston": "^3.11.0",
    "nest-winston": "^1.9.4"
  }
}
```

---

## 🎯 Success Metrics

Nach Implementation sollten folgende Metriken messbar sein:

1. **Event Volume**: Events/Sekunde pro App
2. **Categorization Accuracy**: % korrekt kategorisierter Events
3. **Vector Search Latency**: p95/p99 für Similarity Searches
4. **User Pattern Recognition**: % Users mit identifizierten Patterns
5. **Cache Hit Rate**: % gecachte Embedding Requests

---

## 🔗 Integration mit bestehenden Apps

Beispiel: Frontend App trackt User Action

```typescript
// Frontend (Any App)
const response = await fetch('/api/v1/query', {
  method: 'POST',
  headers: {
    'X-App-Id': 'my-poker-app',
    'Authorization': 'Bearer token',
  },
  body: JSON.stringify({ query: 'What is a flush?' }),
});

// Backend verarbeitet automatisch:
// 1. Query wird ausgeführt
// 2. Event wird emitted (via @TrackEvent)
// 3. Event wird kategorisiert
// 4. Vector wird in Qdrant gespeichert
// 5. Analytics werden aktualisiert
// 6. Andere Apps werden via Webhook notified
```

---

## 📞 API Endpoints für Analytics

```typescript
// Neue Analytics Endpoints
GET  /api/v1/analytics/users/:userId/behavior
GET  /api/v1/analytics/users/:userId/similar
GET  /api/v1/analytics/users/:userId/timeline
GET  /api/v1/analytics/users/:userId/predictions
POST /api/v1/analytics/users/:userId/query-pattern
GET  /api/v1/analytics/global/trends
GET  /api/v1/analytics/apps/:appId/metrics
```

---

## Zusammenfassung

Diese Architektur ermöglicht:
- ✅ Automatische Erfassung aller Nutzeraktionen
- ✅ KI-basierte Kategorisierung und Intent-Analyse
- ✅ Skalierbare Vector-Speicherung in Qdrant
- ✅ Real-time Analytics und Behavior Patterns
- ✅ Multi-App Support mit Webhooks
- ✅ Production-Ready Infrastructure (Caching, Health, Metrics)

Die Implementation kann schrittweise erfolgen ohne bestehende Features zu brechen.
