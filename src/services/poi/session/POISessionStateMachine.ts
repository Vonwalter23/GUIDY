/**
 * GUIDY - POI Session State Machine
 * State machine for POI Session Manager
 * 
 * STAGE 4.3: POI Session Manager
 */

import { POISessionState, POISessionEvent, POISessionStateChange } from './POISessionTypes';
import { POIObserverManager, poiObserverManager } from './POIObservers';
import { SessionEventType } from './POISessionEvents';

/**
 * State transition definition
 */
interface StateTransition {
  from: POISessionState;
  to: POISessionState;
  event: POISessionEvent;
  guard?: () => boolean;
}

/**
 * Valid state transitions
 */
const STATE_TRANSITIONS: StateTransition[] = [
  // From IDLE
  { from: POISessionState.IDLE, to: POISessionState.SESSION_STARTED, event: POISessionEvent.START },
  
  // From SESSION_STARTED
  { from: POISessionState.SESSION_STARTED, to: POISessionState.DISCOVERING, event: POISessionEvent.UPDATE },
  { from: POISessionState.SESSION_STARTED, to: POISessionState.ACTIVE, event: POISessionEvent.UPDATE },
  { from: POISessionState.SESSION_STARTED, to: POISessionState.ERROR, event: POISessionEvent.ERROR },
  
  // From DISCOVERING
  { from: POISessionState.DISCOVERING, to: POISessionState.ACTIVE, event: POISessionEvent.UPDATE },
  { from: POISessionState.DISCOVERING, to: POISessionState.PAUSED, event: POISessionEvent.PAUSE },
  { from: POISessionState.DISCOVERING, to: POISessionState.ERROR, event: POISessionEvent.ERROR },
  
  // From ACTIVE
  { from: POISessionState.ACTIVE, to: POISessionState.UPDATING, event: POISessionEvent.UPDATE },
  { from: POISessionState.ACTIVE, to: POISessionState.PAUSED, event: POISessionEvent.PAUSE },
  { from: POISessionState.ACTIVE, to: POISessionState.FINISHED, event: POISessionEvent.STOP },
  { from: POISessionState.ACTIVE, to: POISessionState.ERROR, event: POISessionEvent.ERROR },
  
  // From UPDATING
  { from: POISessionState.UPDATING, to: POISessionState.ACTIVE, event: POISessionEvent.UPDATE },
  { from: POISessionState.UPDATING, to: POISessionState.PAUSED, event: POISessionEvent.PAUSE },
  { from: POISessionState.UPDATING, to: POISessionState.FINISHED, event: POISessionEvent.STOP },
  { from: POISessionState.UPDATING, to: POISessionState.ERROR, event: POISessionEvent.ERROR },
  
  // From PAUSED
  { from: POISessionState.PAUSED, to: POISessionState.ACTIVE, event: POISessionEvent.RESUME },
  { from: POISessionState.PAUSED, to: POISessionState.UPDATING, event: POISessionEvent.UPDATE },
  { from: POISessionState.PAUSED, to: POISessionState.FINISHED, event: POISessionEvent.STOP },
  
  // From ERROR
  { from: POISessionState.ERROR, to: POISessionState.IDLE, event: POISessionEvent.RESET },
  { from: POISessionState.ERROR, to: POISessionState.ACTIVE, event: POISessionEvent.RESUME },
  { from: POISessionState.ERROR, to: POISessionState.FINISHED, event: POISessionEvent.STOP },
  
  // From FINISHED
  { from: POISessionState.FINISHED, to: POISessionState.IDLE, event: POISessionEvent.RESET },
];

/**
 * POI Session State Machine
 */
export class POISessionStateMachine {
  private state: POISessionState = POISessionState.IDLE;
  private stateHistory: POISessionStateChange[] = [];
  private listeners: Array<(change: POISessionStateChange) => void> = [];
  private maxHistorySize: number = 100;
  private stateStartTime: number = Date.now();
  private observers: POIObserverManager;
  private sessionId: string = '';

  constructor(observers?: POIObserverManager) {
    this.observers = observers ?? poiObserverManager;
  }

  /**
   * Get current state
   */
  getState(): POISessionState {
    return this.state;
  }

  /**
   * Get state description
   */
  getStateDescription(): string {
    switch (this.state) {
      case POISessionState.IDLE:
        return 'Session not started';
      case POISessionState.SESSION_STARTED:
        return 'Session initialized';
      case POISessionState.DISCOVERING:
        return 'Discovering POIs';
      case POISessionState.ACTIVE:
        return 'Session active';
      case POISessionState.UPDATING:
        return 'Updating POIs';
      case POISessionState.PAUSED:
        return 'Session paused';
      case POISessionState.FINISHED:
        return 'Session finished';
      case POISessionState.ERROR:
        return 'Error occurred';
      default:
        return 'Unknown state';
    }
  }

  /**
   * Send event to state machine
   */
  sendEvent(event: POISessionEvent): boolean {
    const transition = this.findTransition(this.state, event);
    
    if (!transition) {
      console.warn(`[POISessionSM] Invalid transition: ${this.state} --(${event})`);
      return false;
    }

    const previousState = this.state;
    const now = Date.now();

    // Update state
    this.state = transition.to;
    this.stateStartTime = now;

    // Record state change
    const change: POISessionStateChange = {
      previousState,
      currentState: transition.to,
      timestamp: now,
      event,
    };
    
    this.stateHistory.push(change);
    
    // Limit history size
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory.shift();
    }

    // Notify listeners
    this.notifyListeners(change);
    
    // Emit event to observer manager
    this.emitStateChangeEvent(change);

    console.log(`[POISessionSM] ${previousState} --(${event})--> ${transition.to}`);
    return true;
  }

  /**
   * Find valid transition
   */
  private findTransition(
    from: POISessionState,
    event: POISessionEvent
  ): StateTransition | undefined {
    return STATE_TRANSITIONS.find(
      t => t.from === from && t.event === event
    );
  }

  /**
   * Check if transition is valid
   */
  canTransition(event: POISessionEvent): boolean {
    return this.findTransition(this.state, event) !== undefined;
  }

  /**
   * Get valid events for current state
   */
  getValidEvents(): POISessionEvent[] {
    return STATE_TRANSITIONS
      .filter(t => t.from === this.state)
      .map(t => t.event);
  }

  /**
   * Check if session is active
   */
  isActive(): boolean {
    return this.state === POISessionState.ACTIVE ||
           this.state === POISessionState.DISCOVERING ||
           this.state === POISessionState.UPDATING;
  }

  /**
   * Check if session is running
   */
  isRunning(): boolean {
    return this.state !== POISessionState.IDLE &&
           this.state !== POISessionState.FINISHED &&
           this.state !== POISessionState.ERROR;
  }

  /**
   * Check if session is paused
   */
  isPaused(): boolean {
    return this.state === POISessionState.PAUSED;
  }

  /**
   * Check if session has error
   */
  hasError(): boolean {
    return this.state === POISessionState.ERROR;
  }

  /**
   * Check if session is finished
   */
  isFinished(): boolean {
    return this.state === POISessionState.FINISHED;
  }

  /**
   * Get state history
   */
  getHistory(): POISessionStateChange[] {
    return [...this.stateHistory];
  }

  /**
   * Get time in current state
   */
  getTimeInState(): number {
    return Date.now() - this.stateStartTime;
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.state = POISessionState.IDLE;
    this.stateStartTime = Date.now();
    this.emitStateChangeEvent({
      previousState: this.state,
      currentState: POISessionState.IDLE,
      timestamp: Date.now(),
      event: POISessionEvent.RESET,
    });
  }

  /**
   * Set session ID
   */
  setSessionId(id: string): void {
    this.sessionId = id;
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Add state change listener
   */
  addListener(listener: (change: POISessionStateChange) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(change: POISessionStateChange): void {
    for (const listener of this.listeners) {
      try {
        listener(change);
      } catch (error) {
        console.error('[POISessionSM] Listener error:', error);
      }
    }
  }

  /**
   * Emit state change event to observer manager
   */
  private emitStateChangeEvent(change: POISessionStateChange): void {
    this.observers.emit({
      type: SessionEventType.SESSION_STATE_CHANGED,
      sessionId: this.sessionId,
      previousState: change.previousState,
      currentState: change.currentState,
      timestamp: change.timestamp,
    });
  }
}

/**
 * Singleton instance
 */
export const poiSessionStateMachine = new POISessionStateMachine();
