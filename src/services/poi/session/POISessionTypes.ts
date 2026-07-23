/**
 * GUIDY - POI Session Types
 * Type definitions for POI Session Manager
 * 
 * STAGE 4.3: POI Session Manager
 */

import type { POI } from '../POITypes';

/**
 * POI Session State
 */
export enum POISessionState {
  IDLE = 'IDLE',
  SESSION_STARTED = 'SESSION_STARTED',
  DISCOVERING = 'DISCOVERING',
  ACTIVE = 'ACTIVE',
  UPDATING = 'UPDATING',
  PAUSED = 'PAUSED',
  FINISHED = 'FINISHED',
  ERROR = 'ERROR',
}

/**
 * POI Lifecycle State
 */
export enum POILifecycleState {
  NEW = 'NEW',
  DISCOVERED = 'DISCOVERED',
  ACTIVE = 'ACTIVE',
  SELECTED = 'SELECTED',
  VISITED = 'VISITED',
  ARCHIVED = 'ARCHIVED',
  EXPIRED = 'EXPIRED',
}

/**
 * POI Lifecycle Event
 */
export enum POILifecycleEvent {
  DISCOVER = 'DISCOVER',
  ACTIVATE = 'ACTIVATE',
  SELECT = 'SELECT',
  DESELECT = 'DESELECT',
  VISIT = 'VISIT',
  ARCHIVE = 'ARCHIVE',
  EXPIRE = 'EXPIRE',
  REMOVE = 'REMOVE',
}

/**
 * POI Session Event
 */
export enum POISessionEvent {
  START = 'START',
  STOP = 'STOP',
  PAUSE = 'PAUSE',
  RESUME = 'RESUME',
  UPDATE = 'UPDATE',
  RESET = 'RESET',
  ERROR = 'ERROR',
}

/**
 * POI with session metadata
 */
export interface POIWithSession {
  poi: POI;
  lifecycleState: POILifecycleState;
  discoveredAt: number;
  activatedAt?: number;
  visitedAt?: number;
  archivedAt?: number;
  expiredAt?: number;
  selectedAt?: number;
  visitCount: number;
}

/**
 * Session statistics
 */
export interface POISessionStats {
  sessionId: string;
  startTime: number;
  endTime?: number;
  totalDiscovered: number;
  totalActive: number;
  totalVisited: number;
  totalExpired: number;
  totalArchived: number;
  currentActiveCount: number;
  visitedPercentage: number;
}

/**
 * Session configuration
 */
export interface POISessionConfig {
  maxActivePOIs: number;
  maxVisitedPOIs: number;
  expirationRadius: number; // meters
  autoArchiveVisited: boolean;
  keepVisitedInMemory: boolean;
  deduplicationEnabled: boolean;
  coordinateThreshold: number; // meters
  nameSimilarityThreshold: number; // 0-1
}

/**
 * Default session configuration
 */
export const DEFAULT_SESSION_CONFIG: POISessionConfig = {
  maxActivePOIs: 100,
  maxVisitedPOIs: 50,
  expirationRadius: 500, // meters - POIs beyond this are expired
  autoArchiveVisited: true,
  keepVisitedInMemory: true,
  deduplicationEnabled: true,
  coordinateThreshold: 10, // meters
  nameSimilarityThreshold: 0.8, // 80%
};

/**
 * Session update result
 */
export interface POISessionUpdateResult {
  added: POIWithSession[];
  updated: POIWithSession[];
  removed: string[]; // POI IDs
  expired: string[]; // POI IDs
  archived: string[]; // POI IDs
  totalActive: number;
  totalVisited: number;
}

/**
 * POI Group
 */
export interface POIGroup {
  discovered: POIWithSession[];
  active: POIWithSession[];
  visited: POIWithSession[];
  expired: POIWithSession[];
}

/**
 * Session state change
 */
export interface POISessionStateChange {
  previousState: POISessionState;
  currentState: POISessionState;
  timestamp: number;
  event?: POISessionEvent;
}

/**
 * POI state change
 */
export interface POIStateChange {
  poiId: string;
  previousState: POILifecycleState;
  currentState: POILifecycleState;
  timestamp: number;
  event: POILifecycleEvent;
}
