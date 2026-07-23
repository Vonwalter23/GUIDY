/**
 * GUIDY - POI State Machine
 * Single source of truth for POI Engine state
 * 
 * STAGE 4.0: POI Engine Architecture
 * 
 * State transitions:
 * 
 * IDLE ──(SEARCH)──> SEARCHING ──(RESULTS)──> READY
 *                                    │
 *                                    └──(ERROR)──> ERROR ──(RETRY)──> SEARCHING
 *                                                      │
 *                                                      └──(RESET)──> IDLE
 * 
 * READY ──(FILTER)──> FILTERING ──(RESULTS)──> READY
 * 
 * READY ──(SELECT)──> SELECTED ──(DESELECT)──> READY
 * 
 * SELECTED ──(START_NARRATION)──> NARRATING ──(END_NARRATION)──> SELECTED
 * 
 * READY/SELECTED ──(MARK_VISITED)──> VISITED ──(SEARCH)──> READY
 * 
 * READY/SELECTED ──(CACHE)──> CACHED ──(SEARCH)──> READY
 */

import type { POI, POIError, POIFilterCriteria } from './POITypes';
import { POIState, POIEvent } from './POITypes';

/**
 * Debug logging
 */
const DEBUG_POI_STATE = true;

const getTimestamp = (): string => new Date().toISOString();

const logState = (message: string, ...data: unknown[]): void => {
  if (DEBUG_POI_STATE) {
    console.log(`[POI STATE ${getTimestamp()}] ${message}`, ...data);
  }
};

/**
 * State transition definition
 */
interface StateTransition {
  from: POIState;
  event: POIEvent;
  to: POIState;
  action?: () => void;
}

/**
 * Complete state machine transitions
 */
const STATE_TRANSITIONS: StateTransition[] = [
  // From IDLE
  { from: POIState.IDLE, event: POIEvent.SEARCH, to: POIState.SEARCHING },
  
  // From SEARCHING
  { from: POIState.SEARCHING, event: POIEvent.LOAD_MORE, to: POIState.LOADING },
  { from: POIState.SEARCHING, event: POIEvent.ERROR, to: POIState.ERROR },
  
  // From LOADING
  { from: POIState.LOADING, event: POIEvent.SEARCH, to: POIState.LOADING },
  { from: POIState.LOADING, event: POIEvent.ERROR, to: POIState.ERROR },
  
  // From READY
  { from: POIState.READY, event: POIEvent.SEARCH, to: POIState.SEARCHING },
  { from: POIState.READY, event: POIEvent.FILTER, to: POIState.FILTERING },
  { from: POIState.READY, event: POIEvent.SELECT, to: POIState.SELECTED },
  { from: POIState.READY, event: POIEvent.LOAD_MORE, to: POIState.LOADING },
  { from: POIState.READY, event: POIEvent.MARK_VISITED, to: POIState.VISITED },
  { from: POIState.READY, event: POIEvent.CACHE, to: POIState.CACHED },
  
  // From FILTERING
  { from: POIState.FILTERING, event: POIEvent.FILTER, to: POIState.FILTERING },
  { from: POIState.FILTERING, event: POIEvent.ERROR, to: POIState.ERROR },
  
  // From SELECTED
  { from: POIState.SELECTED, event: POIEvent.DESELECT, to: POIState.READY },
  { from: POIState.SELECTED, event: POIEvent.SEARCH, to: POIState.SEARCHING },
  { from: POIState.SELECTED, event: POIEvent.START_NARRATION, to: POIState.NARRATING },
  { from: POIState.SELECTED, event: POIEvent.MARK_VISITED, to: POIState.VISITED },
  
  // From NARRATING
  { from: POIState.NARRATING, event: POIEvent.END_NARRATION, to: POIState.SELECTED },
  { from: POIState.NARRATING, event: POIEvent.DESELECT, to: POIState.READY },
  
  // From VISITED
  { from: POIState.VISITED, event: POIEvent.SEARCH, to: POIState.READY },
  { from: POIState.VISITED, event: POIEvent.SELECT, to: POIState.SELECTED },
  
  // From CACHED
  { from: POIState.CACHED, event: POIEvent.SEARCH, to: POIState.READY },
  
  // From ERROR
  { from: POIState.ERROR, event: POIEvent.RETRY, to: POIState.SEARCHING },
  { from: POIState.ERROR, event: POIEvent.RESET, to: POIState.IDLE },
  { from: POIState.ERROR, event: POIEvent.SEARCH, to: POIState.SEARCHING },
];

/**
 * POI State Machine
 * Single source of truth for all POI engine state
 */
export class POIStateMachine {
  private state: POIState = POIState.IDLE;
  private previousState: POIState = POIState.IDLE;
  
  // POI data
  private pois: POI[] = [];
  private filteredPOIs: POI[] = [];
  private selectedPOI: POI | null = null;
  
  // Search state
  private searchCenter: { lat: number; lng: number } | null = null;
  private searchRadius: number = 0;
  private currentFilter: POIFilterCriteria | null = null;
  
  // Error state
  private error: POIError | null = null;
  
  // Stats
  private loadingMore: boolean = false;
  
  // Listeners
  private stateListeners: Set<(state: POIState, prevState: POIState) => void> = new Set();
  private poiListeners: Set<(pois: POI[]) => void> = new Set();
  private selectedListeners: Set<(poi: POI | null) => void> = new Set();
  private errorListeners: Set<(error: POIError | null) => void> = new Set();
  
  constructor() {
    logState(`[INIT] POI State Machine initialized in ${this.state}`);
  }
  
  /**
   * Get current state
   */
  getState(): POIState {
    return this.state;
  }
  
  /**
   * Get previous state
   */
  getPreviousState(): POIState {
    return this.previousState;
  }
  
  /**
   * Get all POIs
   */
  getPOIs(): POI[] {
    return this.pois;
  }
  
  /**
   * Get filtered POIs
   */
  getFilteredPOIs(): POI[] {
    return this.filteredPOIs;
  }
  
  /**
   * Get selected POI
   */
  getSelectedPOI(): POI | null {
    return this.selectedPOI;
  }
  
  /**
   * Get current error
   */
  getError(): POIError | null {
    return this.error;
  }
  
  /**
   * Check if loading more
   */
  isLoadingMore(): boolean {
    return this.loadingMore;
  }
  
  /**
   * Check if in a terminal state
   */
  isTerminalState(): boolean {
    return this.state === POIState.READY || 
           this.state === POIState.ERROR ||
           this.state === POIState.IDLE;
  }
  
  /**
   * Send event to state machine
   */
  sendEvent(event: POIEvent, data?: unknown): boolean {
    const transition = STATE_TRANSITIONS.find(
      t => t.from === this.state && t.event === event
    );
    
    if (!transition) {
      logState(`[IGNORED] Event ${event} from ${this.state} - no valid transition`);
      return false;
    }
    
    logState(`[TRANSITION] ${this.state} --(${event})--> ${transition.to}`);
    
    this.previousState = this.state;
    this.state = transition.to;
    
    // Execute transition action if defined
    if (transition.action) {
      transition.action();
    }
    
    // Handle data based on event
    this.handleEventData(event, data);
    
    // Notify state listeners
    this.notifyStateChange();
    
    return true;
  }
  
  /**
   * Handle event data
   */
  private handleEventData(event: POIEvent, data?: unknown): void {
    switch (event) {
      case POIEvent.SEARCH:
        this.handleSearchResult(data as { pois: POI[]; center: { lat: number; lng: number }; radius: number });
        break;
        
      case POIEvent.LOAD_MORE:
        this.handleLoadMore(data as { pois: POI[] });
        break;
        
      case POIEvent.FILTER:
        this.handleFilterResult(data as { pois: POI[]; filter: POIFilterCriteria });
        break;
        
      case POIEvent.SELECT:
        this.handleSelect(data as POI);
        break;
        
      case POIEvent.DESELECT:
        this.handleDeselect();
        break;
        
      case POIEvent.ERROR:
        this.handleError(data as POIError);
        break;
        
      case POIEvent.RESET:
        this.handleReset();
        break;
        
      case POIEvent.MARK_VISITED:
        this.handleMarkVisited(data as string); // POI ID
        break;
        
      case POIEvent.START_NARRATION:
      case POIEvent.END_NARRATION:
      case POIEvent.CACHE:
      case POIEvent.CLEAR_CACHE:
        // No specific data handling needed
        break;
    }
  }
  
  /**
   * Handle search result
   */
  private handleSearchResult(result: { pois: POI[]; center: { lat: number; lng: number }; radius: number }): void {
    this.pois = result.pois;
    this.filteredPOIs = result.pois;
    this.searchCenter = result.center;
    this.searchRadius = result.radius;
    this.error = null;
    this.loadingMore = false;
    
    this.notifyPOIUpdate();
  }
  
  /**
   * Handle load more result
   */
  private handleLoadMore(result: { pois: POI[] }): void {
    this.pois = [...this.pois, ...result.pois];
    this.filteredPOIs = [...this.filteredPOIs, ...result.pois];
    this.loadingMore = false;
    
    this.notifyPOIUpdate();
  }
  
  /**
   * Handle filter result
   */
  private handleFilterResult(result: { pois: POI[]; filter: POIFilterCriteria }): void {
    this.filteredPOIs = result.pois;
    this.currentFilter = result.filter;
    
    this.notifyPOIUpdate();
  }
  
  /**
   * Handle POI selection
   */
  private handleSelect(poi: POI): void {
    this.selectedPOI = poi;
    this.notifySelectedChange();
  }
  
  /**
   * Handle POI deselection
   */
  private handleDeselect(): void {
    this.selectedPOI = null;
    this.notifySelectedChange();
  }
  
  /**
   * Handle error
   */
  private handleError(error: POIError): void {
    this.error = error;
    this.notifyErrorChange();
  }
  
  /**
   * Handle reset
   */
  private handleReset(): void {
    this.pois = [];
    this.filteredPOIs = [];
    this.selectedPOI = null;
    this.error = null;
    this.loadingMore = false;
    this.searchCenter = null;
    this.searchRadius = 0;
    this.currentFilter = null;
    
    this.notifyStateChange();
    this.notifyPOIUpdate();
    this.notifySelectedChange();
    this.notifyErrorChange();
  }
  
  /**
   * Handle mark visited
   */
  private handleMarkVisited(poiId: string): void {
    const updatePOI = (pois: POI[]): POI[] => {
      return pois.map(poi => {
        if (poi.id === poiId) {
          return { ...poi, visited: true, visitedAt: Date.now() };
        }
        return poi;
      });
    };
    
    this.pois = updatePOI(this.pois);
    this.filteredPOIs = updatePOI(this.filteredPOIs);
    
    if (this.selectedPOI?.id === poiId) {
      this.selectedPOI = { ...this.selectedPOI, visited: true, visitedAt: Date.now() };
      this.notifySelectedChange();
    }
    
    this.notifyPOIUpdate();
  }
  
  /**
   * Notify state listeners
   */
  private notifyStateChange(): void {
    this.stateListeners.forEach(listener => {
      try {
        listener(this.state, this.previousState);
      } catch (err) {
        logState(`[ERROR] State listener error:`, err);
      }
    });
  }
  
  /**
   * Notify POI listeners
   */
  private notifyPOIUpdate(): void {
    this.poiListeners.forEach(listener => {
      try {
        listener(this.filteredPOIs);
      } catch (err) {
        logState(`[ERROR] POI listener error:`, err);
      }
    });
  }
  
  /**
   * Notify selected POI listeners
   */
  private notifySelectedChange(): void {
    this.selectedListeners.forEach(listener => {
      try {
        listener(this.selectedPOI);
      } catch (err) {
        logState(`[ERROR] Selected listener error:`, err);
      }
    });
  }
  
  /**
   * Notify error listeners
   */
  private notifyErrorChange(): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(this.error);
      } catch (err) {
        logState(`[ERROR] Error listener error:`, err);
      }
    });
  }
  
  /**
   * Subscribe to state changes
   */
  onStateChange(callback: (state: POIState, prevState: POIState) => void): () => void {
    this.stateListeners.add(callback);
    return () => this.stateListeners.delete(callback);
  }
  
  /**
   * Subscribe to POI updates
   */
  onPOIUpdate(callback: (pois: POI[]) => void): () => void {
    this.poiListeners.add(callback);
    return () => this.poiListeners.delete(callback);
  }
  
  /**
   * Subscribe to selected POI changes
   */
  onSelectedChange(callback: (poi: POI | null) => void): () => void {
    this.selectedListeners.add(callback);
    return () => this.selectedListeners.delete(callback);
  }
  
  /**
   * Subscribe to error changes
   */
  onErrorChange(callback: (error: POIError | null) => void): () => void {
    this.errorListeners.add(callback);
    return () => this.errorListeners.delete(callback);
  }
  
  /**
   * Get debug info
   */
  getDebugInfo(): {
    state: POIState;
    previousState: POIState;
    poiCount: number;
    filteredCount: number;
    hasSelected: boolean;
    hasError: boolean;
    stateListenerCount: number;
    poiListenerCount: number;
  } {
    return {
      state: this.state,
      previousState: this.previousState,
      poiCount: this.pois.length,
      filteredCount: this.filteredPOIs.length,
      hasSelected: this.selectedPOI !== null,
      hasError: this.error !== null,
      stateListenerCount: this.stateListeners.size,
      poiListenerCount: this.poiListeners.size,
    };
  }
}

// Export singleton instance
export const poiStateMachine = new POIStateMachine();

export default poiStateMachine;
