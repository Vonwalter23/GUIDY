/**
 * GUIDY - POI Deduplicator
 * Removes duplicate POIs based on coordinates, names, and metadata
 * 
 * STAGE 4.2: POI Discovery Engine
 */

import type { POI } from '../POITypes';
import type { DeduplicationOptions, ValidationResult } from './DiscoveryTypes';

/**
 * Default deduplication options
 */
const DEFAULT_OPTIONS: DeduplicationOptions = {
  coordinateThreshold: 10, // meters
  nameSimilarityThreshold: 0.8, // 80%
  mergeMetadata: true,
};

/**
 * POI Deduplicator
 * Removes duplicate POIs from search results
 */
export class POIDeduplicator {
  private options: DeduplicationOptions;

  constructor(options: Partial<DeduplicationOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Update options
   */
  setOptions(options: Partial<DeduplicationOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Deduplicate POIs
   */
  deduplicate(pois: POI[]): POI[] {
    console.log(`[DEDUP] ============================================`);
    console.log(`[DEDUP] Deduplicating POIs...`);
    console.log(`[DEDUP] Input POIs: ${pois.length}`);
    console.log(`[DEDUP] Coordinate threshold: ${this.options.coordinateThreshold}m`);
    console.log(`[DEDUP] Name similarity threshold: ${this.options.nameSimilarityThreshold * 100}%`);
    
    if (pois.length <= 1) {
      console.log(`[DEDUP] Only ${pois.length} POI(s), no deduplication needed`);
      console.log(`[DEDUP] Output POIs: ${pois.length}`);
      console.log(`[DEDUP] ============================================`);
      return pois;
    }

    const validated = this.validateAll(pois);
    const discardedByValidation = pois.length - validated.length;
    
    console.log(`[DEDUP] After validation: ${validated.length}`);
    console.log(`[DEDUP] Discarded by validation: ${discardedByValidation}`);
    
    const uniquePOIs: POI[] = [];
    const seenKeys = new Set<string>();

    for (const poi of validated) {
      const key = this.generateKey(poi);
      
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniquePOIs.push(poi);
      }
    }

    const duplicatesRemoved = validated.length - uniquePOIs.length;
    console.log(`[DEDUP] Duplicates removed: ${duplicatesRemoved}`);
    console.log(`[DEDUP] Output POIs: ${uniquePOIs.length}`);
    console.log(`[DEDUP] ============================================`);

    return uniquePOIs;
  }

  /**
   * Validate all POIs
   */
  validateAll(pois: POI[]): POI[] {
    const results = pois.map(poi => ({ poi, result: this.validate(poi) }));
    const valid = results.filter(r => r.result.valid).map(r => r.poi);
    const invalid = results.filter(r => !r.result.valid);
    
    if (invalid.length > 0) {
      console.log(`[DEDUP] Validation discarded POIs:`);
      invalid.forEach(({ poi, result }) => {
        console.log(`[DEDUP]   - ${poi.name || poi.id}: ${result.reason}`);
      });
    }
    
    return valid;
  }

  /**
   * Validate a single POI
   */
  validate(poi: POI): ValidationResult {
    // Check required fields
    if (!poi.id || poi.id.trim() === '') {
      return { valid: false, reason: 'Missing ID' };
    }

    if (!poi.latitude || !poi.longitude) {
      return { valid: false, reason: 'Missing coordinates' };
    }

    if (isNaN(poi.latitude) || isNaN(poi.longitude)) {
      return { valid: false, reason: 'Invalid coordinates' };
    }

    if (poi.latitude < -90 || poi.latitude > 90) {
      return { valid: false, reason: 'Latitude out of range' };
    }

    if (poi.longitude < -180 || poi.longitude > 180) {
      return { valid: false, reason: 'Longitude out of range' };
    }

    if (!poi.category || poi.category.trim() === '') {
      return { valid: false, reason: 'Missing category' };
    }

    return { valid: true };
  }

  /**
   * Generate unique key for POI
   */
  private generateKey(poi: POI): string {
    // Use coordinates rounded to ~1m precision
    const lat = Math.round(poi.latitude * 100000) / 100000;
    const lng = Math.round(poi.longitude * 100000) / 100000;
    
    // Normalize name
    const name = poi.name?.toLowerCase().trim() || '';
    
    return `${lat},${lng}|${name}`;
  }

  /**
   * Check if two POIs are duplicates based on coordinates
   */
  areDuplicatesByCoordinates(poi1: POI, poi2: POI): boolean {
    const distance = this.calculateDistance(
      poi1.latitude,
      poi1.longitude,
      poi2.latitude,
      poi2.longitude
    );

    return distance <= this.options.coordinateThreshold;
  }

  /**
   * Check if two POIs are duplicates based on name
   */
  areDuplicatesByName(poi1: POI, poi2: POI): boolean {
    if (!poi1.name || !poi2.name) {
      return false;
    }

    const similarity = this.calculateNameSimilarity(poi1.name, poi2.name);
    return similarity >= this.options.nameSimilarityThreshold;
  }

  /**
   * Calculate name similarity (Levenshtein-based)
   */
  private calculateNameSimilarity(name1: string, name2: string): number {
    const s1 = name1.toLowerCase().trim();
    const s2 = name2.toLowerCase().trim();

    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;

    const maxLen = Math.max(s1.length, s2.length);
    const distance = this.levenshteinDistance(s1, s2);

    return 1 - distance / maxLen;
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(s1: string, s2: string): number {
    const m = s1.length;
    const n = s2.length;

    if (m === 0) return n;
    if (n === 0) return m;

    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // deletion
          dp[i][j - 1] + 1, // insertion
          dp[i - 1][j - 1] + cost // substitution
        );
      }
    }

    return dp[m][n];
  }

  /**
   * Calculate distance between two points (Haversine)
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
   * Merge duplicate POIs
   */
  merge(pois: POI[]): POI[] {
    if (pois.length <= 1) {
      return pois;
    }

    const groups = this.groupDuplicates(pois);
    
    return groups.map(group => {
      if (group.length === 1) {
        return group[0];
      }
      return this.mergeGroup(group);
    });
  }

  /**
   * Group duplicate POIs together
   */
  private groupDuplicates(pois: POI[]): POI[][] {
    const groups: POI[][] = [];
    const processed = new Set<string>();

    for (const poi of pois) {
      if (processed.has(poi.id)) continue;

      const group: POI[] = [poi];
      processed.add(poi.id);

      for (const other of pois) {
        if (processed.has(other.id)) continue;

        if (
          this.areDuplicatesByCoordinates(poi, other) ||
          this.areDuplicatesByName(poi, other)
        ) {
          group.push(other);
          processed.add(other.id);
        }
      }

      groups.push(group);
    }

    return groups;
  }

  /**
   * Merge a group of duplicate POIs into one
   */
  private mergeGroup(group: POI[]): POI {
    // Use the first POI as base
    const merged = { ...group[0] };

    // Merge metadata if enabled
    if (this.options.mergeMetadata) {
      const allMetadata: Record<string, unknown>[] = [];
      
      for (const poi of group) {
        if (poi.metadata) {
          allMetadata.push(poi.metadata);
        }
      }
      
      if (allMetadata.length > 1) {
        merged.metadata = {
          ...allMetadata,
          sources: group.map(p => p.source),
          mergedAt: Date.now(),
        };
      }
    }

    // Keep the best name (longest usually more specific)
    for (const poi of group) {
      if (poi.name && poi.name.length > (merged.name?.length || 0)) {
        merged.name = poi.name;
        merged.displayName = poi.displayName;
      }
    }

    // Use highest rating
    for (const poi of group) {
      if (poi.rating && poi.rating > (merged.rating || 0)) {
        merged.rating = poi.rating;
        merged.ratingCount = poi.ratingCount;
      }
    }

    // Keep most complete address
    for (const poi of group) {
      if (poi.address && !merged.address) {
        merged.address = poi.address;
      }
      if (poi.phone && !merged.phone) {
        merged.phone = poi.phone;
      }
      if (poi.website && !merged.website) {
        merged.website = poi.website;
      }
    }

    return merged;
  }
}
