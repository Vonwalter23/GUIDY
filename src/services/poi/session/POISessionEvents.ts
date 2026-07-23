/**
 * GUIDY - POI Session Events
 * Event system for POI Session Manager
 * 
 * STAGE 4.3: POI Session Manager
 */

import type { POIWithSession, POILifecycleState, POISessionState } from './POISessionTypes';

/**
 * Session event types
 */
export enum SessionEventType {
  // Session events
  SESSION_STARTED = 'SESSION_STARTED',
  SESSION_STOPPED = 'SESSION_STOPPED',
  SESSION_PAUSED = 'SESSION_PAUSED',
  SESSION_RESUMED = 'SESSION_RESUMED',
  SESSION_ERROR = 'SESSION_ERROR',
  SESSION_STATE_CHANGED = 'SESSION_STATE_CHANGED',
  
  // POI lifecycle events
  POI_DISCOVERED = 'POI_DISCOVERED',
  POI_ACTIVATED = 'POI_ACTIVATED',
  POI_SELECTED = 'POI_SELECTED',
  POI_DESELECTED = 'POI_DESELECTED',
  POI_VISITED = 'POI_VISITED',
  POI_ARCHIVED = 'POI_ARCHIVED',
  POI_EXPIRED = 'POI_EXPIRED',
  POI_REMOVED = 'POI_REMOVED',
  POI_STATE_CHANGED = 'POI_STATE_CHANGED',
  
  // Bulk events
  POIS_UPDATED = 'POIS_UPDATED',
  POIS_DISCOVERED_BATCH = 'POIS_DISCOVERED_BATCH',
  POIS_EXPIRED_BATCH = 'POIS_EXPIRED_BATCH',
  
  // Stats events
  STATS_UPDATED = 'STATS_UPDATED',
}

/**
 * Session event data
 */
export interface SessionStartedEvent {
  type: SessionEventType.SESSION_STARTED;
  sessionId: string;
  timestamp: number;
}

export interface SessionStoppedEvent {
  type: SessionEventType.SESSION_STOPPED;
  sessionId: string;
  duration: number;
  timestamp: number;
}

export interface SessionPausedEvent {
  type: SessionEventType.SESSION_PAUSED;
  sessionId: string;
  timestamp: number;
}

export interface SessionResumedEvent {
  type: SessionEventType.SESSION_RESUMED;
  sessionId: string;
  timestamp: number;
}

export interface SessionErrorEvent {
  type: SessionEventType.SESSION_ERROR;
  sessionId: string;
  error: Error;
  timestamp: number;
}

export interface SessionStateChangedEvent {
  type: SessionEventType.SESSION_STATE_CHANGED;
  sessionId: string;
  previousState: POISessionState;
  currentState: POISessionState;
  timestamp: number;
}

export interface POIDiscoveredEvent {
  type: SessionEventType.POI_DISCOVERED;
  poi: POIWithSession;
  timestamp: number;
}

export interface POIActivatedEvent {
  type: SessionEventType.POI_ACTIVATED;
  poi: POIWithSession;
  timestamp: number;
}

export interface POISelectedEvent {
  type: SessionEventType.POI_SELECTED;
  poi: POIWithSession;
  timestamp: number;
}

export interface POIDeselectedEvent {
  type: SessionEventType.POI_DESELECTED;
  poi: POIWithSession;
  previousPoiId?: string;
  timestamp: number;
}

export interface POIVisitedEvent {
  type: SessionEventType.POI_VISITED;
  poi: POIWithSession;
  visitCount: number;
  timestamp: number;
}

export interface POIArchivedEvent {
  type: SessionEventType.POI_ARCHIVED;
  poi: POIWithSession;
  timestamp: number;
}

export interface POIExpiredEvent {
  type: SessionEventType.POI_EXPIRED;
  poi: POIWithSession;
  distanceFromUser: number;
  timestamp: number;
}

export interface POIRemovedEvent {
  type: SessionEventType.POI_REMOVED;
  poiId: string;
  timestamp: number;
}

export interface POIStateChangedEvent {
  type: SessionEventType.POI_STATE_CHANGED;
  poi: POIWithSession;
  previousState: POILifecycleState;
  currentState: POILifecycleState;
  timestamp: number;
}

export interface POIsUpdatedEvent {
  type: SessionEventType.POIS_UPDATED;
  added: POIWithSession[];
  updated: POIWithSession[];
  removed: string[];
  expired: string[];
  archived: string[];
  timestamp: number;
}

export interface POIsDiscoveredBatchEvent {
  type: SessionEventType.POIS_DISCOVERED_BATCH;
  pois: POIWithSession[];
  count: number;
  timestamp: number;
}

export interface POIsExpiredBatchEvent {
  type: SessionEventType.POIS_EXPIRED_BATCH;
  pois: POIWithSession[];
  count: number;
  timestamp: number;
}

export interface StatsUpdatedEvent {
  type: SessionEventType.STATS_UPDATED;
  sessionId: string;
  totalDiscovered: number;
  totalActive: number;
  totalVisited: number;
  totalExpired: number;
  currentActiveCount: number;
  timestamp: number;
}

/**
 * Union type for all session events
 */
export type SessionEvent =
  | SessionStartedEvent
  | SessionStoppedEvent
  | SessionPausedEvent
  | SessionResumedEvent
  | SessionErrorEvent
  | SessionStateChangedEvent
  | POIDiscoveredEvent
  | POIActivatedEvent
  | POISelectedEvent
  | POIDeselectedEvent
  | POIVisitedEvent
  | POIArchivedEvent
  | POIExpiredEvent
  | POIRemovedEvent
  | POIStateChangedEvent
  | POIsUpdatedEvent
  | POIsDiscoveredBatchEvent
  | POIsExpiredBatchEvent
  | StatsUpdatedEvent;

/**
 * Event listener
 */
export type SessionEventListener = (event: SessionEvent) => void;

/**
 * Filtered event listener
 */
export type FilteredEventListener<T extends SessionEvent> = (event: T) => void;

/**
 * Event filter options
 */
export interface EventFilterOptions {
  eventTypes?: SessionEventType[];
  poiIds?: string[];
  includeHistory?: boolean;
}
