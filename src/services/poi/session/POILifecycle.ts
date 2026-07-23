/**
 * GUIDY - POI Lifecycle Manager
 * Manages the lifecycle of individual POIs within a session
 * 
 * STAGE 4.3: POI Session Manager
 */

import { POILifecycleState, POILifecycleEvent } from './POISessionTypes';
import type { POIWithSession } from './POISessionTypes';
import { POIObserverManager } from './POIObservers';
import { SessionEventType } from './POISessionEvents';
import type { POI } from '../POITypes';

/**
 * Lifecycle transition definition
 */
interface LifecycleTransition {
  from: POILifecycleState;
  to: POILifecycleState;
  event: POILifecycleEvent;
}

/**
 * Valid lifecycle transitions
 */
const LIFECYCLE_TRANSITIONS: LifecycleTransition[] = [
  // NEW transitions
  { from: POILifecycleState.NEW, to: POILifecycleState.DISCOVERED, event: POILifecycleEvent.DISCOVER },
  
  // DISCOVERED transitions
  { from: POILifecycleState.DISCOVERED, to: POILifecycleState.ACTIVE, event: POILifecycleEvent.ACTIVATE },
  { from: POILifecycleState.DISCOVERED, to: POILifecycleState.EXPIRED, event: POILifecycleEvent.EXPIRE },
  { from: POILifecycleState.DISCOVERED, to: POILifecycleState.ARCHIVED, event: POILifecycleEvent.ARCHIVE },
  
  // ACTIVE transitions
  { from: POILifecycleState.ACTIVE, to: POILifecycleState.SELECTED, event: POILifecycleEvent.SELECT },
  { from: POILifecycleState.ACTIVE, to: POILifecycleState.VISITED, event: POILifecycleEvent.VISIT },
  { from: POILifecycleState.ACTIVE, to: POILifecycleState.EXPIRED, event: POILifecycleEvent.EXPIRE },
  { from: POILifecycleState.ACTIVE, to: POILifecycleState.ARCHIVED, event: POILifecycleEvent.ARCHIVE },
  
  // SELECTED transitions
  { from: POILifecycleState.SELECTED, to: POILifecycleState.ACTIVE, event: POILifecycleEvent.DESELECT },
  { from: POILifecycleState.SELECTED, to: POILifecycleState.VISITED, event: POILifecycleEvent.VISIT },
  { from: POILifecycleState.SELECTED, to: POILifecycleState.EXPIRED, event: POILifecycleEvent.EXPIRE },
  { from: POILifecycleState.SELECTED, to: POILifecycleState.ARCHIVED, event: POILifecycleEvent.ARCHIVE },
  
  // VISITED transitions
  { from: POILifecycleState.VISITED, to: POILifecycleState.ARCHIVED, event: POILifecycleEvent.ARCHIVE },
  { from: POILifecycleState.VISITED, to: POILifecycleState.EXPIRED, event: POILifecycleEvent.EXPIRE },
  
  // ARCHIVED transitions (terminal for most cases)
  { from: POILifecycleState.ARCHIVED, to: POILifecycleState.EXPIRED, event: POILifecycleEvent.EXPIRE },
];

/**
 * POI Lifecycle Manager
 */
export class POILifecycleManager {
  private observers: POIObserverManager;
  private sessionId: string;

  constructor(observers: POIObserverManager, sessionId: string = '') {
    this.observers = observers;
    this.sessionId = sessionId;
  }

  /**
   * Set session ID
   */
  setSessionId(id: string): void {
    this.sessionId = id;
  }

  /**
   * Create new POI with session metadata
   */
  createPOIWithSession(poi: POI): POIWithSession {
    return {
      poi,
      lifecycleState: POILifecycleState.NEW,
      discoveredAt: Date.now(),
      visitCount: 0,
    };
  }

  /**
   * Transition POI to new state
   */
  transition(
    poiWithSession: POIWithSession,
    event: POILifecycleEvent
  ): POIWithSession | null {
    const transition = this.findTransition(poiWithSession.lifecycleState, event);
    
    if (!transition) {
      console.warn(
        `[POILifecycle] Invalid transition: ${poiWithSession.lifecycleState} --(${event})`
      );
      return null;
    }

    const previousState = poiWithSession.lifecycleState;
    const now = Date.now();
    
    // Update POI state
    const updated: POIWithSession = {
      ...poiWithSession,
      lifecycleState: transition.to,
    };

    // Set timestamps based on event
    switch (event) {
      case POILifecycleEvent.DISCOVER:
        updated.discoveredAt = now;
        break;
      case POILifecycleEvent.ACTIVATE:
        updated.activatedAt = now;
        break;
      case POILifecycleEvent.SELECT:
        updated.selectedAt = now;
        break;
      case POILifecycleEvent.DESELECT:
        updated.selectedAt = undefined;
        break;
      case POILifecycleEvent.VISIT:
        updated.visitedAt = now;
        updated.visitCount = (updated.visitCount || 0) + 1;
        break;
      case POILifecycleEvent.ARCHIVE:
        updated.archivedAt = now;
        break;
      case POILifecycleEvent.EXPIRE:
        updated.expiredAt = now;
        break;
    }

    // Emit event
    this.emitTransitionEvent(updated, previousState, transition.to, event);

    return updated;
  }

  /**
   * Find valid transition
   */
  private findTransition(
    from: POILifecycleState,
    event: POILifecycleEvent
  ): LifecycleTransition | undefined {
    return LIFECYCLE_TRANSITIONS.find(
      t => t.from === from && t.event === event
    );
  }

  /**
   * Check if transition is valid
   */
  canTransition(
    state: POILifecycleState,
    event: POILifecycleEvent
  ): boolean {
    return this.findTransition(state, event) !== undefined;
  }

  /**
   * Get valid events for state
   */
  getValidEvents(state: POILifecycleState): POILifecycleEvent[] {
    return LIFECYCLE_TRANSITIONS
      .filter(t => t.from === state)
      .map(t => t.event);
  }

  /**
   * Check if POI is in terminal state
   */
  isTerminalState(state: POILifecycleState): boolean {
    return state === POILifecycleState.EXPIRED || state === POILifecycleState.ARCHIVED;
  }

  /**
   * Check if POI can be activated
   */
  canBeActivated(poiWithSession: POIWithSession): boolean {
    return poiWithSession.lifecycleState === POILifecycleState.DISCOVERED;
  }

  /**
   * Check if POI can be visited
   */
  canBeVisited(poiWithSession: POIWithSession): boolean {
    return poiWithSession.lifecycleState === POILifecycleState.ACTIVE ||
           poiWithSession.lifecycleState === POILifecycleState.SELECTED;
  }

  /**
   * Check if POI is visited
   */
  isVisited(poiWithSession: POIWithSession): boolean {
    return poiWithSession.lifecycleState === POILifecycleState.VISITED ||
           poiWithSession.lifecycleState === POILifecycleState.ARCHIVED;
  }

  /**
   * Check if POI is expired
   */
  isExpired(poiWithSession: POIWithSession): boolean {
    return poiWithSession.lifecycleState === POILifecycleState.EXPIRED;
  }

  /**
   * Check if POI is archived
   */
  isArchived(poiWithSession: POIWithSession): boolean {
    return poiWithSession.lifecycleState === POILifecycleState.ARCHIVED;
  }

  /**
   * Check if POI is active
   */
  isActive(poiWithSession: POIWithSession): boolean {
    return poiWithSession.lifecycleState === POILifecycleState.ACTIVE ||
           poiWithSession.lifecycleState === POILifecycleState.SELECTED;
  }

  /**
   * Check if POI is selected
   */
  isSelected(poiWithSession: POIWithSession): boolean {
    return poiWithSession.lifecycleState === POILifecycleState.SELECTED;
  }

  /**
   * Get state description
   */
  getStateDescription(state: POILifecycleState): string {
    switch (state) {
      case POILifecycleState.NEW:
        return 'New POI (not yet discovered)';
      case POILifecycleState.DISCOVERED:
        return 'Discovered by search';
      case POILifecycleState.ACTIVE:
        return 'Active around user';
      case POILifecycleState.SELECTED:
        return 'Selected by user';
      case POILifecycleState.VISITED:
        return 'Visited by user';
      case POILifecycleState.ARCHIVED:
        return 'Archived';
      case POILifecycleState.EXPIRED:
        return 'Expired (too far or invalid)';
      default:
        return 'Unknown state';
    }
  }

  /**
   * Emit transition event
   */
  private emitTransitionEvent(
    poi: POIWithSession,
    previousState: POILifecycleState,
    currentState: POILifecycleState,
    event: POILifecycleEvent
  ): void {
    // Emit state changed event
    this.observers.emit({
      type: SessionEventType.POI_STATE_CHANGED,
      poi,
      previousState,
      currentState,
      timestamp: Date.now(),
    });

    // Emit specific event
    switch (event) {
      case POILifecycleEvent.DISCOVER:
        this.observers.emit({
          type: SessionEventType.POI_DISCOVERED,
          poi,
          timestamp: Date.now(),
        });
        break;
      case POILifecycleEvent.ACTIVATE:
        this.observers.emit({
          type: SessionEventType.POI_ACTIVATED,
          poi,
          timestamp: Date.now(),
        });
        break;
      case POILifecycleEvent.SELECT:
        this.observers.emit({
          type: SessionEventType.POI_SELECTED,
          poi,
          timestamp: Date.now(),
        });
        break;
      case POILifecycleEvent.DESELECT:
        this.observers.emit({
          type: SessionEventType.POI_DESELECTED,
          poi,
          timestamp: Date.now(),
        });
        break;
      case POILifecycleEvent.VISIT:
        this.observers.emit({
          type: SessionEventType.POI_VISITED,
          poi,
          visitCount: poi.visitCount,
          timestamp: Date.now(),
        });
        break;
      case POILifecycleEvent.ARCHIVE:
        this.observers.emit({
          type: SessionEventType.POI_ARCHIVED,
          poi,
          timestamp: Date.now(),
        });
        break;
      case POILifecycleEvent.EXPIRE:
        this.observers.emit({
          type: SessionEventType.POI_EXPIRED,
          poi,
          distanceFromUser: poi.poi.distance || 0,
          timestamp: Date.now(),
        });
        break;
      case POILifecycleEvent.REMOVE:
        this.observers.emit({
          type: SessionEventType.POI_REMOVED,
          poiId: poi.poi.id,
          timestamp: Date.now(),
        });
        break;
    }
  }
}
