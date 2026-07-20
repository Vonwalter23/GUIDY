/**
 * GUIDY - Location Store
 * Zustand store for global location state
 */

import {create} from 'zustand';
import type {
  LocationData,
  LocationState,
  LocationActions,
  PermissionStatus,
  GpsStatus,
} from './LocationTypes';

/**
 * Initial location state
 */
const initialLocationState: LocationState = {
  currentLocation: null,
  previousLocation: null,
  permissionStatus: 'denied',
  gpsStatus: 'unavailable',
  isTracking: false,
  lastUpdate: null,
  error: null,
};

/**
 * Location Store
 */
export const useLocationStore = create<LocationState & LocationActions>((set) => ({
  // Initial State
  ...initialLocationState,

  // Actions
  setCurrentLocation: (location: LocationData) =>
    set({currentLocation: location, lastUpdate: Date.now()}),

  setPreviousLocation: (location: LocationData) =>
    set({previousLocation: location}),

  setPermissionStatus: (status: PermissionStatus) =>
    set({permissionStatus: status}),

  setGpsStatus: (status: GpsStatus) =>
    set({gpsStatus: status}),

  setIsTracking: (isTracking: boolean) =>
    set({isTracking}),

  setError: (error: LocationState['error']) =>
    set({error}),

  setLastUpdate: (timestamp: number | null) =>
    set({lastUpdate: timestamp}),

  reset: () =>
    set(initialLocationState),
}));

/**
 * Selector for current location
 */
export const useCurrentLocation = () => useLocationStore(state => state.currentLocation);

/**
 * Selector for permission status
 */
export const usePermissionStatus = () => useLocationStore(state => state.permissionStatus);

/**
 * Selector for GPS status
 */
export const useGpsStatus = () => useLocationStore(state => state.gpsStatus);

/**
 * Selector for tracking state
 */
export const useIsTracking = () => useLocationStore(state => state.isTracking);

/**
 * Selector for last update time
 */
export const useLastUpdate = () => useLocationStore(state => state.lastUpdate);

/**
 * Selector for error state
 */
export const useLocationError = () => useLocationStore(state => state.error);
