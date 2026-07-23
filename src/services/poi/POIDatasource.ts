/**
 * GUIDY - POI Datasource Interface
 * Interface for POI data sources
 * 
 * STAGE 4.0: POI Engine Architecture
 * 
 * Implement this interface to add new data sources:
 * - OverpassDatasource
 * - GooglePlacesDatasource
 * - MapboxDatasource
 * - etc.
 */

import type { POI, POISearchOptions, POISource } from './POITypes';

/**
 * POI Datasource Interface
 * All datasources must implement this interface
 */
export interface POIDatasource {
  /**
   * Source identifier
   */
  readonly source: POISource;
  
  /**
   * Check if datasource is available/configured
   */
  isAvailable(): boolean;
  
  /**
   * Search for POIs near a location
   */
  search(options: POISearchOptions): Promise<POI[]>;
  
  /**
   * Get a specific POI by ID
   */
  getById(id: string): Promise<POI | null>;
  
  /**
   * Get POI details
   */
  getDetails(id: string): Promise<POI | null>;
  
  /**
   * Get nearby POIs
   */
  getNearby(
    latitude: number,
    longitude: number,
    radius: number
  ): Promise<POI[]>;
  
  /**
   * Check if source requires authentication
   */
  requiresAuth(): boolean;
  
  /**
   * Get authentication status
   */
  getAuthStatus(): { authenticated: boolean; message?: string };
  
  /**
   * Initialize datasource (e.g., setup API keys)
   */
  initialize(config?: Record<string, unknown>): Promise<void>;
  
  /**
   * Cleanup resources
   */
  cleanup(): Promise<void>;
}

/**
 * Base datasource class with common functionality
 */
export abstract class BasePOIDatasource implements POIDatasource {
  abstract readonly source: POISource;
  protected initialized = false;
  protected config: Record<string, unknown> = {};
  
  async initialize(config?: Record<string, unknown>): Promise<void> {
    this.config = config || {};
    this.initialized = true;
    console.log(`[POI DATASOURCE ${this.source}] Initialized`);
  }
  
  async cleanup(): Promise<void> {
    this.initialized = false;
    console.log(`[POI DATASOURCE ${this.source}] Cleaned up`);
  }
  
  abstract isAvailable(): boolean;
  abstract search(options: POISearchOptions): Promise<POI[]>;
  abstract getById(id: string): Promise<POI | null>;
  abstract getDetails(id: string): Promise<POI | null>;
  abstract getNearby(latitude: number, longitude: number, radius: number): Promise<POI[]>;
  
  requiresAuth(): boolean {
    return false;
  }
  
  getAuthStatus(): { authenticated: boolean; message?: string } {
    return { authenticated: true };
  }
  
  protected validateInitialized(): void {
    if (!this.initialized) {
      throw new Error(`Datasource ${this.source} not initialized`);
    }
  }
}
