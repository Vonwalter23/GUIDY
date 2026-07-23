/**
 * Discovery Cache Tests
 */

import { DiscoveryCache } from '../../src/services/poi/discovery/DiscoveryCache';
import { POI } from '../../src/services/poi/POITypes';

describe('DiscoveryCache', () => {
  let cache: DiscoveryCache;
  
  const createPOI = (id: string, lat: number, lng: number): POI => ({
    id,
    name: `POI ${id}`,
    category: 'food',
    subcategory: 'restaurant',
    latitude: lat,
    longitude: lng,
    source: 'overpass',
    distance: 100,
    metadata: {},
  });

  beforeEach(() => {
    cache = new DiscoveryCache(60000, 10); // 60s TTL, 10 max items
  });

  describe('Constructor', () => {
    it('should initialize with default values', () => {
      const c = new DiscoveryCache();
      expect(c.getTTL()).toBe(300000);
      expect(c.getMaxSize()).toBe(50);
    });

    it('should initialize with custom values', () => {
      expect(cache.getTTL()).toBe(60000);
      expect(cache.getMaxSize()).toBe(10);
    });
  });

  describe('setTTL', () => {
    it('should update TTL', () => {
      cache.setTTL(120000);
      expect(cache.getTTL()).toBe(120000);
    });
  });

  describe('setMaxSize', () => {
    it('should update max size', () => {
      cache.setMaxSize(20);
      expect(cache.getMaxSize()).toBe(20);
    });
  });

  describe('set and get', () => {
    it('should store and retrieve results', () => {
      const pois = [createPOI('1', 40.7128, -74.0060)];
      cache.set(40.7128, -74.0060, 100, pois);
      
      const result = cache.get(40.7128, -74.0060, 100);
      expect(result).not.toBeNull();
      expect(result?.pois.length).toBe(1);
    });

    it('should return null for non-existent entry', () => {
      const result = cache.get(40.7128, -74.0060, 100);
      expect(result).toBeNull();
    });

    it('should return null for expired entry', async () => {
      const shortCache = new DiscoveryCache(100, 10); // 100ms TTL
      const pois = [createPOI('1', 40.7128, -74.0060)];
      shortCache.set(40.7128, -74.0060, 100, pois);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const result = shortCache.get(40.7128, -74.0060, 100);
      expect(result).toBeNull();
    });
  });

  describe('getNearby', () => {
    it('should return exact match', () => {
      const pois = [createPOI('1', 40.7128, -74.0060)];
      cache.set(40.7128, -74.0060, 100, pois);
      
      const result = cache.getNearby(40.7128, -74.0060, 100);
      expect(result).not.toBeNull();
    });

    it('should return nearby cache entry', () => {
      const pois = [createPOI('1', 40.7128, -74.0060)];
      cache.set(40.7128, -74.0060, 500, pois);
      
      // Request nearby (within radius)
      const result = cache.getNearby(40.7129, -74.0060, 50);
      expect(result).not.toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear all entries', () => {
      const pois = [createPOI('1', 40.7128, -74.0060)];
      cache.set(40.7128, -74.0060, 100, pois);
      
      cache.clear();
      
      const result = cache.get(40.7128, -74.0060, 100);
      expect(result).toBeNull();
      expect(cache.size()).toBe(0);
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries', async () => {
      const shortCache = new DiscoveryCache(100, 10);
      const pois = [createPOI('1', 40.7128, -74.0060)];
      shortCache.set(40.7128, -74.0060, 100, pois);
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const removed = shortCache.cleanup();
      expect(removed).toBe(1);
    });
  });

  describe('size', () => {
    it('should return correct size', () => {
      expect(cache.size()).toBe(0);
      
      cache.set(40.7128, -74.0060, 100, [createPOI('1', 40.7128, -74.0060)]);
      expect(cache.size()).toBe(1);
      
      cache.set(40.7138, -74.0060, 100, [createPOI('2', 40.7138, -74.0060)]);
      expect(cache.size()).toBe(2);
    });

    it('should respect max size with LRU eviction', () => {
      const smallCache = new DiscoveryCache(60000, 3);
      
      smallCache.set(40.71, -74.00, 100, [createPOI('1', 40.71, -74.00)]);
      smallCache.set(40.72, -74.00, 100, [createPOI('2', 40.72, -74.00)]);
      smallCache.set(40.73, -74.00, 100, [createPOI('3', 40.73, -74.00)]);
      
      expect(smallCache.size()).toBe(3);
      
      // This should evict the first entry (LRU)
      smallCache.set(40.74, -74.00, 100, [createPOI('4', 40.74, -74.00)]);
      
      expect(smallCache.size()).toBe(3);
    });
  });

  describe('getStats', () => {
    it('should track hits and misses', () => {
      cache.set(40.7128, -74.0060, 100, [createPOI('1', 40.7128, -74.0060)]);
      
      // Miss
      cache.get(40.9999, -74.0060, 100);
      
      // Hit
      cache.get(40.7128, -74.0060, 100);
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });

    it('should track evictions', () => {
      const smallCache = new DiscoveryCache(60000, 2);
      
      smallCache.set(40.71, -74.00, 100, [createPOI('1', 40.71, -74.00)]);
      smallCache.set(40.72, -74.00, 100, [createPOI('2', 40.72, -74.00)]);
      smallCache.set(40.73, -74.00, 100, [createPOI('3', 40.73, -74.00)]); // Evicts
      
      const stats = smallCache.getStats();
      expect(stats.evictions).toBe(1);
    });
  });

  describe('getHitRate', () => {
    it('should calculate hit rate', () => {
      cache.set(40.7128, -74.0060, 100, [createPOI('1', 40.7128, -74.0060)]);
      
      cache.get(40.7128, -74.0060, 100);
      cache.get(40.7128, -74.0060, 100);
      cache.get(40.9999, -74.0060, 100);
      
      expect(cache.getHitRate()).toBeCloseTo(0.667, 1);
    });

    it('should return 0 for no requests', () => {
      expect(cache.getHitRate()).toBe(0);
    });
  });

  describe('isValid', () => {
    it('should return true for valid entry', () => {
      cache.set(40.7128, -74.0060, 100, [createPOI('1', 40.7128, -74.0060)]);
      expect(cache.isValid(40.7128, -74.0060, 100)).toBe(true);
    });

    it('should return false for non-existent entry', () => {
      expect(cache.isValid(40.7128, -74.0060, 100)).toBe(false);
    });
  });

  describe('invalidate', () => {
    it('should remove specific entry', () => {
      cache.set(40.7128, -74.0060, 100, [createPOI('1', 40.7128, -74.0060)]);
      cache.set(40.7138, -74.0060, 100, [createPOI('2', 40.7138, -74.0060)]);
      
      cache.invalidate(40.7128, -74.0060, 100);
      
      expect(cache.get(40.7128, -74.0060, 100)).toBeNull();
      expect(cache.get(40.7138, -74.0060, 100)).not.toBeNull();
    });
  });
});
