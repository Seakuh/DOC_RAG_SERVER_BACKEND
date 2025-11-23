import { IsString, IsEnum, IsObject, IsDate, IsOptional, IsUUID } from 'class-validator';

/**
 * Event Types - Alle möglichen User-Aktionen
 */
export enum UserEventType {
  // Document Events
  DOCUMENT_UPLOADED = 'document.uploaded',
  DOCUMENT_DELETED = 'document.deleted',
  DOCUMENT_VIEWED = 'document.viewed',

  // Query Events
  QUERY_EXECUTED = 'query.executed',
  QUERY_FAILED = 'query.failed',
  SIMILAR_SEARCH = 'similar.search',

  // Profile Events
  PROFILE_CREATED = 'profile.created',
  PROFILE_UPDATED = 'profile.updated',
  PROFILE_VIEWED = 'profile.viewed',

  // Personality Events
  QUESTIONS_ANSWERED = 'questions.answered',
  MATCH_VIEWED = 'match.viewed',
  MATCH_ACCEPTED = 'match.accepted',
  MATCH_REJECTED = 'match.rejected',

  // Cannabis Events
  STRAIN_SEARCHED = 'strain.searched',
  STRAIN_RECOMMENDED = 'strain.recommended',

  // Image Generation Events
  IMAGE_GENERATED = 'image.generated',
  IMAGE_DOWNLOADED = 'image.downloaded',

  // Gaming Events
  GAME_STARTED = 'game.started',
  GAME_FINISHED = 'game.finished',
  TOURNAMENT_JOINED = 'tournament.joined',

  // Workshop Events
  WORKSHOP_REGISTERED = 'workshop.registered',
  WORKSHOP_COMPLETED = 'workshop.completed',

  // Billing Events
  TOKENS_PURCHASED = 'tokens.purchased',
  TOKENS_CONSUMED = 'tokens.consumed',

  // System Events
  LOGIN = 'user.login',
  LOGOUT = 'user.logout',
  SESSION_STARTED = 'session.started',
  SESSION_ENDED = 'session.ended',
}

/**
 * Event Categories - Hauptkategorien für Verhaltensanalyse
 */
export enum EventCategory {
  LEARNING = 'learning',     // Wissensaufnahme, Queries, Documents
  SOCIAL = 'social',         // Matches, Profile, Networking
  GAMING = 'gaming',         // Spiele, Turniere
  CREATIVE = 'creative',     // Bildgenerierung, Content-Erstellung
  COMMERCE = 'commerce',     // Käufe, Token-Transaktionen
  SYSTEM = 'system',         // Login, Logout, Session
  WELLNESS = 'wellness',     // Cannabis-Empfehlungen
}

/**
 * Event Intent - Nutzer-Absicht
 */
export enum EventIntent {
  EXPLORE = 'explore',       // Nutzer erkundet/sucht
  DECIDE = 'decide',         // Nutzer trifft Entscheidung
  CREATE = 'create',         // Nutzer erstellt etwas
  CONNECT = 'connect',       // Nutzer verbindet sich
  CONSUME = 'consume',       // Nutzer konsumiert Content
  TRANSACT = 'transact',     // Nutzer kauft/verkauft
}

/**
 * UserEvent DTO - Basis-Event-Struktur
 */
export class UserEvent {
  @IsUUID()
  id: string;

  @IsString()
  userId: string;

  @IsEnum(UserEventType)
  eventType: UserEventType;

  @IsEnum(EventCategory)
  category: EventCategory;

  @IsOptional()
  @IsEnum(EventIntent)
  intent?: EventIntent;

  @IsObject()
  metadata: Record<string, any>;

  @IsDate()
  timestamp: Date;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsString()
  sourceApp?: string;
}

/**
 * Event Classification - Ergebnis der automatischen Kategorisierung
 */
export class EventClassification {
  @IsEnum(EventCategory)
  category: EventCategory;

  @IsEnum(EventIntent)
  intent: EventIntent;

  @IsEnum(['positive', 'neutral', 'negative'])
  sentiment: 'positive' | 'neutral' | 'negative';

  @IsEnum(['low', 'medium', 'high'])
  complexity: 'low' | 'medium' | 'high';

  @IsOptional()
  engagementLevel?: number; // 1-10

  @IsOptional()
  tags?: string[];
}
