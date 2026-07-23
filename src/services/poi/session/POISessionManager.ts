/**
 * GUIDY - POI Session Manager
 * Main orchestrator for POI session lifecycle
 * 
 * STAGE 4.3: POI Session Manager
 */

import type { POI } from '../POITypes';
import type {
  POIWithSession,
  POISessionConfig,
  POISessionStats,
  POISessionUpdateResult,
  POIGroup,
} from './POISessionTypes';
import {
  POISessionState,
  POISessionEvent,
  POILifecycleEvent,
  DEFAULT_SESSION_CONFIG,
} from './POISessionTypes';
import { POIObserverManager, poiObserverManager } from './POIObservers';
import { SessionEventType } from './POISessionEvents';
import { POISessionStateMachine } from './POISessionStateMachine';
import { POILifecycleManager } from './POILifecycle';
import { POISelectionManager, SelectionReason } from './POISelection';
import { POISessionStore } from './POISessionStore';

/**
 * Debug logging
 */
function log(...args: unknown[]): void {
  if (__DEV__) {
    console.log('[POISessionManager]', ...args);
  }
}

/**
 * POI Session Manager
 * Manages the complete lifecycle of POIs within a session
 */
export class POISessionManager {
  private sessionId: string = '';
  private sessionStartTime: number = 0;
  private stateMachine: POISessionStateMachine;
  private lifecycleManager: POILifecycleManager;
  private selectionManager: POISelectionManager;
  private store: POISessionStore;
  private observers: POIObserverManager;
  private config: POISessionConfig;
  private userLatitude: number = 0;
  private userLongitude: number = 0;

  constructor(
    observers?: POIObserverManager,
    config?: Partial<POISessionConfig>
  ) {
    this.observers = observers ?? poiObserverManager;
    this.config = { ...DEFAULT_SESSION_CONFIG, ...config };
    
    // Initialize managers
    this.lifecycleManager = new POILifecycleManager(this.observers);
    this.selectionManager = new POISelectionManager(this.observers);
    this.store = new POISessionStore(this.config, this.lifecycleManager);
    this.stateMachine = new POISessionStateMachine(this.observers);
    
    // Set up lifecycle manager with session ID
    this.lifecycleManager.setSessionId(this.sessionId);
  }

  /**
   * Initialize session
   */
  async initialize(): Promise<void> {
    log('Initializing POI Session Manager');
    this.stateMachine.reset();
    this.store.clear();
    this.selectionManager.reset();
    this.observers.clearHistory();
  }

  /**
   * Start a new session
   */
  start(): boolean {
    if (this.stateMachine.getState() !== POISessionState.IDLE) {
      log('Session already started or in progress');
      return false;
    }

    // Generate session ID
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.sessionStartTime = Date.now();
    
    // Set session ID on managers
    this.stateMachine.setSessionId(this.sessionId);
    this.lifecycleManager.setSessionId(this.sessionId);
    
    // Transition state machine
    this.stateMachine.sendEvent(POISessionEvent.START);
    this.stateMachine.sendEvent(POISessionEvent.UPDATE);

    // Emit session started event
    this.observers.emit({
      type: SessionEventType.SESSION_STARTED,
      sessionId: this.sessionId,
      timestamp: Date.now(),
    });

    log(`Session started: ${this.sessionId}`);
    return true;
  }

  /**
   * Stop session
   */
  stop(): boolean {
    const state = this.stateMachine.getState();
    if (state === POISessionState.IDLE || state === POISessionState.FINISHED) {
      return false;
    }

    // Clear all data
    this.store.clear();
    this.selectionManager.clear();
    
    // Transition state machine
    this.stateMachine.sendEvent(POISessionEvent.STOP);

    // Emit session stopped event
    this.observers.emit({
      type: SessionEventType.SESSION_STOPPED,
      sessionId: this.sessionId,
      duration: Date.now() - this.sessionStartTime,
      timestamp: Date.now(),
    });

    log(`Session stopped: ${this.sessionId}`);
    return true;
  }

  /**
   * Pause session
   */
  pause(): boolean {
    if (!this.stateMachine.isRunning()) {
      return false;
    }

    const success = this.stateMachine.sendEvent(POISessionEvent.PAUSE);
    
    if (success) {
      this.observers.emit({
        type: SessionEventType.SESSION_PAUSED,
        sessionId: this.sessionId,
        timestamp: Date.now(),
      });
    }

    return success;
  }

  /**
   * Resume session
   */
  resume(): boolean {
    if (!this.stateMachine.isPaused()) {
      return false;
    }

    const success = this.stateMachine.sendEvent(POISessionEvent.RESUME);
    
    if (success) {
      this.observers.emit({
        type: SessionEventType.SESSION_RESUMED,
        sessionId: this.sessionId,
        timestamp: Date.now(),
      });
    }

    return success;
  }

  /**
   * Reset session
   */
  reset(): void {
    this.stateMachine.reset();
    this.store.clear();
    this.selectionManager.reset();
    this.sessionId = '';
    this.sessionStartTime = 0;
    log('Session reset');
  }

  /**
   * Update user location
   */
  updateUserLocation(latitude: number, longitude: number): void {
    this.userLatitude = latitude;
    this.userLongitude = longitude;
  }

  /**
   * Add discovered POIs from Discovery Engine
   */
  addDiscoveredPOIs(pois: POI[]): POIWithSession[] {
    const added: POIWithSession[] = [];

    for (const poi of pois) {
      // Check for duplicates
      const duplicate = this.store.isDuplicate(
        poi.latitude,
        poi.longitude,
        poi.name
      );

      if (duplicate) {
        log(`Duplicate POI found: ${poi.name} (${poi.id})`);
        continue;
      }

      // Create POI with session metadata
      const poiWithSession = this.lifecycleManager.createPOIWithSession(poi);
      
      // Transition to DISCOVERED
      const discovered = this.lifecycleManager.transition(
        poiWithSession,
        POILifecycleEvent.DISCOVER
      );

      if (discovered) {
        this.store.add(discovered);
        added.push(discovered);
        
        // Check if should be activated
        if (this.shouldBeActivated(discovered)) {
          this.activatePOI(discovered.poi.id);
        }
      }
    }

    if (added.length > 0) {
      this.stateMachine.sendEvent(POISessionEvent.UPDATE);
      
      // Emit batch event
      this.observers.emit({
        type: SessionEventType.POIS_DISCOVERED_BATCH,
        pois: added,
        count: added.length,
        timestamp: Date.now(),
      });
    }

    return added;
  }

  /**
   * Update POIs with latest from Discovery Engine
   */
  updatePOIs(discoveredPOIs: POI[]): POISessionUpdateResult {
    // Mark current active POIs as potentially expired
    const currentActive = this.store.getActive();
    const incomingIds = new Set(discoveredPOIs.map(p => p.id));

    const result: POISessionUpdateResult = {
      added: [],
      updated: [],
      removed: [],
      expired: [],
      archived: [],
      totalActive: 0,
      totalVisited: 0,
    };

    // Update state machine
    this.stateMachine.sendEvent(POISessionEvent.UPDATE);

    // Expire POIs that are no longer in the results
    for (const activePOI of currentActive) {
      if (!incomingIds.has(activePOI.poi.id)) {
        // POI not in new results - expire it
        this.expirePOI(activePOI.poi.id);
        result.expired.push(activePOI.poi.id);
      }
    }

    // Add or update new POIs
    const newPOIs = this.addDiscoveredPOIs(discoveredPOIs);
    result.added = newPOIs;

    // Update stats
    result.totalActive = this.store.getActiveCount();
    result.totalVisited = this.store.getVisitedCount();

    // Emit update event
    this.observers.emit({
      type: SessionEventType.POIS_UPDATED,
      added: result.added,
      updated: result.updated,
      removed: result.removed,
      expired: result.expired,
      archived: result.archived,
      timestamp: Date.now(),
    });

    return result;
  }

  /**
   * Check if POI should be activated
   */
  private shouldBeActivated(poiWithSession: POIWithSession): boolean {
    // Already visited POIs should not be reactivated
    if (this.store.isVisited(poiWithSession.poi.id)) {
      return false;
    }

    // Already active POIs should not be reactivated
    if (this.store.isActive(poiWithSession.poi.id)) {
      return false;
    }

    return true;
  }

  /**
   * Activate POI
   */
  activatePOI(poiId: string): boolean {
    const poi = this.store.get(poiId);
    if (!poi) return false;

    const activated = this.lifecycleManager.transition(
      poi,
      POILifecycleEvent.ACTIVATE
    );

    if (activated) {
      this.store.update(activated);
      return true;
    }

    return false;
  }

  /**
   * Select POI
   */
  selectPOI(poiId: string, reason: SelectionReason = SelectionReason.USER_TAP): boolean {
    const poi = this.store.get(poiId);
    if (!poi) {
      log(`POI not found: ${poiId}`);
      return false;
    }

    // Must be active to select
    if (!this.store.isActive(poiId)) {
      log(`POI not active: ${poiId}`);
      return false;
    }

    // Cannot select visited POIs
    if (this.store.isVisited(poiId)) {
      log(`POI already visited: ${poiId}`);
      return false;
    }

    // Deselect previous
    const selectedPoi = this.store.getSelected();
    if (selectedPoi) {
      this.lifecycleManager.transition(selectedPoi, POILifecycleEvent.DESELECT);
      this.store.update(selectedPoi);
    }

    // Select new
    const updatedPoi = this.selectionManager.select(poi, reason);
    if (updatedPoi) {
      const selected = this.lifecycleManager.transition(
        updatedPoi,
        POILifecycleEvent.SELECT
      );

      if (selected) {
        this.store.update(selected);
        return true;
      }
    }

    return false;
  }

  /**
   * Deselect current POI
   */
  deselectPOI(): boolean {
    const selectedPoi = this.store.getSelected();
    if (!selectedPoi) return false;

    const deselected = this.lifecycleManager.transition(
      selectedPoi,
      POILifecycleEvent.DESELECT
    );

    if (deselected) {
      this.store.update(deselected);
      this.selectionManager.deselect();
      return true;
    }

    return false;
  }

  /**
   * Mark POI as visited
   */
  visitPOI(poiId: string): boolean {
    const poi = this.store.get(poiId);
    if (!poi) return false;

    // Can only visit active or selected POIs
    if (!this.store.isActive(poiId)) {
      log(`POI not active: ${poiId}`);
      return false;
    }

    // Cannot visit already visited POIs
    if (this.store.isVisited(poiId)) {
      log(`POI already visited: ${poiId}`);
      return false;
    }

    const visited = this.lifecycleManager.transition(poi, POILifecycleEvent.VISIT);

    if (visited) {
      this.store.update(visited);

      // Auto-archive if configured
      if (this.config.autoArchiveVisited) {
        this.archivePOI(poiId);
      }

      // Deselect if selected
      if (this.selectionManager.isSelected(poiId)) {
        this.deselectPOI();
      }

      return true;
    }

    return false;
  }

  /**
   * Expire POI
   */
  private expirePOI(poiId: string): boolean {
    const poi = this.store.get(poiId);
    if (!poi) return false;

    const expired = this.lifecycleManager.transition(poi, POILifecycleEvent.EXPIRE);

    if (expired) {
      this.store.update(expired);
      return true;
    }

    return false;
  }

  /**
   * Archive POI
   */
  private archivePOI(poiId: string): boolean {
    const poi = this.store.get(poiId);
    if (!poi) return false;

    const archived = this.lifecycleManager.transition(poi, POILifecycleEvent.ARCHIVE);

    if (archived) {
      this.store.update(archived);
      return true;
    }

    return false;
  }

  /**
   * Get selected POI
   */
  getSelectedPOI(): POIWithSession | undefined {
    return this.store.getSelected();
  }

  /**
   * Get active POIs
   */
  getActivePOIs(): POIWithSession[] {
    return this.store.getActive();
  }

  /**
   * Get visited POIs
   */
  getVisitedPOIs(): POIWithSession[] {
    return this.store.getVisited();
  }

  /**
   * Get all POIs
   */
  getAllPOIs(): POIWithSession[] {
    return this.store.getAll();
  }

  /**
   * Get POI groups
   */
  getPOIGroups(): POIGroup {
    return this.store.getGroups();
  }

  /**
   * Get POI by ID
   */
  getPOI(poiId: string): POIWithSession | undefined {
    return this.store.get(poiId);
  }

  /**
   * Get session state
   */
  getSessionState(): POISessionState {
    return this.stateMachine.getState();
  }

  /**
   * Check if session is active
   */
  isSessionActive(): boolean {
    return this.stateMachine.isActive();
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Get session stats
   */
  getStats(): POISessionStats {
    return this.store.getStats(this.sessionId, this.sessionStartTime);
  }

  /**
   * Get session duration
   */
  getSessionDuration(): number {
    return Date.now() - this.sessionStartTime;
  }

  /**
   * Set configuration
   */
  setConfig(config: Partial<POISessionConfig>): void {
    this.config = { ...this.config, ...config };
    this.store.setConfig(this.config);
  }

  /**
   * Get configuration
   */
  getConfig(): POISessionConfig {
    return { ...this.config };
  }

  /**
   * Subscribe to session events
   */
  subscribe(
    listener: (event: any) => void,
    options?: { eventTypes?: SessionEventType[] }
  ): () => void {
    return this.observers.subscribe(listener, options);
  }

  /**
   * Get event history
   */
  getEventHistory(): any[] {
    return this.observers.getHistory();
  }
}

/**
 * Singleton instance
 */
export const poiSessionManager = new POISessionManager();
