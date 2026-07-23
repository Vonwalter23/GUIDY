/**
 * GUIDY - Discovery State Machine
 * State machine for POI Discovery Engine
 * 
 * STAGE 4.2: POI Discovery Engine
 */

import { DiscoveryState, DiscoveryEvent } from './DiscoveryTypes';

/**
 * State transition
 */
interface StateTransition {
  from: DiscoveryState;
  to: DiscoveryState;
  event: DiscoveryEvent;
}

/**
 * Valid state transitions
 */
const STATE_TRANSITIONS: StateTransition[] = [
  // From IDLE
  { from: DiscoveryState.IDLE, to: DiscoveryState.WAITING_MOVEMENT, event: DiscoveryEvent.START },
  
  // From WAITING_MOVEMENT
  { from: DiscoveryState.WAITING_MOVEMENT, to: DiscoveryState.WAITING_COOLDOWN, event: DiscoveryEvent.MOVEMENT_THRESHOLD_EXCEEDED },
  { from: DiscoveryState.WAITING_MOVEMENT, to: DiscoveryState.IDLE, event: DiscoveryEvent.STOP },
  
  // From WAITING_COOLDOWN
  { from: DiscoveryState.WAITING_COOLDOWN, to: DiscoveryState.SEARCHING, event: DiscoveryEvent.COOLDOWN_COMPLETE },
  { from: DiscoveryState.WAITING_COOLDOWN, to: DiscoveryState.IDLE, event: DiscoveryEvent.STOP },
  { from: DiscoveryState.WAITING_COOLDOWN, to: DiscoveryState.ERROR, event: DiscoveryEvent.ERROR },
  
  // From SEARCHING
  { from: DiscoveryState.SEARCHING, to: DiscoveryState.USING_CACHE, event: DiscoveryEvent.CACHE_HIT },
  { from: DiscoveryState.SEARCHING, to: DiscoveryState.RESULTS_READY, event: DiscoveryEvent.SEARCH_COMPLETE },
  { from: DiscoveryState.SEARCHING, to: DiscoveryState.ERROR, event: DiscoveryEvent.ERROR },
  { from: DiscoveryState.SEARCHING, to: DiscoveryState.OFFLINE, event: DiscoveryEvent.NETWORK_OFFLINE },
  
  // From USING_CACHE
  { from: DiscoveryState.USING_CACHE, to: DiscoveryState.RESULTS_READY, event: DiscoveryEvent.SEARCH_COMPLETE },
  { from: DiscoveryState.USING_CACHE, to: DiscoveryState.SEARCHING, event: DiscoveryEvent.CACHE_MISS },
  
  // From RESULTS_READY
  { from: DiscoveryState.RESULTS_READY, to: DiscoveryState.WAITING_MOVEMENT, event: DiscoveryEvent.START },
  { from: DiscoveryState.RESULTS_READY, to: DiscoveryState.IDLE, event: DiscoveryEvent.STOP },
  { from: DiscoveryState.RESULTS_READY, to: DiscoveryState.WAITING_MOVEMENT, event: DiscoveryEvent.LOCATION_UPDATE },
  
  // From ERROR
  { from: DiscoveryState.ERROR, to: DiscoveryState.SEARCHING, event: DiscoveryEvent.RETRY },
  { from: DiscoveryState.ERROR, to: DiscoveryState.IDLE, event: DiscoveryEvent.STOP },
  { from: DiscoveryState.ERROR, to: DiscoveryState.OFFLINE, event: DiscoveryEvent.NETWORK_OFFLINE },
  
  // From OFFLINE
  { from: DiscoveryState.OFFLINE, to: DiscoveryState.WAITING_MOVEMENT, event: DiscoveryEvent.NETWORK_ONLINE },
  { from: DiscoveryState.OFFLINE, to: DiscoveryState.USING_CACHE, event: DiscoveryEvent.CACHE_HIT },
  { from: DiscoveryState.OFFLINE, to: DiscoveryState.IDLE, event: DiscoveryEvent.STOP },
];

/**
 * Listener type
 */
type DiscoveryListener = (state: DiscoveryState, event?: DiscoveryEvent) => void;

/**
 * Discovery State Machine
 * Manages state transitions for the discovery engine
 */
export class DiscoveryStateMachine {
  private state: DiscoveryState = DiscoveryState.IDLE;
  private listeners: Set<DiscoveryListener> = new Set();
  private stateHistory: Array<{ state: DiscoveryState; timestamp: number }> = [];

  constructor() {
    this.recordState();
  }

  /**
   * Get current state
   */
  getState(): DiscoveryState {
    return this.state;
  }

  /**
   * Send event to transition state
   */
  sendEvent(event: DiscoveryEvent): boolean {
    const transition = this.findTransition(this.state, event);
    
    if (!transition) {
      console.warn(
        `[DISCOVERY SM] Invalid transition: ${this.state} + ${event}`
      );
      return false;
    }

    const previousState = this.state;
    this.state = transition.to;
    this.recordState();

    console.log(
      `[DISCOVERY SM] ${previousState} --(${event})--> ${this.state}`
    );

    this.notify(transition.event);
    return true;
  }

  /**
   * Find valid transition
   */
  private findTransition(
    from: DiscoveryState,
    event: DiscoveryEvent
  ): StateTransition | null {
    return STATE_TRANSITIONS.find(
      t => t.from === from && t.event === event
    ) || null;
  }

  /**
   * Check if transition is valid
   */
  canTransition(event: DiscoveryEvent): boolean {
    return this.findTransition(this.state, event) !== null;
  }

  /**
   * Get valid events for current state
   */
  getValidEvents(): DiscoveryEvent[] {
    return STATE_TRANSITIONS
      .filter(t => t.from === this.state)
      .map(t => t.event);
  }

  /**
   * Add listener
   */
  addListener(listener: DiscoveryListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify listeners
   */
  private notify(event?: DiscoveryEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(this.state, event);
      } catch (error) {
        console.error('[DISCOVERY SM] Listener error:', error);
      }
    }
  }

  /**
   * Record state in history
   */
  private recordState(): void {
    this.stateHistory.push({
      state: this.state,
      timestamp: Date.now(),
    });

    // Keep only last 100 entries
    if (this.stateHistory.length > 100) {
      this.stateHistory.shift();
    }
  }

  /**
   * Get state history
   */
  getHistory(): Array<{ state: DiscoveryState; timestamp: number }> {
    return [...this.stateHistory];
  }

  /**
   * Get time in current state
   */
  getTimeInState(): number {
    if (this.stateHistory.length === 0) {
      return 0;
    }
    return Date.now() - this.stateHistory[this.stateHistory.length - 1].timestamp;
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.state = DiscoveryState.IDLE;
    this.stateHistory = [];
    this.recordState();
    this.notify();
  }

  /**
   * Check if idle
   */
  isIdle(): boolean {
    return this.state === DiscoveryState.IDLE;
  }

  /**
   * Check if searching
   */
  isSearching(): boolean {
    return this.state === DiscoveryState.SEARCHING;
  }

  /**
   * Check if has results
   */
  hasResults(): boolean {
    return this.state === DiscoveryState.RESULTS_READY;
  }

  /**
   * Check if error
   */
  hasError(): boolean {
    return this.state === DiscoveryState.ERROR;
  }

  /**
   * Check if offline
   */
  isOffline(): boolean {
    return this.state === DiscoveryState.OFFLINE;
  }

  /**
   * Check if waiting
   */
  isWaiting(): boolean {
    return (
      this.state === DiscoveryState.WAITING_MOVEMENT ||
      this.state === DiscoveryState.WAITING_COOLDOWN
    );
  }

  /**
   * Get state description
   */
  getStateDescription(): string {
    switch (this.state) {
      case DiscoveryState.IDLE:
        return 'Idle - Discovery not started';
      case DiscoveryState.WAITING_MOVEMENT:
        return 'Waiting for movement threshold';
      case DiscoveryState.WAITING_COOLDOWN:
        return 'Waiting for cooldown period';
      case DiscoveryState.SEARCHING:
        return 'Searching for POIs';
      case DiscoveryState.USING_CACHE:
        return 'Using cached results';
      case DiscoveryState.RESULTS_READY:
        return 'Results ready';
      case DiscoveryState.ERROR:
        return 'Error occurred';
      case DiscoveryState.OFFLINE:
        return 'Network offline';
      default:
        return 'Unknown state';
    }
  }
}

// Export singleton
export const discoveryStateMachine = new DiscoveryStateMachine();
