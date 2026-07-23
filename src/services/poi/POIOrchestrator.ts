/**
 * GUIDY - POI Orchestrator
 * Main orchestrator for POI discovery pipeline
 * 
 * STAGE 4.4: POI Engine Orchestration
 * 
 * This orchestrator connects all POI components into a single pipeline:
 * Location Engine → DiscoveryScheduler → DiscoveryEngine → Repository → Datasource
 *                                     ↓
 *                              POISessionManager → POIStore → UI
 */

import type { POI } from './POITypes';
import { poiStateMachine } from './POIStateMachine';
import { poiSessionManager } from './session';
import { discoveryEngine } from './discovery';
import { MovementMode } from './discovery/DiscoveryTypes';
import { usePOIStore } from './usePOIStore';
import { SessionEventType } from './session/POISessionEvents';
import { POILifecycleState } from './session/POISessionTypes';

// ============================================================================
// LOGGING SYSTEM
// ============================================================================

/**
 * Structured logging categories
 */
const LogCategory = {
  DISCOVERY: '[DISCOVERY]',
  SESSION: '[SESSION]',
  REPOSITORY: '[REPOSITORY]',
  OVERPASS: '[OVERPASS]',
  ORCHESTRATOR: '[ORCHESTRATOR]',
} as const;

/**
 * Debug mode
 */
const DEBUG = true;

/**
 * Structured log function
 */
const log = (category: string, message: string, data?: Record<string, unknown>): void => {
  if (!DEBUG) return;
  
  const timestamp = new Date().toISOString();
  const prefix = `${timestamp} ${category}`;
  
  if (data) {
    console.log(prefix, message, data);
  } else {
    console.log(prefix, message);
  }
};

/**
 * Log discovery events
 */
const logDiscovery = (message: string, data?: Record<string, unknown>): void => {
  log(LogCategory.DISCOVERY, message, data);
};

/**
 * Log session events
 */
const logSession = (message: string, data?: Record<string, unknown>): void => {
  log(LogCategory.SESSION, message, data);
};

// ============================================================================
// ORCHESTRATOR CONFIGURATION
// ============================================================================

/**
 * Orchestrator configuration
 */
export interface POIOrchestratorConfig {
  /** Enable auto-discovery when location updates */
  autoDiscovery: boolean;
  
  /** Minimum distance (meters) to trigger new search */
  movementThreshold: number;
  
  /** Cooldown between searches (ms) */
  cooldownMs: number;
  
  /** Default search radius (meters) */
  defaultRadius: number;
  
  /** Maximum POIs to return */
  maxResults: number;
  
  /** Enable session management */
  sessionEnabled: boolean;
  
  /** Enable store synchronization */
  storeSyncEnabled: boolean;
}

/**
 * Default orchestrator configuration
 */
export const DEFAULT_ORCHESTRATOR_CONFIG: POIOrchestratorConfig = {
  autoDiscovery: true,
  movementThreshold: 50,
  cooldownMs: 20000,
  defaultRadius: 300,
  maxResults: 50,
  sessionEnabled: true,
  storeSyncEnabled: true,
};

// ============================================================================
// ORCHESTRATOR STATE
// ============================================================================

/**
 * Orchestrator state
 */
export enum OrchestratorState {
  IDLE = 'IDLE',
  INITIALIZED = 'INITIALIZED',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  STOPPED = 'STOPPED',
  ERROR = 'ERROR',
}

// ============================================================================
// ORCHESTRATOR CLASS
// ============================================================================

/**
 * POI Orchestrator
 * Main orchestrator that coordinates all POI components
 */
class POIOrchestrator {
  private config: POIOrchestratorConfig;
  private state: OrchestratorState = OrchestratorState.IDLE;
  private isInitialized = false;
  
  // Current location from Location Engine
  private currentLocation: { latitude: number; longitude: number } | null = null;
  private lastDiscoveryLocation: { latitude: number; longitude: number } | null = null;
  
  // Movement tracking
  private totalDistanceMoved = 0;
  private lastLocationTimestamp = 0;
  
  // Subscribers for POI updates
  private poiSubscribers: Array<(pois: POI[]) => void> = [];
  
  // Unsubscribe functions
  private unsubscribeSession: (() => void) | null = null;
  
  // Statistics
  private stats = {
    totalDiscoveries: 0,
    totalPOIsDiscovered: 0,
    lastDiscoveryTime: 0,
    lastDiscoveryDuration: 0,
    cacheHits: 0,
    cacheMisses: 0,
  };

  constructor(config: Partial<POIOrchestratorConfig> = {}) {
    this.config = { ...DEFAULT_ORCHESTRATOR_CONFIG, ...config };
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Initialize the orchestrator
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      log(LogCategory.ORCHESTRATOR, 'Already initialized');
      return;
    }

    log(LogCategory.ORCHESTRATOR, 'Initializing POI Orchestrator...');

    try {
      // Initialize Discovery Engine
      await discoveryEngine.initialize();
      
      // Configure Discovery Engine
      discoveryEngine.updateConfig({
        movementThreshold: this.config.movementThreshold,
        cooldownMs: this.config.cooldownMs,
      });
      
      // Subscribe to Discovery Engine events
      this.subscribeToDiscoveryEngine();
      
      // Subscribe to Session Manager events
      if (this.config.sessionEnabled) {
        this.subscribeToSessionManager();
      }
      
      // Subscribe to POI State Machine events
      this.subscribeToStateMachine();
      
      this.isInitialized = true;
      this.state = OrchestratorState.INITIALIZED;
      
      log(LogCategory.ORCHESTRATOR, 'POI Orchestrator initialized successfully');
      
    } catch (error) {
      this.state = OrchestratorState.ERROR;
      log(LogCategory.ORCHESTRATOR, 'Failed to initialize', { error });
      throw error;
    }
  }

  // ==========================================================================
  // LIFECYCLE METHODS
  // ==========================================================================

  /**
   * Start the orchestrator
   */
  start(): void {
    if (!this.isInitialized) {
      log(LogCategory.ORCHESTRATOR, 'Cannot start - not initialized');
      return;
    }

    log(LogCategory.ORCHESTRATOR, 'Starting POI Orchestrator...');
    
    // Start Discovery Engine
    discoveryEngine.start();
    
    // Start Session Manager if enabled
    if (this.config.sessionEnabled) {
      poiSessionManager.start();
      logSession('Session started', { sessionId: poiSessionManager.getSessionId() });
    }
    
    this.state = OrchestratorState.RUNNING;
    log(LogCategory.ORCHESTRATOR, 'POI Orchestrator started');
  }

  /**
   * Stop the orchestrator
   */
  stop(): void {
    log(LogCategory.ORCHESTRATOR, 'Stopping POI Orchestrator...');
    
    // Stop Discovery Engine
    discoveryEngine.stop();
    
    // Stop Session Manager if enabled
    if (this.config.sessionEnabled) {
      poiSessionManager.stop();
      logSession('Session stopped');
    }
    
    this.state = OrchestratorState.STOPPED;
    log(LogCategory.ORCHESTRATOR, 'POI Orchestrator stopped');
  }

  /**
   * Pause the orchestrator
   */
  pause(): void {
    log(LogCategory.ORCHESTRATOR, 'Pausing POI Orchestrator...');
    
    discoveryEngine.stop();
    
    if (this.config.sessionEnabled) {
      poiSessionManager.pause();
      logSession('Session paused');
    }
    
    this.state = OrchestratorState.PAUSED;
    log(LogCategory.ORCHESTRATOR, 'POI Orchestrator paused');
  }

  /**
   * Resume the orchestrator
   */
  resume(): void {
    log(LogCategory.ORCHESTRATOR, 'Resuming POI Orchestrator...');
    
    discoveryEngine.start();
    
    if (this.config.sessionEnabled) {
      poiSessionManager.resume();
      logSession('Session resumed');
    }
    
    this.state = OrchestratorState.RUNNING;
    log(LogCategory.ORCHESTRATOR, 'POI Orchestrator resumed');
  }

  // ==========================================================================
  // LOCATION UPDATES
  // ==========================================================================

  /**
   * Update current location from Location Engine
   * This is the main entry point for location updates
   */
  updateLocation(latitude: number, longitude: number): void {
    const previousLocation = this.currentLocation;
    this.currentLocation = { latitude, longitude };
    
    // Calculate distance moved
    if (previousLocation) {
      const distance = this.calculateDistance(
        previousLocation.latitude,
        previousLocation.longitude,
        latitude,
        longitude
      );
      
      this.totalDistanceMoved += distance;
      logDiscovery('Movement detected', {
        distance: Math.round(distance),
        totalMoved: Math.round(this.totalDistanceMoved),
        location: { lat: latitude.toFixed(6), lng: longitude.toFixed(6) },
      });
    }
    
    // Update Discovery Engine
    discoveryEngine.updateLocation(latitude, longitude);
    
    // Update POI State Machine
    poiStateMachine.sendEvent({ type: 'LOCATION_UPDATE' } as any);
  }

  /**
   * Set movement mode
   */
  setMovementMode(mode: MovementMode): void {
    logDiscovery(`Movement mode changed to ${mode}`);
    discoveryEngine.setMovementMode(mode);
  }

  // ==========================================================================
  // DISCOVERY TRIGGERING
  // ==========================================================================

  /**
   * Trigger a discovery search
   * Called automatically by Location Engine or manually
   */
  async discoverPOIs(): Promise<POI[]> {
    if (!this.isInitialized || !this.currentLocation) {
      logDiscovery('Cannot discover - not initialized or no location');
      return [];
    }

    const startTime = Date.now();
    logDiscovery('Starting POI discovery', {
      location: this.currentLocation,
      radius: this.config.defaultRadius,
    });

    try {
      // Trigger discovery engine search
      const pois = await discoveryEngine.search();
      
      const duration = Date.now() - startTime;
      this.stats.lastDiscoveryDuration = duration;
      this.stats.totalDiscoveries++;
      this.stats.totalPOIsDiscovered += pois.length;
      this.stats.lastDiscoveryTime = Date.now();
      
      logDiscovery('Discovery completed', {
        poiCount: pois.length,
        durationMs: duration,
        cacheHit: this.stats.cacheHits > 0,
      });

      // Process results through session manager
      if (this.config.sessionEnabled && pois.length > 0) {
        this.processPOIsThroughSession(pois);
      }

      // Sync with store
      if (this.config.storeSyncEnabled) {
        this.syncWithStore(pois);
      }

      // Update last discovery location
      this.lastDiscoveryLocation = { ...this.currentLocation };

      return pois;

    } catch (error) {
      logDiscovery('Discovery failed', { error });
      return [];
    }
  }

  /**
   * Force discovery (bypass cooldown)
   */
  async forceDiscover(): Promise<POI[]> {
    logDiscovery('Force discovery triggered');
    return discoveryEngine.forceSearch();
  }

  // ==========================================================================
  // SESSION MANAGEMENT
  // ==========================================================================

  /**
   * Process POIs through session manager
   */
  private processPOIsThroughSession(pois: POI[]): void {
    logSession('Processing POIs through session', { count: pois.length });
    
    try {
      // Add POIs to session - returns POIWithSession[]
      const addedPOIs = poiSessionManager.addDiscoveredPOIs(pois);
      
      logSession('POIs processed through session', {
        added: addedPOIs.length,
      });

      // Notify subscribers
      const sessionPOIs = poiSessionManager.getAllPOIs();
      this.notifySubscribers(sessionPOIs.map(pws => pws.poi));

    } catch (error) {
      logSession('Error processing POIs through session', { error });
    }
  }

  // ==========================================================================
  // STORE SYNCHRONIZATION
  // ==========================================================================

  /**
   * Sync POIs with Zustand store
   */
  private syncWithStore(pois: POI[]): void {
    log(LogCategory.ORCHESTRATOR, 'Syncing POIs with store', { count: pois.length });
    
    // Get current state from store
    const store = usePOIStore.getState();
    
    // Update POIs
    store.setPOIs(pois);
    
    // Update search center
    if (this.currentLocation) {
      store.setSearchCenter({
        lat: this.currentLocation.latitude,
        lng: this.currentLocation.longitude,
      });
    }
    
    // Update search radius
    store.setSearchRadius(this.config.defaultRadius);
    
    log(LogCategory.ORCHESTRATOR, 'Store synced successfully');
  }

  // ==========================================================================
  // SUBSCRIPTIONS
  // ==========================================================================

  /**
   * Subscribe to Discovery Engine events
   */
  private subscribeToDiscoveryEngine(): void {
    logDiscovery('Subscribed to Discovery Engine events');
  }

  /**
   * Subscribe to Session Manager events
   */
  private subscribeToSessionManager(): void {
    // Subscribe to session events using the subscribe method
    this.unsubscribeSession = poiSessionManager.subscribe((event) => {
      switch (event.type) {
        case SessionEventType.SESSION_STARTED:
          logSession('Session started', { sessionId: event.sessionId });
          break;
        case SessionEventType.SESSION_STOPPED:
          logSession('Session stopped', { sessionId: event.sessionId });
          break;
        case SessionEventType.SESSION_PAUSED:
          logSession('Session paused');
          break;
        case SessionEventType.SESSION_RESUMED:
          logSession('Session resumed');
          break;
        case SessionEventType.POI_DISCOVERED:
          logSession('POI discovered', { poiId: event.poiId });
          break;
        case SessionEventType.POI_SELECTED:
          logSession('POI selected', { poiId: event.poiId });
          break;
        case SessionEventType.POI_VISITED:
          logSession('POI visited', { poiId: event.poiId });
          break;
        case SessionEventType.POIS_DISCOVERED_BATCH:
          logSession('Batch POIs discovered', { count: event.count });
          break;
        case SessionEventType.POIS_UPDATED:
          logSession('POIs updated', { 
            added: event.added?.length || 0,
            expired: event.expired?.length || 0,
          });
          break;
      }
    });

    logSession('Subscribed to Session Manager events');
  }

  /**
   * Subscribe to POI State Machine events
   */
  private subscribeToStateMachine(): void {
    log(LogCategory.ORCHESTRATOR, 'Subscribed to State Machine events');
  }

  /**
   * Subscribe to POI updates
   */
  subscribe(callback: (pois: POI[]) => void): () => void {
    this.poiSubscribers.push(callback);
    
    return () => {
      this.poiSubscribers = this.poiSubscribers.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify all subscribers of POI updates
   */
  private notifySubscribers(pois: POI[]): void {
    this.poiSubscribers.forEach(callback => {
      try {
        callback(pois);
      } catch (error) {
        log(LogCategory.ORCHESTRATOR, 'Error in subscriber callback', { error });
      }
    });
  }

  // ==========================================================================
  // GETTERS
  // ==========================================================================

  /**
   * Get current state
   */
  getState(): OrchestratorState {
    return this.state;
  }

  /**
   * Get current POIs
   */
  getPOIs(): POI[] {
    if (this.config.sessionEnabled) {
      return poiSessionManager.getAllPOIs().map(pws => pws.poi);
    }
    return discoveryEngine.getResults();
  }

  /**
   * Get discovered POIs from session
   */
  getDiscoveredPOIs(): POI[] {
    if (!this.config.sessionEnabled) return [];
    // Get POIs that are in DISCOVERED or NEW state
    return poiSessionManager.getAllPOIs()
      .filter(pws => 
        pws.lifecycleState === POILifecycleState.DISCOVERED || 
        pws.lifecycleState === POILifecycleState.NEW
      )
      .map(pws => pws.poi);
  }

  /**
   * Get active POIs from session
   */
  getActivePOIs(): POI[] {
    if (!this.config.sessionEnabled) return [];
    return poiSessionManager.getActivePOIs().map(pws => pws.poi);
  }

  /**
   * Get visited POIs from session
   */
  getVisitedPOIs(): POI[] {
    if (!this.config.sessionEnabled) return [];
    return poiSessionManager.getVisitedPOIs().map(pws => pws.poi);
  }

  /**
   * Get session statistics
   */
  getSessionStats() {
    if (!this.config.sessionEnabled) return null;
    return poiSessionManager.getStats();
  }

  /**
   * Get orchestrator statistics
   */
  getStats() {
    return {
      ...this.stats,
      orchestratorState: this.state,
      discoveryEngineState: discoveryEngine.getState(),
      movementData: discoveryEngine.getMovementData(),
      schedulerStatus: discoveryEngine.getSchedulerStatus(),
    };
  }

  /**
   * Check if orchestrator is running
   */
  isRunning(): boolean {
    return this.state === OrchestratorState.RUNNING;
  }

  /**
   * Check if ready for discovery
   */
  isReady(): boolean {
    return this.isInitialized && this.currentLocation !== null;
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Cleanup and release resources
   */
  async cleanup(): Promise<void> {
    log(LogCategory.ORCHESTRATOR, 'Cleaning up POI Orchestrator...');

    // Unsubscribe from session events
    if (this.unsubscribeSession) {
      this.unsubscribeSession();
    }

    // Stop discovery engine
    await discoveryEngine.cleanup();
    
    // Cleanup session manager
    if (this.config.sessionEnabled) {
      poiSessionManager.stop();
    }

    // Clear subscribers
    this.poiSubscribers = [];

    this.isInitialized = false;
    this.state = OrchestratorState.IDLE;
    this.currentLocation = null;
    
    log(LogCategory.ORCHESTRATOR, 'POI Orchestrator cleaned up');
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const poiOrchestrator = new POIOrchestrator();

// ============================================================================
// EXPORTS
// ============================================================================

export { POIOrchestrator };
export default poiOrchestrator;
