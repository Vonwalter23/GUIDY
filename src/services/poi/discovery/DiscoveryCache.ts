/**
 * GUIDY - Discovery Cache
 * Intelligent caching for POI discovery results
 * 
 * STAGE 4.2: POI Discovery Engine
 */

import type { POI } from '../POITypes';
import type { DiscoveryResult } from './DiscoveryTypes';

/**
 * Cache entry
 */
interface CacheEntry {
  result: DiscoveryResult;
  expiresAt: number;
  accessCount: number;
  lastAccess: number;
}

/**
 * Cache statistics
 */
interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  expirations: number;
}

/**
 * Discovery Cache
 * LRU cache with TTL for discovery results
 */
export class DiscoveryCache {
  private cache: Map<string, CacheEntry> = new Map();
  private ttlMs: number;
  private maxSize: number;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    expirations: 0,
  };

  constructor(ttlMs: number = 300000, maxSize: number = 50) {
    this.ttlMs = ttlMs;
    this.maxSize = maxSize;
  }

  /**
   * Set TTL
   */
  setTTL(ttlMs: number): void {
    this.ttlMs = ttlMs;
  }

  /**
   * Get TTL
   */
  getTTL(): number {
    return this.ttlMs;
  }

  /**
   * Set max size
   */
  setMaxSize(maxSize: number): void {
    this.maxSize = maxSize;
  }

  /**
   * Get max size
   */
  getMaxSize(): number {
    return this.maxSize;
  }

  /**
   * Generate cache key
   */
  private generateKey(
    latitude: number,
    longitude: number,
    radius: number
  ): string {
    // Round to ~10m precision
    const lat = Math.round(latitude * 100000) / 100000;
    const lng = Math.round(longitude * 100000) / 100000;
    const rad = Math.round(radius / 10) * 10;
    
    return `${lat},${lng},${rad}`;
  }

  /**
   * Check if coordinates are within cache radius
   */
  private isWithinRadius(
    cachedLat: number,
    cachedLng: number,
    cachedRadius: number,
    newLat: number,
    newLng: number,
    newRadius: number
  ): boolean {
    const distance = this.calculateDistance(
      cachedLat,
      cachedLng,
      newLat,
      newLng
    );
    
    // Check if new location is within cached area
    return distance <= cachedRadius + newRadius;
  }

  /**
   * Calculate distance between two points
   */
  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371000; // Earth radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Get cached result
   */
  get(
    latitude: number,
    longitude: number,
    radius: number
  ): DiscoveryResult | null {
    const key = this.generateKey(latitude, longitude, radius);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.expirations++;
      this.stats.misses++;
      return null;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccess = Date.now();

    // Move to end (LRU)
    this.cache.delete(key);
    this.cache.set(key, entry);

    this.stats.hits++;
    return entry.result;
  }

  /**
   * Check if there's a valid cache entry nearby
   */
  getNearby(
    latitude: number,
    longitude: number,
    radius: number
  ): DiscoveryResult | null {
    // Try exact match first
    const exact = this.get(latitude, longitude, radius);
    if (exact) {
      return exact;
    }

    // Try nearby cache entries
    for (const [key, entry] of this.cache) {
      if (Date.now() > entry.expiresAt) {
        this.cache.delete(key);
        this.stats.expirations++;
        continue;
      }

      const [cachedLat, cachedLng, cachedRadius] = key.split(',').map(Number);

      if (this.isWithinRadius(cachedLat, cachedLng, cachedRadius, latitude, longitude, radius)) {
        // Update access stats
        entry.accessCount++;
        entry.lastAccess = Date.now();

        this.stats.hits++;
        return entry.result;
      }
    }

    this.stats.misses++;
    return null;
  }

  /**
   * Set cache entry
   */
  set(
    latitude: number,
    longitude: number,
    radius: number,
    pois: POI[],
    source: 'network' | 'cache' = 'network'
  ): void {
    // Evict if at max size
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const key = this.generateKey(latitude, longitude, radius);
    
    const result: DiscoveryResult = {
      pois,
      source,
      timestamp: Date.now(),
      location: { latitude, longitude },
      radius,
      fromCache: false,
    };

    const entry: CacheEntry = {
      result,
      expiresAt: Date.now() + this.ttlMs,
      accessCount: 0,
      lastAccess: Date.now(),
    };

    this.cache.set(key, entry);
  }

  /**
   * Evict LRU entry
   */
  private evictLRU(): void {
    const oldestKey = this.cache.keys().next().value;
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Remove expired entries
   */
  cleanup(): number {
    let count = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        count++;
        this.stats.expirations++;
      }
    }

    return count;
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      expirations: 0,
    };
  }

  /**
   * Get cache hit rate
   */
  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses;
    if (total === 0) return 0;
    return this.stats.hits / total;
  }

  /**
   * Check if cache is valid for location
   */
  isValid(
    latitude: number,
    longitude: number,
    radius: number
  ): boolean {
    return this.get(latitude, longitude, radius) !== null;
  }

  /**
   * Invalidate cache for specific location
   */
  invalidate(latitude: number, longitude: number, radius: number): void {
    const key = this.generateKey(latitude, longitude, radius);
    this.cache.delete(key);
  }

  /**
   * Get all cache keys
   */
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }
}
