/**
 * GUIDY - POI Session Module
 * Public exports for POI Session Manager
 * 
 * STAGE 4.3: POI Session Manager
 */

// Types
export {
  POISessionState,
  POILifecycleState,
  POILifecycleEvent,
  POISessionEvent,
} from './POISessionTypes';

export type {
  POIWithSession,
  POISessionStats,
  POISessionConfig,
  POISessionUpdateResult,
  POIGroup,
  POISessionStateChange,
  POIStateChange,
} from './POISessionTypes';

export { DEFAULT_SESSION_CONFIG } from './POISessionTypes';

// Events
export {
  SessionEventType,
} from './POISessionEvents';

export type {
  SessionEvent,
  SessionStartedEvent,
  SessionStoppedEvent,
  SessionPausedEvent,
  SessionResumedEvent,
  SessionErrorEvent,
  SessionStateChangedEvent,
  POIDiscoveredEvent,
  POIActivatedEvent,
  POISelectedEvent,
  POIDeselectedEvent,
  POIVisitedEvent,
  POIArchivedEvent,
  POIExpiredEvent,
  POIRemovedEvent,
  POIStateChangedEvent,
  POIsUpdatedEvent,
  POIsDiscoveredBatchEvent,
  POIsExpiredBatchEvent,
  StatsUpdatedEvent,
} from './POISessionEvents';

// Observers
export {
  POIObserverManager,
  poiObserverManager,
} from './POIObservers';

// State Machine
export {
  POISessionStateMachine,
  poiSessionStateMachine,
} from './POISessionStateMachine';

// Lifecycle
export {
  POILifecycleManager,
} from './POILifecycle';

// Selection
export {
  POISelectionManager,
  SelectionReason,
} from './POISelection';

// Store
export {
  POISessionStore,
} from './POISessionStore';

// Session Manager
export {
  POISessionManager,
  poiSessionManager,
} from './POISessionManager';
