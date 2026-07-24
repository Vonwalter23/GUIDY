/**
 * GUIDY - POI Discovery Engine
 * Intelligent engine for discovering POIs based on user movement
 * 
 * STAGE 4.2: POI Discovery Engine
 * 
 * This engine decides:
 * - When to search
 * - What to search
 * - How much to search
 * - When to re-search
 * - What results to return
 */

import { POI } from '../POITypes';
import type {
  DiscoveryConfig,
  DiscoveryStats,
} from './DiscoveryTypes';
import { DiscoveryState, MovementMode, DiscoveryEvent as DiscoveryEventEnum } from './DiscoveryTypes';
import { DEFAULT_DISCOVERY_CONFIG } from './DiscoveryTypes';
import { MovementThreshold } from './MovementThreshold';
import { POIDeduplicator } from './POIDeduplicator';
import { POIRanking } from './POIRanking';
import { DiscoveryCache } from './DiscoveryCache';
import { DiscoveryScheduler } from './DiscoveryScheduler';
import { discoveryStateMachine, DiscoveryStateMachine } from './DiscoveryStateMachine';
import { poiRepository } from '../POIRepository';

/**
 * Debug logging
 */
const DEBUG = true;

const log = (message: string, ...data: unknown[]): void => {
  if (DEBUG) {
    console.log(`[DISCOVERY ENGINE] ${message}`, ...data);
  }
};

/**
 * Discovery Engine
 * Main orchestrator for POI discovery
 */
export class DiscoveryEngine {
  private config: DiscoveryConfig;
  private isInitialized: boolean = false;
  
  // Components
  private stateMachine: DiscoveryStateMachine;
  private movementThreshold: MovementThreshold;
  private deduplicator: POIDeduplicator;
  private ranking: POIRanking;
  private cache: DiscoveryCache;
  private scheduler: DiscoveryScheduler;
  
  // State
  private currentLocation: { latitude: number; longitude: number } | null = null;
  private currentMode: MovementMode = MovementMode.WALKING;
  private lastSearchLocation: { latitude: number; longitude: number } | null = null;
  private lastSearchTime: number = 0;
  private results: POI[] = [];
  private error: Error | null = null;
  
  // Performance tracking
  private searchCount: number = 0;
  private totalSearchTime: number = 0;
  private startTime: number = 0;

  constructor(config: Partial<DiscoveryConfig> = {}) {
    this.config = { ...DEFAULT_DISCOVERY_CONFIG, ...config };
    
    // Initialize components
    this.stateMachine = discoveryStateMachine;
    this.movementThreshold = new MovementThreshold(this.config.movementThreshold);
    this.deduplicator = new POIDeduplicator();
    this.ranking = new POIRanking();
    this.cache = new DiscoveryCache(this.config.cacheTTLMs);
    this.scheduler = new DiscoveryScheduler(this.config.cooldownMs, this.config.debounceMs);
    
    this.startTime = Date.now();
    
    // Listen to state changes
    this.stateMachine.addListener((state) => {
      log(`State changed to: ${state}`);
    });
  }

  /**
   * Initialize discovery engine
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      log('Already initialized');
      return;
    }
    
    log('Initializing Discovery Engine...');
    
    // Configure components
    this.movementThreshold.setThreshold(this.config.movementThreshold);
    this.ranking.setMovementMode(this.currentMode);
    
    this.isInitialized = true;
    log('Discovery Engine initialized');
  }

  /**
   * Start discovery
   */
  start(): void {
    if (!this.isInitialized) {
      log('Cannot start - not initialized');
      return;
    }
    
    log('Starting discovery');
    this.stateMachine.sendEvent(DiscoveryEventEnum.START);
  }

  /**
   * Stop discovery
   */
  stop(): void {
    log('Stopping discovery');
    this.stateMachine.sendEvent(DiscoveryEventEnum.STOP);
    this.scheduler.cancelAllTasks();
  }

  /**
   * Update user location
   */
  updateLocation(latitude: number, longitude: number): void {
    this.currentLocation = { latitude, longitude };
    this.ranking.setUserLocation(latitude, longitude);
    
    log(`Location updated: (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
    
    // Process location update
    if (this.stateMachine.isIdle()) {
      this.stateMachine.sendEvent(DiscoveryEventEnum.LOCATION_UPDATE);
    }
    
    if (this.stateMachine.getState() === DiscoveryState.WAITING_MOVEMENT) {
      this.checkMovementThreshold(latitude, longitude);
    }
  }

  /**
   * Set movement mode
   */
  setMovementMode(mode: MovementMode): void {
    this.currentMode = mode;
    this.movementThreshold.setMode(mode);
    this.ranking.setMovementMode(mode);
    
    // Update search radius based on mode
    const newRadius = this.config.radiusByMode[mode];
    if (newRadius !== this.config.defaultRadius) {
      log(`Movement mode changed to ${mode}, radius: ${newRadius}m`);
    }
  }

  /**
   * Get current radius for mode
   */
  getCurrentRadius(): number {
    return this.config.radiusByMode[this.currentMode];
  }

  /**
   * Check if movement threshold exceeded
   */
  private checkMovementThreshold(latitude: number, longitude: number): void {
    const movement = this.movementThreshold.updateLocation(latitude, longitude);
    
    log(
      `Movement: ${movement.distanceFromLast.toFixed(1)}m since last update, ` +
      `total: ${movement.totalDistance.toFixed(1)}m, ` +
      `threshold: ${this.movementThreshold.getThreshold()}m`
    );
    
    if (movement.thresholdExceeded) {
      log('Movement threshold exceeded');
      this.movementThreshold.resetMovement();
      this.stateMachine.sendEvent(DiscoveryEventEnum.MOVEMENT_THRESHOLD_EXCEEDED);
      this.scheduleCooldown();
    }
  }

  /**
   * Schedule cooldown
   */
  private scheduleCooldown(): void {
    if (!this.config.enableCooldown) {
      this.stateMachine.sendEvent(DiscoveryEventEnum.COOLDOWN_COMPLETE);
      return;
    }
    
    // Schedule cooldown complete
    this.scheduler.scheduleTask(
      'cooldown-complete',
      {
        type: 'search',
        scheduledAt: Date.now(),
        executeAt: Date.now() + this.config.cooldownMs,
        priority: 1,
      }
    );
    
    // Wait for cooldown
    setTimeout(() => {
      if (this.stateMachine.getState() === DiscoveryState.WAITING_COOLDOWN) {
        this.stateMachine.sendEvent(DiscoveryEventEnum.COOLDOWN_COMPLETE);
        this.performSearch();
      }
    }, this.config.cooldownMs);
  }

  /**
   * Perform POI search
   */
  private async performSearch(): Promise<void> {
    console.log(`[DISCOVERY] ============================================`);
    console.log(`[DISCOVERY] performSearch() executing...`);
    console.log(`[DISCOVERY] currentLocation: ${this.currentLocation ? `${this.currentLocation.latitude.toFixed(6)}, ${this.currentLocation.longitude.toFixed(6)}` : 'null'}`);
    
    if (!this.currentLocation) {
      console.log(`[DISCOVERY] Cannot search - no current location`);
      log('Cannot search - no current location');
      console.log(`[DISCOVERY] ============================================`);
      return;
    }
    
    const { latitude, longitude } = this.currentLocation;
    const radius = this.getCurrentRadius();
    
    console.log(`[DISCOVERY] Searching at (${latitude.toFixed(6)}, ${longitude.toFixed(6)}), radius: ${radius}m`);
    console.log(`[DISCOVERY] maxResults: ${this.config.maxResults}`);
    console.log(`[DISCOVERY] enableCache: ${this.config.enableCache}`);
    this.stateMachine.sendEvent(DiscoveryEventEnum.SEARCH_START);
    
    const startTime = Date.now();
    
    try {
      // Check cache first
      if (this.config.enableCache) {
        console.log(`[DISCOVERY] Checking cache...`);
        const cachedResult = this.cache.getNearby(latitude, longitude, radius);
        if (cachedResult) {
          console.log(`[DISCOVERY] Cache HIT! Using cached results (${cachedResult.pois.length} POIs)`);
          log('Using cached results');
          this.stateMachine.sendEvent(DiscoveryEventEnum.CACHE_HIT);
          this.processResults(cachedResult.pois, 'cache');
          console.log(`[DISCOVERY] ============================================`);
          return;
        } else {
          console.log(`[DISCOVERY] Cache MISS`);
        }
      }
      
      // Use POI repository
      console.log(`[DISCOVERY] Calling poiRepository.searchPOIs...`);
      console.log(`[REPOSITORY] ============================================`);
      console.log(`[REPOSITORY] searchPOIs called with:`);
      console.log(`[REPOSITORY] latitude: ${latitude}`);
      console.log(`[REPOSITORY] longitude: ${longitude}`);
      console.log(`[REPOSITORY] radius: ${radius}`);
      console.log(`[REPOSITORY] limit: ${this.config.maxResults}`);
      console.log(`[REPOSITORY] ============================================`);
      
      const pois = await poiRepository.searchPOIs({
        latitude,
        longitude,
        radius,
        limit: this.config.maxResults,
      });
      
      const searchTime = Date.now() - startTime;
      this.totalSearchTime += searchTime;
      this.searchCount++;
      
      console.log(`[DISCOVERY] Search completed: ${pois.length} POIs in ${searchTime}ms`);
      log(`Search completed: ${pois.length} POIs in ${searchTime}ms`);
      
      // Process results
      console.log(`[DISCOVERY] Processing results...`);
      this.processResults(pois, 'network');
      this.stateMachine.sendEvent(DiscoveryEventEnum.SEARCH_COMPLETE);
      
      // Cache results
      if (this.config.enableCache) {
        console.log(`[DISCOVERY] Caching ${this.results.length} results`);
        this.cache.set(latitude, longitude, radius, this.results);
      }
      
      // Update last search
      this.lastSearchLocation = { latitude, longitude };
      this.lastSearchTime = Date.now();
      
      console.log(`[DISCOVERY] performSearch completed successfully`);
      console.log(`[DISCOVERY] ============================================`);
      
    } catch (error) {
      console.log(`[DISCOVERY] Search error:`, error);
      log('Search error:', error);
      this.error = error instanceof Error ? error : new Error('Unknown error');
      
      if (!this.scheduler.checkNetwork()) {
        this.stateMachine.sendEvent(DiscoveryEventEnum.NETWORK_OFFLINE);
      } else {
        this.stateMachine.sendEvent(DiscoveryEventEnum.ERROR);
      }
      console.log(`[DISCOVERY] ============================================`);
    }
  }

  /**
   * Process search results
   */
  private processResults(pois: POI[], source: 'network' | 'cache'): void {
    log(`Processing ${pois.length} POIs from ${source}`);
    
    // Validate
    const validated = this.deduplicator.validateAll(pois);
    log(`Validated: ${validated.length} POIs`);
    
    // Deduplicate
    const deduplicated = this.deduplicator.deduplicate(validated);
    log(`After deduplication: ${deduplicated.length} POIs`);
    
    // Rank
    const ranked = this.ranking.rank(deduplicated);
    
    // Update results
    this.results = ranked;
    this.error = null;
  }

  /**
   * Trigger search (called externally)
   */
  async search(): Promise<POI[]> {
    console.log(`[DISCOVERY] ============================================`);
    console.log(`[DISCOVERY] search() called`);
    console.log(`[DISCOVERY] isInitialized: ${this.isInitialized}`);
    console.log(`[DISCOVERY] currentLocation: ${this.currentLocation ? `${this.currentLocation.latitude.toFixed(6)}, ${this.currentLocation.longitude.toFixed(6)}` : 'null'}`);
    console.log(`[DISCOVERY] isInCooldown: ${this.scheduler.isInCooldown()}`);
    console.log(`[DISCOVERY] remainingCooldown: ${this.scheduler.getRemainingCooldown()}ms`);
    console.log(`[DISCOVERY] currentState: ${this.stateMachine.getState()}`);
    console.log(`[DISCOVERY] ============================================`);
    
    if (!this.isInitialized) {
      console.log(`[DISCOVERY] Not initialized, calling initialize()...`);
      await this.initialize();
    }
    
    if (this.scheduler.isInCooldown()) {
      console.log(`[DISCOVERY] Search skipped - in cooldown`);
      log('Search skipped - in cooldown');
      return this.results;
    }
    
    console.log(`[DISCOVERY] Scheduling search via debouncer...`);
    // Schedule via debouncer
    this.scheduler.scheduleSearch(() => {
      console.log(`[DISCOVERY] Debouncer callback executing...`);
      this.performSearch();
    });
    
    console.log(`[DISCOVERY] Returning current results (${this.results.length} POIs)`);
    console.log(`[DISCOVERY] ============================================`);
    return this.results;
  }

  /**
   * Force search (bypass cooldown)
   */
  async forceSearch(): Promise<POI[]> {
    this.scheduler.endCooldown();
    await this.performSearch();
    return this.results;
  }

  /**
   * Retry failed search
   */
  async retry(): Promise<POI[]> {
    log('Retrying search...');
    this.stateMachine.sendEvent(DiscoveryEventEnum.RETRY);
    return this.search();
  }

  /**
   * Get current results
   */
  getResults(): POI[] {
    return this.results;
  }

  /**
   * Get discovery state
   */
  getState(): DiscoveryState {
    return this.stateMachine.getState();
  }

  /**
   * Get current error
   */
  getError(): Error | null {
    return this.error;
  }

  /**
   * Get statistics
   */
  getStats(): DiscoveryStats {
    return {
      totalSearches: this.searchCount,
      cacheHits: this.cache.getStats().hits,
      cacheMisses: this.cache.getStats().misses,
      networkErrors: this.error ? 1 : 0,
      averageSearchTimeMs:
        this.searchCount > 0
          ? this.totalSearchTime / this.searchCount
          : 0,
      lastSearchTime: this.lastSearchTime,
      lastCacheHitTime: 0,
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * Get movement data
   */
  getMovementData() {
    return this.movementThreshold.getMovementData();
  }

  /**
   * Get scheduler status
   */
  getSchedulerStatus() {
    return {
      isInCooldown: this.scheduler.isInCooldown(),
      remainingCooldown: this.scheduler.getRemainingCooldown(),
      pendingTasks: this.scheduler.getTaskCount(),
      isOnline: this.scheduler.checkNetwork(),
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<DiscoveryConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Apply changes
    if (config.movementThreshold !== undefined) {
      this.movementThreshold.setThreshold(config.movementThreshold);
    }
    if (config.cooldownMs !== undefined) {
      this.scheduler.setCooldown(config.cooldownMs);
    }
    if (config.debounceMs !== undefined) {
      this.scheduler.setDebounce(config.debounceMs);
    }
    if (config.cacheTTLMs !== undefined) {
      this.cache.setTTL(config.cacheTTLMs);
    }
    
    log('Configuration updated');
  }

  /**
   * Set preferred categories
   */
  setPreferredCategories(categories: string[]): void {
    this.ranking.setPreferredCategories(categories);
  }

  /**
   * Set preferred subcategories
   */
  setPreferredSubcategories(subcategories: string[]): void {
    this.ranking.setPreferredSubcategories(subcategories);
  }

  /**
   * Set network status
   */
  setOnline(online: boolean): void {
    this.scheduler.setOnline(online);
    
    if (online && this.stateMachine.isOffline()) {
      this.stateMachine.sendEvent(DiscoveryEventEnum.NETWORK_ONLINE);
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    log('Cache cleared');
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    log('Cleaning up Discovery Engine');
    
    this.scheduler.cleanupAndStop();
    this.cache.clear();
    this.stateMachine.reset();
    
    this.results = [];
    this.error = null;
    this.isInitialized = false;
  }

  /**
   * Check if ready for search
   */
  isReady(): boolean {
    return (
      this.isInitialized &&
      this.currentLocation !== null &&
      !this.stateMachine.isSearching()
    );
  }
}

// Export singleton
export const discoveryEngine = new DiscoveryEngine();

// Export class for testing
export { DiscoveryEngine as DiscoveryEngineClass };
