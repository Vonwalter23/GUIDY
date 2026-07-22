/**
 * GUIDY - Location Store
 * Zustand store synchronized with LocationStateMachine
 * 
 * STAGE 3.4B: Simplified store - derives most state from state machine
 * Only stores UI-specific state here (permission status)
 */

import {create} from 'zustand';
import type {
  LocationData,
  PermissionStatus,
} from './LocationTypes';
import {
  LocationEngineState,
  LocationEvent,
  locationStateMachine,
} from './LocationStateMachine';

/**
 * Location Store State
 * STAGE 3.4B: Simplified - derives most from state machine
 */
interface LocationStoreState {
  // Permission status (only kept here for Android permission flow)
  permissionStatus: PermissionStatus;
  
  // Previous location (for delta calculations)
  previousLocation: LocationData | null;
  
  // Last update timestamp
  lastUpdate: number | null;
  
  // Current engine state (mirror of state machine)
  engineState: LocationEngineState;
}

/**
 * Location Store Actions
 */
interface LocationStoreActions {
  // Permission actions
  setPermissionStatus: (status: PermissionStatus) => void;
  
  // Location actions (delegated to state machine)
  setCurrentLocation: (location: LocationData) => void;
  setPreviousLocation: (location: LocationData) => void;
  setLastUpdate: (timestamp: number | null) => void;
  
  // Engine state sync
  setEngineState: (state: LocationEngineState) => void;
  
  // Reset
  reset: () => void;
}

type LocationStore = LocationStoreState & LocationStoreActions;

/**
 * Initial state
 */
const initialState: LocationStoreState = {
  permissionStatus: 'denied',
  previousLocation: null,
  lastUpdate: null,
  engineState: LocationEngineState.IDLE,
};

/**
 * Location Store
 * STAGE 3.4B: Synchronized with state machine
 */
export const useLocationStore = create<LocationStore>((set) => ({
  // Initial State
  ...initialState,

  // Permission Status
  setPermissionStatus: (status: PermissionStatus) => {
    set({permissionStatus: status});
    
    // Sync with state machine
    if (status === 'granted' || status === 'limited') {
      locationStateMachine.sendEvent(LocationEvent.PERMISSION_GRANTED);
    } else if (status === 'denied') {
      locationStateMachine.sendEvent(LocationEvent.PERMISSION_DENIED);
    } else if (status === 'blocked') {
      locationStateMachine.sendEvent(LocationEvent.PERMISSION_BLOCKED);
    }
  },

  // Current Location (from state machine)
  setCurrentLocation: (_location: LocationData) => {
    set({lastUpdate: Date.now()});
  },

  // Previous Location
  setPreviousLocation: (location: LocationData) => {
    set({previousLocation: location});
  },

  // Last Update
  setLastUpdate: (timestamp: number | null) => {
    set({lastUpdate: timestamp});
  },

  // Engine State (from state machine)
  setEngineState: (state: LocationEngineState) => {
    set({engineState: state});
  },

  // Reset
  reset: () => {
    locationStateMachine.reset();
    set(initialState);
  },
}));

/**
 * Selector: Current engine state
 */
export const useEngineState = () => useLocationStore(state => state.engineState);

/**
 * Selector: Is tracking
 */
export const useIsTracking = () => {
  const engineState = useLocationStore(state => state.engineState);
  return engineState === LocationEngineState.TRACKING;
};

/**
 * Selector: GPS Status derived from engine state
 */
export const useGpsStatus = (): 'unavailable' | 'inactive' | 'searching' | 'active' => {
  const engineState = useLocationStore(state => state.engineState);
  
  switch (engineState) {
    case LocationEngineState.IDLE:
    case LocationEngineState.PERMISSION_DENIED:
    case LocationEngineState.ERROR:
      return 'unavailable';
    case LocationEngineState.STOPPED:
    case LocationEngineState.PAUSED:
      return 'inactive';
    case LocationEngineState.REQUESTING_PERMISSION:
    case LocationEngineState.STARTING_LOCATION:
    case LocationEngineState.WAITING_FIRST_FIX:
      return 'searching';
    case LocationEngineState.PERMISSION_GRANTED:
      return 'inactive';
    case LocationEngineState.TRACKING:
      return 'active';
    default:
      return 'unavailable';
  }
};

/**
 * Selector: Permission status
 */
export const usePermissionStatus = () => useLocationStore(state => state.permissionStatus);

/**
 * Selector: Last update time
 */
export const useLastUpdate = () => useLocationStore(state => state.lastUpdate);

/**
 * Selector: Current location from store
 * Note: currentLocation is derived from state machine, not store
 */
export const useCurrentLocation = () => locationStateMachine.getCurrentLocation();

/**
 * Selector: Error state
 * Note: error is derived from state machine, not store
 */
export const useLocationError = () => locationStateMachine.getError();
