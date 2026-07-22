/**
 * GUIDY - Location State Machine
 * Single source of truth for location engine state
 * 
 * STAGE 3.4B: Architectural Rebuild
 * Replaces multiple booleans with single state machine
 */

import type {LocationData} from './LocationTypes';

/**
 * Location Engine States
 * Each state is mutually exclusive and exhaustive
 */
export enum LocationEngineState {
  /** Initial state - no location activity */
  IDLE = 'IDLE',
  
  /** Requesting location permission from user */
  REQUESTING_PERMISSION = 'REQUESTING_PERMISSION',
  
  /** Permission granted by user */
  PERMISSION_GRANTED = 'PERMISSION_GRANTED',
  
  /** Permission denied or blocked */
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  
  /** Starting location updates */
  STARTING_LOCATION = 'STARTING_LOCATION',
  
  /** Waiting for first GPS fix */
  WAITING_FIRST_FIX = 'WAITING_FIRST_FIX',
  
  /** Location available, tracking active */
  TRACKING = 'TRACKING',
  
  /** Location available but tracking paused */
  PAUSED = 'PAUSED',
  
  /** Location tracking stopped by user */
  STOPPED = 'STOPPED',
  
  /** Error state */
  ERROR = 'ERROR',
}

/**
 * Events that trigger state transitions
 */
export enum LocationEvent {
  /** User requests location permission */
  REQUEST_PERMISSION = 'REQUEST_PERMISSION',
  
  /** Permission granted by user/system */
  PERMISSION_GRANTED = 'PERMISSION_GRANTED',
  
  /** Permission denied by user/system */
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  
  /** Permission blocked permanently */
  PERMISSION_BLOCKED = 'PERMISSION_BLOCKED',
  
  /** Start location tracking */
  START_TRACKING = 'START_TRACKING',
  
  /** Stop location tracking */
  STOP_TRACKING = 'STOP_TRACKING',
  
  /** First valid location received */
  FIRST_LOCATION_RECEIVED = 'FIRST_LOCATION_RECEIVED',
  
  /** Location update received */
  LOCATION_UPDATE = 'LOCATION_UPDATE',
  
  /** GPS becomes unavailable */
  GPS_UNAVAILABLE = 'GPS_UNAVAILABLE',
  
  /** GPS becomes available again */
  GPS_AVAILABLE = 'GPS_AVAILABLE',
  
  /** Error occurred */
  ERROR = 'ERROR',
  
  /** Clear error and return to idle */
  CLEAR_ERROR = 'CLEAR_ERROR',
  
  /** Reset to initial state */
  RESET = 'RESET',
}

/**
 * State transition definition
 */
interface StateTransition {
  from: LocationEngineState;
  event: LocationEvent;
  to: LocationEngineState;
  action?: () => void;
}

/**
 * Complete state machine definition
 */
const STATE_TRANSITIONS: StateTransition[] = [
  // From IDLE
  {from: LocationEngineState.IDLE, event: LocationEvent.REQUEST_PERMISSION, to: LocationEngineState.REQUESTING_PERMISSION},
  {from: LocationEngineState.IDLE, event: LocationEvent.PERMISSION_GRANTED, to: LocationEngineState.PERMISSION_GRANTED},
  
  // From REQUESTING_PERMISSION
  {from: LocationEngineState.REQUESTING_PERMISSION, event: LocationEvent.PERMISSION_GRANTED, to: LocationEngineState.PERMISSION_GRANTED},
  {from: LocationEngineState.REQUESTING_PERMISSION, event: LocationEvent.PERMISSION_DENIED, to: LocationEngineState.PERMISSION_DENIED},
  {from: LocationEngineState.REQUESTING_PERMISSION, event: LocationEvent.PERMISSION_BLOCKED, to: LocationEngineState.PERMISSION_DENIED},
  
  // From PERMISSION_GRANTED
  {from: LocationEngineState.PERMISSION_GRANTED, event: LocationEvent.START_TRACKING, to: LocationEngineState.STARTING_LOCATION},
  {from: LocationEngineState.PERMISSION_GRANTED, event: LocationEvent.PERMISSION_DENIED, to: LocationEngineState.PERMISSION_DENIED},
  
  // From PERMISSION_DENIED
  {from: LocationEngineState.PERMISSION_DENIED, event: LocationEvent.REQUEST_PERMISSION, to: LocationEngineState.REQUESTING_PERMISSION},
  {from: LocationEngineState.PERMISSION_DENIED, event: LocationEvent.PERMISSION_GRANTED, to: LocationEngineState.PERMISSION_GRANTED},
  
  // From STARTING_LOCATION
  {from: LocationEngineState.STARTING_LOCATION, event: LocationEvent.FIRST_LOCATION_RECEIVED, to: LocationEngineState.TRACKING},
  {from: LocationEngineState.STARTING_LOCATION, event: LocationEvent.ERROR, to: LocationEngineState.ERROR},
  {from: LocationEngineState.STARTING_LOCATION, event: LocationEvent.GPS_UNAVAILABLE, to: LocationEngineState.WAITING_FIRST_FIX},
  {from: LocationEngineState.STARTING_LOCATION, event: LocationEvent.STOP_TRACKING, to: LocationEngineState.STOPPED},
  
  // From WAITING_FIRST_FIX
  {from: LocationEngineState.WAITING_FIRST_FIX, event: LocationEvent.FIRST_LOCATION_RECEIVED, to: LocationEngineState.TRACKING},
  {from: LocationEngineState.WAITING_FIRST_FIX, event: LocationEvent.ERROR, to: LocationEngineState.ERROR},
  {from: LocationEngineState.WAITING_FIRST_FIX, event: LocationEvent.STOP_TRACKING, to: LocationEngineState.STOPPED},
  
  // From TRACKING
  {from: LocationEngineState.TRACKING, event: LocationEvent.LOCATION_UPDATE, to: LocationEngineState.TRACKING},
  {from: LocationEngineState.TRACKING, event: LocationEvent.GPS_UNAVAILABLE, to: LocationEngineState.WAITING_FIRST_FIX},
  {from: LocationEngineState.TRACKING, event: LocationEvent.STOP_TRACKING, to: LocationEngineState.STOPPED},
  {from: LocationEngineState.TRACKING, event: LocationEvent.ERROR, to: LocationEngineState.ERROR},
  
  // From PAUSED
  {from: LocationEngineState.PAUSED, event: LocationEvent.START_TRACKING, to: LocationEngineState.TRACKING},
  {from: LocationEngineState.PAUSED, event: LocationEvent.STOP_TRACKING, to: LocationEngineState.STOPPED},
  
  // From STOPPED
  {from: LocationEngineState.STOPPED, event: LocationEvent.START_TRACKING, to: LocationEngineState.STARTING_LOCATION},
  {from: LocationEngineState.STOPPED, event: LocationEvent.PERMISSION_DENIED, to: LocationEngineState.PERMISSION_DENIED},
  
  // From ERROR
  {from: LocationEngineState.ERROR, event: LocationEvent.CLEAR_ERROR, to: LocationEngineState.IDLE},
  {from: LocationEngineState.ERROR, event: LocationEvent.RESET, to: LocationEngineState.IDLE},
  {from: LocationEngineState.ERROR, event: LocationEvent.REQUEST_PERMISSION, to: LocationEngineState.REQUESTING_PERMISSION},
];

/**
 * Debug logging
 */
const DEBUG_STATE = true;

const getTimestamp = (): string => new Date().toISOString();

const logState = (message: string, ...data: unknown[]): void => {
  if (DEBUG_STATE) {
    console.log(`[LOCATION STATE ${getTimestamp()}] ${message}`, ...data);
  }
};

/**
 * Location State Machine
 * Single source of truth for all location engine state
 */
export class LocationStateMachine {
  private state: LocationEngineState = LocationEngineState.IDLE;
  private previousState: LocationEngineState = LocationEngineState.IDLE;
  private currentLocation: LocationData | null = null;
  private error: {code: string; message: string} | null = null;
  private listeners: Set<(state: LocationEngineState, prevState: LocationEngineState) => void> = new Set();
  private locationListeners: Set<(location: LocationData) => void> = new Set();
  private errorListeners: Set<(error: {code: string; message: string}) => void> = new Set();
  
  constructor() {
    logState(`[INIT] State machine initialized in ${this.state}`);
  }
  
  /**
   * Get current state
   */
  getState(): LocationEngineState {
    return this.state;
  }
  
  /**
   * Get previous state
   */
  getPreviousState(): LocationEngineState {
    return this.previousState;
  }
  
  /**
   * Get current location
   */
  getCurrentLocation(): LocationData | null {
    return this.currentLocation;
  }
  
  /**
   * Get current error
   */
  getError(): {code: string; message: string} | null {
    return this.error;
  }
  
  /**
   * Check if tracking is active
   */
  isTracking(): boolean {
    return this.state === LocationEngineState.TRACKING;
  }
  
  /**
   * Check if location is available
   */
  isLocationAvailable(): boolean {
    return this.state === LocationEngineState.TRACKING || 
           this.state === LocationEngineState.WAITING_FIRST_FIX ||
           this.state === LocationEngineState.STARTING_LOCATION;
  }
  
  /**
   * Send event to state machine
   */
  sendEvent(event: LocationEvent, data?: unknown): boolean {
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
    
    // Notify state listeners
    this.listeners.forEach(listener => {
      try {
        listener(this.state, this.previousState);
      } catch (err) {
        logState(`[ERROR] Listener error:`, err);
      }
    });
    
    // Handle event data
    if (data && 'location' in (data as Record<string, unknown>)) {
      this.handleLocationUpdate((data as {location: LocationData}).location);
    }
    
    if (data && 'error' in (data as Record<string, unknown>)) {
      this.handleError((data as {error: {code: string; message: string}}).error);
    }
    
    return true;
  }
  
  /**
   * Handle location update
   */
  handleLocationUpdate(location: LocationData): void {
    logState(`[LOCATION] Received: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`);
    
    this.currentLocation = location;
    this.error = null;
    
    // Notify location listeners
    this.locationListeners.forEach(listener => {
      try {
        listener(location);
      } catch (err) {
        logState(`[ERROR] Location listener error:`, err);
      }
    });
  }
  
  /**
   * Handle error
   */
  handleError(error: {code: string; message: string}): void {
    logState(`[ERROR] Code: ${error.code}, Message: ${error.message}`);
    
    this.error = error;
    
    // Notify error listeners
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (err) {
        logState(`[ERROR] Error listener error:`, err);
      }
    });
  }
  
  /**
   * Subscribe to state changes
   */
  onStateChange(callback: (state: LocationEngineState, prevState: LocationEngineState) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
  
  /**
   * Subscribe to location updates
   */
  onLocation(callback: (location: LocationData) => void): () => void {
    this.locationListeners.add(callback);
    return () => this.locationListeners.delete(callback);
  }
  
  /**
   * Subscribe to errors
   */
  onError(callback: (error: {code: string; message: string}) => void): () => void {
    this.errorListeners.add(callback);
    return () => this.errorListeners.delete(callback);
  }
  
  /**
   * Reset state machine to initial state
   */
  reset(): void {
    logState(`[RESET] Resetting from ${this.state} to IDLE`);
    
    this.state = LocationEngineState.IDLE;
    this.previousState = LocationEngineState.IDLE;
    this.currentLocation = null;
    this.error = null;
    
    this.listeners.forEach(listener => {
      try {
        listener(this.state, this.previousState);
      } catch (err) {
        logState(`[ERROR] Reset listener error:`, err);
      }
    });
  }
  
  /**
   * Get debug info
   */
  getDebugInfo(): {
    state: LocationEngineState;
    previousState: LocationEngineState;
    hasLocation: boolean;
    hasError: boolean;
    listenerCount: number;
  } {
    return {
      state: this.state,
      previousState: this.previousState,
      hasLocation: this.currentLocation !== null,
      hasError: this.error !== null,
      listenerCount: this.listeners.size,
    };
  }
}

// Export singleton instance
export const locationStateMachine = new LocationStateMachine();

export default locationStateMachine;
