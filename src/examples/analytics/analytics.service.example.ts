import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { QdrantService } from '../../qdrant/qdrant.service';
import { Interaction, InteractionDocument } from './schemas/interaction.schema';
import { Session, SessionDocument } from './schemas/session.schema';
import { UserJourney, UserJourneyDocument } from './schemas/user-journey.schema';

/**
 * AnalyticsService - Nutzerverhalten-Analyse
 *
 * Dieser Service bietet umfassende Analytics-Funktionen:
 * - User Behavior Patterns (Verhaltsmuster)
 * - Similar Users (ähnliche Nutzer finden)
 * - Journey Analysis (User Journey Tracking)
 * - Engagement Metrics
 * - Predictive Analytics
 */
@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectModel(Interaction.name)
    private interactionModel: Model<InteractionDocument>,
    @InjectModel(Session.name)
    private sessionModel: Model<SessionDocument>,
    @InjectModel(UserJourney.name)
    private userJourneyModel: Model<UserJourneyDocument>,
    private readonly qdrant: QdrantService,
  ) {}

  /**
   * Record a user interaction
   *
   * Called by AnalyticsEventHandler when events are emitted
   */
  async recordInteraction(data: {
    userId: string;
    sessionId: string;
    eventType: string;
    category: string;
    metadata?: any;
  }): Promise<Interaction> {
    const interaction = await this.interactionModel.create({
      ...data,
      timestamp: new Date(),
    });

    // Update session
    await this.updateSession(data.userId, data.sessionId);

    return interaction;
  }

  /**
   * Update or create session
   */
  private async updateSession(userId: string, sessionId: string): Promise<void> {
    await this.sessionModel.findOneAndUpdate(
      { sessionId },
      {
        userId,
        lastActivity: new Date(),
        $inc: { interactionCount: 1 },
      },
      { upsert: true },
    );
  }

  /**
   * Get user behavior pattern
   *
   * Analyzes recent events to identify dominant behaviors
   *
   * @example
   * const pattern = await analytics.getUserBehaviorPattern('user-123');
   * // Returns:
   * // {
   * //   categories: { learning: 45, social: 30, gaming: 25 },
   * //   intents: { explore: 60, connect: 40 },
   * //   dominantBehavior: 'learning',
   * //   timeline: [...],
   * // }
   */
  async getUserBehaviorPattern(userId: string, days: number = 30) {
    try {
      // Get recent events from Qdrant
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const recentEvents = await this.qdrant.search('user-events', {
        filter: {
          userId,
        },
        limit: 1000,
        withPayload: true,
      });

      // Filter by date
      const filteredEvents = recentEvents.filter(
        e => new Date(e.payload.timestamp) >= startDate,
      );

      if (filteredEvents.length === 0) {
        return {
          categories: {},
          intents: {},
          timeline: [],
          dominantBehavior: null,
          totalEvents: 0,
        };
      }

      // Analyze patterns
      const categories = this.groupByCategory(filteredEvents);
      const intents = this.analyzeIntents(filteredEvents);
      const timeline = this.buildTimeline(filteredEvents);
      const dominantBehavior = this.identifyDominantBehavior(categories);

      return {
        categories,
        intents,
        timeline,
        dominantBehavior,
        totalEvents: filteredEvents.length,
        averageEventsPerDay: filteredEvents.length / days,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get user behavior pattern: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Find similar users based on behavior patterns
   *
   * Uses vector similarity in Qdrant to find users with similar event patterns
   *
   * @example
   * const similar = await analytics.findSimilarUsers('user-123', 10);
   * // Returns top 10 users with similar behavior
   */
  async findSimilarUsers(
    userId: string,
    limit: number = 10,
  ): Promise<
    Array<{
      userId: string;
      similarity: number;
      sharedCategories: string[];
    }>
  > {
    try {
      // Get user's recent events
      const userEvents = await this.qdrant.search('user-events', {
        filter: { userId },
        limit: 100,
        withVector: true,
      });

      if (userEvents.length === 0) {
        return [];
      }

      // Calculate centroid (average vector)
      const centroid = this.calculateCentroid(
        userEvents.map(e => e.vector as number[]),
      );

      // Find similar events
      const similarEvents = await this.qdrant.search('user-events', {
        vector: centroid,
        limit: limit * 20, // Over-fetch to deduplicate
        withPayload: true,
      });

      // Group by userId and calculate similarity
      const userSimilarities = this.deduplicateByUser(
        similarEvents,
        userId,
        limit,
      );

      return userSimilarities;
    } catch (error) {
      this.logger.error(`Failed to find similar users: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user journey (sequence of events)
   */
  async getUserJourney(
    userId: string,
    options?: {
      sessionId?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    },
  ) {
    const query: any = { userId };

    if (options?.sessionId) {
      query.sessionId = options.sessionId;
    }

    if (options?.startDate || options?.endDate) {
      query.timestamp = {};
      if (options.startDate) query.timestamp.$gte = options.startDate;
      if (options.endDate) query.timestamp.$lte = options.endDate;
    }

    const interactions = await this.interactionModel
      .find(query)
      .sort({ timestamp: 1 })
      .limit(options?.limit || 100)
      .exec();

    return {
      userId,
      totalSteps: interactions.length,
      journey: interactions.map(i => ({
        eventType: i.eventType,
        category: i.category,
        timestamp: i.timestamp,
        metadata: i.metadata,
      })),
    };
  }

  /**
   * Get engagement metrics for a user
   */
  async getUserEngagementMetrics(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const interactions = await this.interactionModel
      .find({
        userId,
        timestamp: { $gte: startDate },
      })
      .exec();

    const sessions = await this.sessionModel
      .find({
        userId,
        lastActivity: { $gte: startDate },
      })
      .exec();

    // Calculate metrics
    const totalInteractions = interactions.length;
    const uniqueSessions = sessions.length;
    const avgInteractionsPerSession =
      uniqueSessions > 0 ? totalInteractions / uniqueSessions : 0;

    // Calculate daily active days
    const activeDays = new Set(
      interactions.map(i => i.timestamp.toISOString().split('T')[0]),
    ).size;

    const engagementRate = (activeDays / days) * 100;

    return {
      totalInteractions,
      uniqueSessions,
      avgInteractionsPerSession: Math.round(avgInteractionsPerSession * 100) / 100,
      activeDays,
      engagementRate: Math.round(engagementRate * 100) / 100,
      avgInteractionsPerDay: Math.round((totalInteractions / days) * 100) / 100,
    };
  }

  /**
   * Predict user's next action
   *
   * Uses historical patterns to predict likely next actions
   */
  async predictNextAction(userId: string): Promise<{
    likelyActions: Array<{ eventType: string; probability: number }>;
    confidence: number;
  }> {
    try {
      // Get user's recent event sequence
      const recentEvents = await this.qdrant.search('user-events', {
        filter: { userId },
        limit: 50,
        withPayload: true,
      });

      if (recentEvents.length < 5) {
        return {
          likelyActions: [],
          confidence: 0,
        };
      }

      // Get the last event's vector
      const lastEventVector = recentEvents[0].vector as number[];

      // Find similar historical events
      const similarHistoricalEvents = await this.qdrant.search('user-events', {
        vector: lastEventVector,
        limit: 100,
        withPayload: true,
      });

      // Analyze what happened AFTER similar events
      const nextActions = new Map<string, number>();

      for (const event of similarHistoricalEvents) {
        const timestamp = new Date(event.payload.timestamp);

        // Find events that happened shortly after this one (within 5 minutes)
        const afterEvents = await this.qdrant.search('user-events', {
          filter: {
            userId: event.payload.userId,
          },
          limit: 10,
        });

        afterEvents
          .filter(e => {
            const eventTime = new Date(e.payload.timestamp);
            return eventTime > timestamp && eventTime <= new Date(timestamp.getTime() + 5 * 60000);
          })
          .forEach(e => {
            const count = nextActions.get(e.payload.eventType) || 0;
            nextActions.set(e.payload.eventType, count + 1);
          });
      }

      // Calculate probabilities
      const total = Array.from(nextActions.values()).reduce((a, b) => a + b, 0);
      const likelyActions = Array.from(nextActions.entries())
        .map(([eventType, count]) => ({
          eventType,
          probability: Math.round((count / total) * 100) / 100,
        }))
        .sort((a, b) => b.probability - a.probability)
        .slice(0, 5);

      const confidence = likelyActions[0]?.probability || 0;

      return {
        likelyActions,
        confidence,
      };
    } catch (error) {
      this.logger.error(`Failed to predict next action: ${error.message}`);
      return {
        likelyActions: [],
        confidence: 0,
      };
    }
  }

  /**
   * Helper: Group events by category
   */
  private groupByCategory(events: any[]): Record<string, number> {
    const categories: Record<string, number> = {};

    events.forEach(event => {
      const category = event.payload.category;
      categories[category] = (categories[category] || 0) + 1;
    });

    // Convert to percentages
    const total = events.length;
    Object.keys(categories).forEach(key => {
      categories[key] = Math.round((categories[key] / total) * 100);
    });

    return categories;
  }

  /**
   * Helper: Analyze intents
   */
  private analyzeIntents(events: any[]): Record<string, number> {
    const intents: Record<string, number> = {};

    events.forEach(event => {
      if (event.payload.intent) {
        const intent = event.payload.intent;
        intents[intent] = (intents[intent] || 0) + 1;
      }
    });

    // Convert to percentages
    const total = Object.values(intents).reduce((a, b) => a + b, 0);
    Object.keys(intents).forEach(key => {
      intents[key] = Math.round((intents[key] / total) * 100);
    });

    return intents;
  }

  /**
   * Helper: Build timeline
   */
  private buildTimeline(events: any[]): any[] {
    return events
      .map(e => ({
        timestamp: e.payload.timestamp,
        eventType: e.payload.eventType,
        category: e.payload.category,
      }))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Helper: Identify dominant behavior
   */
  private identifyDominantBehavior(categories: Record<string, number>): string | null {
    if (Object.keys(categories).length === 0) return null;

    return Object.entries(categories).sort(([, a], [, b]) => b - a)[0][0];
  }

  /**
   * Helper: Calculate centroid of vectors
   */
  private calculateCentroid(vectors: number[][]): number[] {
    if (vectors.length === 0) return [];

    const dimensions = vectors[0].length;
    const centroid = new Array(dimensions).fill(0);

    vectors.forEach(vector => {
      vector.forEach((value, i) => {
        centroid[i] += value;
      });
    });

    return centroid.map(sum => sum / vectors.length);
  }

  /**
   * Helper: Deduplicate events by userId
   */
  private deduplicateByUser(
    events: any[],
    excludeUserId: string,
    limit: number,
  ): Array<{
    userId: string;
    similarity: number;
    sharedCategories: string[];
  }> {
    const userMap = new Map<
      string,
      { scores: number[]; categories: Set<string> }
    >();

    events.forEach(event => {
      const eventUserId = event.payload.userId;

      if (eventUserId === excludeUserId) return;

      if (!userMap.has(eventUserId)) {
        userMap.set(eventUserId, { scores: [], categories: new Set() });
      }

      const userData = userMap.get(eventUserId);
      userData.scores.push(event.score);
      userData.categories.add(event.payload.category);
    });

    // Calculate average similarity per user
    const results = Array.from(userMap.entries())
      .map(([userId, data]) => ({
        userId,
        similarity:
          Math.round(
            (data.scores.reduce((a, b) => a + b, 0) / data.scores.length) * 100,
          ) / 100,
        sharedCategories: Array.from(data.categories),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return results;
  }
}
