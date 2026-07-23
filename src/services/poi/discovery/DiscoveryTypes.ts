/**
 * GUIDY - Discovery Types
 * Type definitions for POI Discovery Engine
 * 
 * STAGE 4.2: POI Discovery Engine
 */

import type { POI } from '../POITypes';

/**
 * Discovery Engine State
 */
export enum DiscoveryState {
  IDLE = 'IDLE',
  WAITING_MOVEMENT = 'WAITING_MOVEMENT',
  WAITING_COOLDOWN = 'WAITING_COOLDOWN',
  SEARCHING = 'SEARCHING',
  USING_CACHE = 'USING_CACHE',
  RESULTS_READY = 'RESULTS_READY',
  ERROR = 'ERROR',
  OFFLINE = 'OFFLINE',
}

/**
 * Discovery Engine Events
 */
export enum DiscoveryEvent {
  START = 'START',
  STOP = 'STOP',
  LOCATION_UPDATE = 'LOCATION_UPDATE',
  MOVEMENT_THRESHOLD_EXCEEDED = 'MOVEMENT_THRESHOLD_EXCEEDED',
  COOLDOWN_COMPLETE = 'COOLDOWN_COMPLETE',
  SEARCH_START = 'SEARCH_START',
  SEARCH_COMPLETE = 'SEARCH_COMPLETE',
  CACHE_HIT = 'CACHE_HIT',
  CACHE_MISS = 'CACHE_MISS',
  ERROR = 'ERROR',
  NETWORK_OFFLINE = 'NETWORK_OFFLINE',
  NETWORK_ONLINE = 'NETWORK_ONLINE',
  RETRY = 'RETRY',
}

/**
 * Movement mode
 */
export enum MovementMode {
  WALKING = 'WALKING',
  CYCLING = 'CYCLING',
  VEHICLE = 'VEHICLE',
}

/**
 * Discovery configuration
 */
export interface DiscoveryConfig {
  // Movement
  movementThreshold: number; // meters
  defaultRadius: number; // meters
  radiusByMode: Record<MovementMode, number>;
  
  // Cooldown
  cooldownMs: number; // milliseconds
  enableCooldown: boolean;
  
  // Cache
  cacheTTLMs: number; // milliseconds
  enableCache: boolean;
  
  // Network
  enableNetworkCheck: boolean;
  networkTimeoutMs: number;
  
  // Performance
  debounceMs: number;
  maxResults: number;
}

/**
 * Default discovery configuration
 */
export const DEFAULT_DISCOVERY_CONFIG: DiscoveryConfig = {
  // Movement threshold - don't search until moved this distance
  movementThreshold: 50, // meters
  
  // Default search radius
  defaultRadius: 150, // meters
  
  // Radius by movement mode
  radiusByMode: {
    [MovementMode.WALKING]: 150, // 150m
    [MovementMode.CYCLING]: 300, // 300m
    [MovementMode.VEHICLE]: 600, // 600m
  },
  
  // Cooldown between searches
  cooldownMs: 20000, // 20 seconds
  enableCooldown: true,
  
  // Cache
  cacheTTLMs: 300000, // 5 minutes
  enableCache: true,
  
  // Network
  enableNetworkCheck: true,
  networkTimeoutMs: 10000, // 10 seconds
  
  // Performance
  debounceMs: 300,
  maxResults: 100,
};

/**
 * Discovery result
 */
export interface DiscoveryResult {
  pois: POI[];
  source: 'network' | 'cache';
  timestamp: number;
  location: {
    latitude: number;
    longitude: number;
  };
  radius: number;
  fromCache: boolean;
  cachedAt?: number;
}

/**
 * Discovery statistics
 */
export interface DiscoveryStats {
  totalSearches: number;
  cacheHits: number;
  cacheMisses: number;
  networkErrors: number;
  averageSearchTimeMs: number;
  lastSearchTime: number;
  lastCacheHitTime: number;
  uptime: number;
}

/**
 * Movement data
 */
export interface MovementData {
  lastLocation: {
    latitude: number;
    longitude: number;
  } | null;
  currentLocation: {
    latitude: number;
    longitude: number;
  } | null;
  distanceTraveled: number;
  mode: MovementMode;
  speed: number; // m/s
}

/**
 * Scheduler task
 */
export interface SchedulerTask {
  id: string;
  type: 'search' | 'refresh' | 'cleanup';
  scheduledAt: number;
  executeAt: number;
  priority: number;
  cancelled: boolean;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Deduplication options
 */
export interface DeduplicationOptions {
  coordinateThreshold: number; // meters
  nameSimilarityThreshold: number; // 0-1
  mergeMetadata: boolean;
}
