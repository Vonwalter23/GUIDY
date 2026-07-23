/**
 * GUIDY - POI Engine
 * Main engine for POI operations
 * 
 * STAGE 4.0: POI Engine Architecture
 * 
 * The POI Engine orchestrates:
 * - Repository (data access)
 * - Cache (performance optimization)
 * - Filter (search refinement)
 * - State Machine (state management)
 */

import type { POI, POISearchOptions, POIError, POIFilterCriteria, POIEngineConfig } from './POITypes';
import { POIState, POIEvent, POIErrorCode } from './POITypes';
import { poiStateMachine } from './POIStateMachine';
import { poiRepository, POIRepositoryError } from './POIRepository';
import { poiCache } from './POICache';
import { poiFilter } from './POIFilter';
import { DEFAULT_POI_ENGINE_CONFIG } from './POIConstants';

/**
 * Debug logging
 */
const DEBUG_POI_ENGINE = true;

const log = (message: string, ...data: unknown[]): void => {
  if (DEBUG_POI_ENGINE) {
    console.log(`[POI ENGINE] ${message}`, ...data);
  }
};

/**
 * POI Engine
 * Main orchestrator for POI operations
 */
class POIEngine {
  private config: POIEngineConfig;
  private isInitialized = false;
  
  // Location from Location Engine (consumed, not modified)
  private currentLocation: { latitude: number; longitude: number } | null = null;
  
  // Debounce timer
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  
  constructor() {
    this.config = DEFAULT_POI_ENGINE_CONFIG;
  }
  
  /**
   * Initialize POI Engine
   */
  async initialize(config?: Partial<POIEngineConfig>): Promise<void> {
    if (this.isInitialized) {
      log('Already initialized');
      return;
    }
    
    log('Initializing POI Engine...');
    
    // Merge config
    this.config = { 
      ...DEFAULT_POI_ENGINE_CONFIG, 
      ...config,
    };
    
    // Initialize cache
    poiCache.initialize({
      ttl: this.config.cacheTTL,
      maxSize: this.config.maxCacheSize,
    });
    
    this.isInitialized = true;
    log('POI Engine initialized');
  }
  
  /**
   * Update current location from Location Engine
   */
  updateLocation(latitude: number, longitude: number): void {
    this.currentLocation = { latitude, longitude };
    log('Location updated:', this.currentLocation);
  }
  
  /**
   * Search POIs near current location
   */
  async searchPOIs(
    radius: number = this.config.defaultRadius,
    options?: Partial<POISearchOptions>
  ): Promise<POI[]> {
    if (!this.currentLocation) {
      log('Cannot search - no current location');
      return [];
    }
    
    return this.searchPOIsAtLocation(
      this.currentLocation.latitude,
      this.currentLocation.longitude,
      radius,
      options
    );
  }
  
  /**
   * Search POIs at specific location
   */
  async searchPOIsAtLocation(
    latitude: number,
    longitude: number,
    radius: number,
    options?: Partial<POISearchOptions>
  ): Promise<POI[]> {
    log(`Searching POIs at (${latitude.toFixed(4)}, ${longitude.toFixed(4)}), radius: ${radius}m`);
    
    // Check cache first
    const cachedPOIs = poiCache.get(latitude, longitude, radius);
    if (cachedPOIs && !options?.forceRefresh) {
      log('Returning cached POIs');
      poiStateMachine.sendEvent(POIEvent.SEARCH, {
        pois: cachedPOIs,
        center: { lat: latitude, lng: longitude },
        radius,
      });
      return cachedPOIs;
    }
    
    // Trigger search state
    poiStateMachine.sendEvent(POIEvent.SEARCH);
    
    try {
      const searchOptions: POISearchOptions = {
        latitude,
        longitude,
        radius,
        limit: this.config.defaultLimit,
        useCache: this.config.cacheEnabled,
        ...options,
      };
      
      const pois = await poiRepository.searchPOIs(searchOptions);
      
      // Cache results
      if (this.config.cacheEnabled) {
        poiCache.set(latitude, longitude, radius, pois);
      }
      
      // Update state machine
      poiStateMachine.sendEvent(POIEvent.SEARCH, {
        pois,
        center: { lat: latitude, lng: longitude },
        radius,
      });
      
      log(`Found ${pois.length} POIs`);
      return pois;
      
    } catch (error) {
      const poiError = this.handleError(error);
      poiStateMachine.sendEvent(POIEvent.ERROR, poiError);
      return [];
    }
  }
  
  /**
   * Filter POIs
   */
  filterPOIs(criteria: POIFilterCriteria): POI[] {
    const allPOIs = poiStateMachine.getPOIs();
    
    log('Filtering POIs with criteria:', criteria);
    
    poiStateMachine.sendEvent(POIEvent.FILTER);
    
    const filteredPOIs = poiFilter.apply(allPOIs, criteria);
    
    poiStateMachine.sendEvent(POIEvent.FILTER, {
      pois: filteredPOIs,
      filter: criteria,
    });
    
    return filteredPOIs;
  }
  
  /**
   * Select a POI
   */
  selectPOI(poi: POI): void {
    log('Selecting POI:', poi.name);
    poiStateMachine.sendEvent(POIEvent.SELECT, poi);
  }
  
  /**
   * Deselect current POI
   */
  deselectPOI(): void {
    log('Deselecting POI');
    poiStateMachine.sendEvent(POIEvent.DESELECT);
  }
  
  /**
   * Mark POI as visited
   */
  markPOIVisited(poiId: string): void {
    log('Marking POI as visited:', poiId);
    poiStateMachine.sendEvent(POIEvent.MARK_VISITED, poiId);
    
    // Update cache
    poiCache.markVisited(poiId);
  }
  
  /**
   * Load more POIs
   */
  async loadMorePOIs(): Promise<POI[]> {
    if (!this.currentLocation) {
      return [];
    }
    
    const state = poiStateMachine.getState();
    if (state !== POIState.READY && state !== POIState.LOADING) {
      return [];
    }
    
    log('Loading more POIs...');
    poiStateMachine.sendEvent(POIEvent.LOAD_MORE);
    
    try {
      const searchOptions: POISearchOptions = {
        latitude: this.currentLocation.latitude,
        longitude: this.currentLocation.longitude,
        radius: this.config.maxRadius,
        limit: this.config.maxLimit,
        offset: poiStateMachine.getPOIs().length,
      };
      
      const newPOIs = await poiRepository.searchPOIs(searchOptions);
      
      poiStateMachine.sendEvent(POIEvent.LOAD_MORE, { pois: newPOIs });
      
      return newPOIs;
      
    } catch (error) {
      const poiError = this.handleError(error);
      poiStateMachine.sendEvent(POIEvent.ERROR, poiError);
      return [];
    }
  }
  
  /**
   * Retry failed operation
   */
  async retry(): Promise<POI[]> {
    log('Retrying...');
    return this.searchPOIs();
  }
  
  /**
   * Reset engine state
   */
  reset(): void {
    log('Resetting POI Engine');
    poiStateMachine.sendEvent(POIEvent.RESET);
  }
  
  /**
   * Clear cache
   */
  clearCache(): void {
    log('Clearing cache');
    poiCache.clear();
    poiStateMachine.sendEvent(POIEvent.CLEAR_CACHE);
  }
  
  /**
   * Handle error from repository
   */
  private handleError(error: unknown): POIError {
    if (error instanceof POIRepositoryError) {
      return {
        code: error.code,
        message: error.message,
        retryable: error.retryable,
      };
    }
    
    return {
      code: POIErrorCode.UNKNOWN,
      message: error instanceof Error ? error.message : 'Unknown error',
      retryable: true,
    };
  }
  
  /**
   * Get current state
   */
  getState(): POIState {
    return poiStateMachine.getState();
  }
  
  /**
   * Get current POIs
   */
  getPOIs(): POI[] {
    return poiStateMachine.getPOIs();
  }
  
  /**
   * Get selected POI
   */
  getSelectedPOI(): POI | null {
    return poiStateMachine.getSelectedPOI();
  }
  
  /**
   * Get error
   */
  getError(): POIError | null {
    return poiStateMachine.getError();
  }
  
  /**
   * Check if initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }
  
  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    log('Cleaning up POI Engine');
    
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    
    await poiCache.cleanup();
    this.isInitialized = false;
  }
}

// Export singleton instance
export const poiEngine = new POIEngine();

// Export class for testing
export { POIEngine };

export default poiEngine;
