/**
 * GUIDY - Location Provider
 * React context and hooks for location functionality
 */

import React, {createContext, useContext, useEffect, useCallback, useRef} from 'react';
import {useAppState} from '@react-native-community/hooks';
import type {LocationData, PermissionStatus} from './LocationTypes';
import {LocationErrorCode} from './LocationTypes';
import locationService from './LocationService';
import {requestLocationPermission, getPermissionStatus} from './LocationPermissions';
import {getGpsStatus} from './LocationUtils';
import {useLocationStore} from './useLocationStore';
import {createMovementDetector} from './MovementDetector';

 /**
 * Location Provider Props
 */
interface LocationProviderProps {
  children: React.ReactNode;
  enableHighAccuracy?: boolean;
  distanceFilter?: number;
  interval?: number;
}

/**
 * Location Context Value
 */
interface LocationContextValue {
  // State
  currentLocation: LocationData | null;
  previousLocation: LocationData | null;
  permissionStatus: PermissionStatus;
  gpsStatus: 'active' | 'inactive' | 'unavailable';
  isTracking: boolean;
  isMoving: boolean;
  error: {code: string; message: string} | null;
  lastUpdate: number | null;

  // Actions
  requestPermission: () => Promise<{granted: boolean; status: string}>;
  startTracking: () => void;
  stopTracking: () => void;
  refreshLocation: () => Promise<void>;
}

/**
 * Create Location Context
 */
const LocationContext = createContext<LocationContextValue | null>(null);

/**
 * Default context value
 */
const defaultContextValue: LocationContextValue = {
  currentLocation: null,
  previousLocation: null,
  permissionStatus: 'denied',
  gpsStatus: 'unavailable',
  isTracking: false,
  isMoving: false,
  error: null,
  lastUpdate: null,
  requestPermission: async () => ({granted: false, status: 'denied'}),
  startTracking: () => {},
  stopTracking: () => {},
  refreshLocation: async () => {},
};

/**
 * Location Provider Component
 */
export function LocationProvider({
  children,
  enableHighAccuracy = true,
  distanceFilter = 0,
  interval = 5000,
}: LocationProviderProps): React.JSX.Element {
  const appState = useAppState();
  const movementDetectorRef = useRef(createMovementDetector());

  // Get store state and actions
  const store = useLocationStore();

  // Handle location updates
  const handleLocationUpdate = useCallback(
    (location: LocationData) => {
      // Update previous location
      if (store.currentLocation) {
        store.setPreviousLocation(store.currentLocation);
      }

      // Update current location
      store.setCurrentLocation(location);

      // Update GPS status
      store.setGpsStatus(getGpsStatus(location));

      // Update movement state
      const movementState = movementDetectorRef.current.update(location);
      if (movementState.isMoving !== store.isTracking) {
        store.setIsTracking(movementState.isMoving);
      }

      // Clear error and update timestamp
      store.setError(null);
      store.setLastUpdate(Date.now());
    },
    [store],
  );

  // Handle location errors
  const handleLocationError = useCallback(
    (error: {code: string; message: string}) => {
      const locationError = {
        code: error.code as LocationErrorCode,
        message: error.message,
      };
      store.setError(locationError);
      if (error.code === LocationErrorCode.PERMISSION_DENIED) {
        store.setPermissionStatus('denied');
      }
    },
    [store],
  );

  // Start tracking
  const startTracking = useCallback(() => {
    if (store.isTracking) {
      return;
    }

    store.setIsTracking(true);
    locationService.startLocationUpdates(
      handleLocationUpdate,
      handleLocationError,
      {enableHighAccuracy, distanceFilter, interval},
    );
  }, [store, handleLocationUpdate, handleLocationError, enableHighAccuracy, distanceFilter, interval]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    locationService.stopLocationUpdates();
    store.setIsTracking(false);
  }, [store]);

  // Request permission
  const requestPermission = useCallback(async () => {
    const result = await requestLocationPermission();
    store.setPermissionStatus(result.status);
    return {
      granted: result.status === 'granted' || result.status === 'limited',
      status: result.status,
    };
  }, [store]);

  // Refresh location once
  const refreshLocation = useCallback(async () => {
    try {
      const location = await locationService.getCurrentLocation({enableHighAccuracy});
      handleLocationUpdate(location);
    } catch (error: unknown) {
      const err = error as {code?: string; message?: string};
      handleLocationError({
        code: err.code || 'UNKNOWN',
        message: err.message || 'Error desconocido',
      });
    }
  }, [handleLocationUpdate, handleLocationError, enableHighAccuracy]);

  // Check permission on mount
  useEffect(() => {
    const checkPermission = async () => {
      const status = await getPermissionStatus();
      store.setPermissionStatus(status);
    };
    checkPermission();
  }, [store]);

  // Handle app state changes
  useEffect(() => {
    if (appState === 'active' && store.permissionStatus === 'granted') {
      // App came to foreground - could refresh location
    } else if (appState === 'background') {
      // App went to background - continue tracking if needed
    }
  }, [appState, store.permissionStatus]);

  // Cleanup on unmount
  useEffect(() => {
    const detector = movementDetectorRef.current;
    return () => {
      // Stop location tracking
      locationService.stopLocationUpdates();
      if (detector) {
        detector.reset();
      }
    };
  }, []);

  const contextValue: LocationContextValue = {
    currentLocation: store.currentLocation,
    previousLocation: store.previousLocation,
    permissionStatus: store.permissionStatus,
    gpsStatus: store.gpsStatus,
    isTracking: store.isTracking,
    isMoving: store.isTracking,
    error: store.error,
    lastUpdate: store.lastUpdate,
    requestPermission,
    startTracking,
    stopTracking,
    refreshLocation,
  };

  return (
    <LocationContext.Provider value={contextValue}>
      {children}
    </LocationContext.Provider>
  );
}

/**
 * Hook to access location context
 */
export function useLocation(): LocationContextValue {
  const context = useContext(LocationContext);
  if (!context) {
    console.warn('useLocation must be used within a LocationProvider');
    return defaultContextValue;
  }
  return context;
}

/**
 * Hook to get current location only
 */
export function useCurrentLocation(): LocationData | null {
  const {currentLocation} = useLocation();
  return currentLocation;
}

/**
 * Hook to check if has location permission
 */
export function useHasLocationPermission(): boolean {
  const {permissionStatus} = useLocation();
  return permissionStatus === 'granted' || permissionStatus === 'limited';
}

/**
 * Hook to get GPS status
 */
export function useGpsStatus(): 'active' | 'inactive' | 'unavailable' {
  const {gpsStatus} = useLocation();
  return gpsStatus;
}
