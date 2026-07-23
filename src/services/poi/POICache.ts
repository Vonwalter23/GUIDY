/**
 * GUIDY - POI Cache
 * In-memory cache for POI data
 * 
 * STAGE 4.0: POI Engine Architecture
 * 
 * Features:
 * - TTL (Time To Live) support
 * - Version tracking
 * - Invalidation
 * - LRU-style eviction
 */

import type { POI, POICacheEntry } from './POITypes';
import { DEFAULT_POI_ENGINE_CONFIG } from './POIConstants';

/**
 * Cache configuration
 */
interface POICacheConfig {
  ttl: number;
  maxSize: number;
}

/**
 * Debug logging
 */
const DEBUG_CACHE = true;

const log = (message: string, ...data: unknown[]): void => {
  if (DEBUG_CACHE) {
    console.log(`[POI CACHE] ${message}`, ...data);
  }
};

/**
 * POI Cache
 * In-memory cache with TTL support
 */
class POICache {
  private entries: Map<string, POICacheEntry> = new Map();
  private config: POICacheConfig;
  private initialized = false;
  private version = 1;
  
  constructor() {
    this.config = {
      ttl: DEFAULT_POI_ENGINE_CONFIG.cacheTTL,
      maxSize: DEFAULT_POI_ENGINE_CONFIG.maxCacheSize,
    };
  }
  
  /**
   * Initialize cache
   */
  initialize(config?: Partial<POICacheConfig>): void {
    this.config = {
      ttl: config?.ttl ?? DEFAULT_POI_ENGINE_CONFIG.cacheTTL,
      maxSize: config?.maxSize ?? DEFAULT_POI_ENGINE_CONFIG.maxCacheSize,
    };
    this.initialized = true;
    log('Initialized', this.config);
  }
  
  /**
   * Generate cache key from location and radius
   */
  private generateKey(latitude: number, longitude: number, radius: number): string {
    // Round to ~100m precision to increase cache hits
    const lat = Math.round(latitude * 1000) / 1000;
    const lng = Math.round(longitude * 1000) / 1000;
    const rad = Math.round(radius / 100) * 100;
    return `${lat},${lng},${rad}`;
  }
  
  /**
   * Get POIs from cache
   */
  get(latitude: number, longitude: number, radius: number): POI[] | null {
    if (!this.initialized) {
      log('Not initialized');
      return null;
    }
    
    const key = this.generateKey(latitude, longitude, radius);
    const entry = this.entries.get(key);
    
    if (!entry) {
      log('Cache miss:', key);
      return null;
    }
    
    // Check TTL
    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      log('Cache expired:', key, `age: ${age}ms`);
      this.entries.delete(key);
      return null;
    }
    
    log('Cache hit:', key, `age: ${age}ms`, `${entry.pois.length} POIs`);
    return entry.pois;
  }
  
  /**
   * Store POIs in cache
   */
  set(
    latitude: number,
    longitude: number,
    radius: number,
    pois: POI[],
    options?: { ttl?: number; version?: number }
  ): void {
    if (!this.initialized) {
      log('Not initialized - cannot set');
      return;
    }
    
    // Check size limit
    if (this.entries.size >= this.config.maxSize) {
      this.evictOldest();
    }
    
    const key = this.generateKey(latitude, longitude, radius);
    const entry: POICacheEntry = {
      pois,
      timestamp: Date.now(),
      ttl: options?.ttl ?? this.config.ttl,
      version: options?.version ?? this.version,
      source: pois[0]?.source || 'local_cache',
      centerLat: latitude,
      centerLng: longitude,
      radius,
    };
    
    this.entries.set(key, entry);
    log('Cached:', key, `${pois.length} POIs`);
  }
  
  /**
   * Mark POI as visited in cache
   */
  markVisited(poiId: string): void {
    for (const entry of this.entries.values()) {
      const poi = entry.pois.find(p => p.id === poiId);
      if (poi) {
        poi.visited = true;
        poi.visitedAt = Date.now();
        log('Marked visited in cache:', poiId);
      }
    }
  }
  
  /**
   * Mark POI as narrated in cache
   */
  markNarrated(poiId: string, narrationText?: string): void {
    for (const entry of this.entries.values()) {
      const poi = entry.pois.find(p => p.id === poiId);
      if (poi) {
        poi.narrated = true;
        if (narrationText) {
          poi.narrationText = narrationText;
        }
        log('Marked narrated in cache:', poiId);
      }
    }
  }
  
  /**
   * Invalidate cache for specific location
   */
  invalidate(latitude: number, longitude: number, radius?: number): void {
    if (radius) {
      const key = this.generateKey(latitude, longitude, radius);
      if (this.entries.delete(key)) {
        log('Invalidated:', key);
      }
    } else {
      // Invalidate all entries near this location
      let count = 0;
      for (const key of this.entries.keys()) {
        const [lat, lng] = key.split(',').map(Number);
        const dist = this.distance(latitude, longitude, lat, lng);
        if (dist < 1000) {
          // Within 1km
          this.entries.delete(key);
          count++;
        }
      }
      if (count > 0) {
        log(`Invalidated ${count} entries near (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
      }
    }
  }
  
  /**
   * Invalidate all cache
   */
  clear(): void {
    const size = this.entries.size;
    this.entries.clear();
    this.version++;
    log(`Cleared ${size} entries`);
  }
  
  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    ttl: number;
    version: number;
    oldestAge: number;
    newestAge: number;
  } {
    const now = Date.now();
    let oldestAge = 0;
    let newestAge = 0;
    
    for (const entry of this.entries.values()) {
      const age = now - entry.timestamp;
      oldestAge = Math.max(oldestAge, age);
      newestAge = newestAge === 0 ? age : Math.min(newestAge, age);
    }
    
    return {
      size: this.entries.size,
      maxSize: this.config.maxSize,
      ttl: this.config.ttl,
      version: this.version,
      oldestAge,
      newestAge,
    };
  }
  
  /**
   * Check if cache has data for location
   */
  has(latitude: number, longitude: number, radius: number): boolean {
    const key = this.generateKey(latitude, longitude, radius);
    const entry = this.entries.get(key);
    
    if (!entry) return false;
    
    const age = Date.now() - entry.timestamp;
    return age <= entry.ttl;
  }
  
  /**
   * Calculate distance between two points
   */
  private distance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  
  /**
   * Evict oldest cache entry
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.entries.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.entries.delete(oldestKey);
      log('Evicted oldest:', oldestKey);
    }
  }
  
  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.entries.clear();
    this.initialized = false;
    log('Cleaned up');
  }
}

// Export singleton instance
export const poiCache = new POICache();

// Export class for testing
export { POICache };

export default poiCache;
