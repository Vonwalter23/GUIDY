/**
 * GUIDY - POI Repository
 * Repository pattern for POI data access
 * 
 * STAGE 4.0: POI Engine Architecture
 * 
 * This repository acts as a single interface for all POI data sources.
 * Future implementations (OpenStreetMap, Google Places, etc.) will
 * be added as datasources implementing this interface.
 */

import type { POI, POISearchOptions, POISource } from './POITypes';
import { POIErrorCode } from './POITypes';
import type { POIDatasource } from './POIDatasource';

/**
 * POI Repository Error
 */
class POIRepositoryError extends Error {
  code: POIErrorCode;
  retryable: boolean;
  
  constructor(code: POIErrorCode, message: string, retryable: boolean = true) {
    super(message);
    this.name = 'POIRepositoryError';
    this.code = code;
    this.retryable = retryable;
  }
}

/**
 * POI Repository
 * Single point of entry for all POI data access
 */
class POIRepository {
  private datasources: Map<POISource, POIDatasource> = new Map();
  private defaultSource: POISource;
  private fallbackSources: POISource[];
  
  constructor() {
    // CRITICAL: Changed defaultSource from 'openstreetmap' to 'overpass'
    // 'openstreetmap' was not registered, causing search to fail immediately
    // Now 'overpass' is the default since it's the only registered datasource
    this.defaultSource = 'overpass' as POISource;
    this.fallbackSources = ['local_cache'] as POISource[];
  }
  
  /**
   * Register a datasource
   */
  registerDatasource(source: POISource, datasource: POIDatasource): void {
    this.datasources.set(source, datasource);
    console.log(`[POI REPO] Registered datasource: ${source}`);
  }
  
  /**
   * Unregister a datasource
   */
  unregisterDatasource(source: POISource): void {
    this.datasources.delete(source);
    console.log(`[POI REPO] Unregistered datasource: ${source}`);
  }
  
  /**
   * Set default source
   */
  setDefaultSource(source: POISource): void {
    this.defaultSource = source;
    console.log(`[POI REPO] Default source: ${source}`);
  }
  
  /**
   * Set fallback sources
   */
  setFallbackSources(sources: POISource[]): void {
    this.fallbackSources = sources;
    console.log(`[POI REPO] Fallback sources: ${sources.join(', ')}`);
  }
  
  /**
   * Search POIs using configured sources
   */
  async searchPOIs(options: POISearchOptions): Promise<POI[]> {
    console.log(`[REPOSITORY] ============================================`);
    console.log(`[REPOSITORY] SEARCH START`);
    console.log(`[REPOSITORY] Location: ${options.latitude.toFixed(6)}, ${options.longitude.toFixed(6)}`);
    console.log(`[REPOSITORY] Radius: ${options.radius}m`);
    console.log(`[REPOSITORY] Limit: ${options.limit || 'default'}`);
    console.log(`[REPOSITORY] Default source: ${this.defaultSource}`);
    console.log(`[REPOSITORY] Fallback sources: ${this.fallbackSources.join(', ') || 'none'}`);
    console.log(`[REPOSITORY] Registered datasources: ${Array.from(this.datasources.keys()).join(', ')}`);
    console.log(`[REPOSITORY] ============================================`);
    
    const sources = [this.defaultSource, ...this.fallbackSources];
    
    for (const source of sources) {
      const datasource = this.datasources.get(source);
      
      if (!datasource) {
        console.log(`[REPOSITORY] Datasource not registered: ${source}`);
        continue;
      }
      
      try {
        console.log(`[REPOSITORY] Query started with source: ${source}`);
        const pois = await datasource.search(options);
        
        if (pois.length > 0) {
          console.log(`[REPOSITORY] Found ${pois.length} POIs from ${source}`);
          console.log(`[REPOSITORY] ============================================`);
          console.log(`[REPOSITORY] SEARCH END - SUCCESS`);
          console.log(`[REPOSITORY] ============================================`);
          return this.enrichPOIs(pois, options.latitude, options.longitude);
        }
        
        console.log(`[REPOSITORY] No POIs from ${source}, trying next source...`);
      } catch (error) {
        console.error(`[REPOSITORY] Error from ${source}:`, error);
        
        // If last source, throw error
        if (source === sources[sources.length - 1]) {
          console.log(`[REPOSITORY] ============================================`);
          console.log(`[REPOSITORY] SEARCH END - ALL SOURCES FAILED`);
          console.log(`[REPOSITORY] ============================================`);
          throw new POIRepositoryError(
            POIErrorCode.SOURCE_UNAVAILABLE,
            `All sources failed. Last error from ${source}: ${error}`
          );
        }
      }
    }
    
    console.log(`[REPOSITORY] ============================================`);
    console.log(`[REPOSITORY] SEARCH END - NO RESULTS`);
    console.log(`[REPOSITORY] ============================================`);
    throw new POIRepositoryError(
      POIErrorCode.NO_RESULTS,
      'No POIs found from any source'
    );
  }
  
  /**
   * Get POI by ID
   */
  async getPOIById(id: string, source?: POISource): Promise<POI | null> {
    const targetSource = source || this.defaultSource;
    const datasource = this.datasources.get(targetSource);
    
    if (!datasource) {
      throw new POIRepositoryError(
        POIErrorCode.SOURCE_UNAVAILABLE,
        `Datasource not available: ${targetSource}`
      );
    }
    
    return datasource.getById(id);
  }
  
  /**
   * Get nearby POIs
   */
  async getNearbyPOIs(
    latitude: number,
    longitude: number,
    radius: number,
    options?: Partial<POISearchOptions>
  ): Promise<POI[]> {
    return this.searchPOIs({
      latitude,
      longitude,
      radius,
      ...options,
    });
  }
  
  /**
   * Get POIs by category
   */
  async getPOIsByCategory(
    category: string,
    latitude: number,
    longitude: number,
    radius: number
  ): Promise<POI[]> {
    return this.searchPOIs({
      latitude,
      longitude,
      radius,
      categories: [category as any],
    });
  }
  
  /**
   * Enrich POIs with calculated fields
   */
  private enrichPOIs(pois: POI[], userLat: number, userLng: number): POI[] {
    return pois.map(poi => ({
      ...poi,
      distance: this.calculateDistance(
        userLat,
        userLng,
        poi.latitude,
        poi.longitude
      ),
      bearing: this.calculateBearing(
        userLat,
        userLng,
        poi.latitude,
        poi.longitude
      ),
    }));
  }
  
  /**
   * Calculate distance between two points (Haversine formula)
   * Returns distance in meters
   */
  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  
  /**
   * Calculate bearing between two points
   * Returns bearing in degrees (0-360)
   */
  private calculateBearing(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const dLng = this.toRad(lng2 - lng1);
    const y = Math.sin(dLng) * Math.cos(this.toRad(lat2));
    const x =
      Math.cos(this.toRad(lat1)) * Math.sin(this.toRad(lat2)) -
      Math.sin(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.cos(dLng);
    
    let bearing = this.toDeg(Math.atan2(y, x));
    bearing = (bearing + 360) % 360;
    return bearing;
  }
  
  /**
   * Convert degrees to radians
   */
  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }
  
  /**
   * Convert radians to degrees
   */
  private toDeg(rad: number): number {
    return (rad * 180) / Math.PI;
  }
  
  /**
   * Get registered datasources
   */
  getRegisteredDatasources(): POISource[] {
    return Array.from(this.datasources.keys());
  }
  
  /**
   * Check if datasource is available
   */
  isDatasourceAvailable(source: POISource): boolean {
    return this.datasources.has(source);
  }
}

// Export singleton instance
export const poiRepository = new POIRepository();

// Export class for testing
export { POIRepository, POIRepositoryError };

export default poiRepository;
