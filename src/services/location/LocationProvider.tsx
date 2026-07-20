/**
 * GUIDY - Location Provider
 * React context and hooks for location functionality
 * 
 * Provides:
 * - Location state management via Zustand
 * - Permission handling
 * - GPS tracking with callbacks
 * - Automatic initial location fetch
 */

import React, {createContext, useContext, useEffect, useCallback, useRef} from 'react';
import {useAppState} from '@react-native-community/hooks';
import type {LocationData, PermissionStatus, GpsStatus} from './LocationTypes';
import {LocationErrorCode} from './LocationTypes';
import locationService from './LocationService';
import {requestLocationPermission, getPermissionStatus} from './LocationPermissions';
import {getGpsStatus} from './LocationUtils';
import {useLocationStore} from './useLocationStore';
import {createMovementDetector} from './MovementDetector';

// Debug logging flag - MUST remain true until STAGE 4
const DEBUG_GPS = true;

/**
 * Get current timestamp for logging
 */
const getTimestamp = (): string => {
  const now = new Date();
  return now.toISOString();
};

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
  gpsStatus: GpsStatus;
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
      if (DEBUG_GPS) {
        console.log(`[GPS Provider ${getTimestamp()}] ==============================`);
        console.log(`[GPS Provider ${getTimestamp()}] handleLocationUpdate() CALLED`);
        console.log(`[GPS Provider ${getTimestamp()}] Location received:`, {
          lat: location.latitude.toFixed(6),
          lng: location.longitude.toFixed(6),
          accuracy: location.accuracy,
          speed: location.speed,
          heading: location.heading,
          timestamp: location.timestamp,
        });
        console.log(`[GPS Provider ${getTimestamp()}] Store state before update:`);
        console.log(`[GPS Provider ${getTimestamp()}]   currentLocation: ${store.currentLocation ? 'EXISTS' : 'NULL'}`);
        console.log(`[GPS Provider ${getTimestamp()}]   gpsStatus: ${store.gpsStatus}`);
        console.log(`[GPS Provider ${getTimestamp()}]   isTracking: ${store.isTracking}`);
        console.log(`[GPS Provider ${getTimestamp()}]   error: ${store.error ? JSON.stringify(store.error) : 'NULL'}`);
      }

      // Update previous location
      if (store.currentLocation) {
        if (DEBUG_GPS) {
          console.log(`[GPS Provider ${getTimestamp()}] Storing previous location`);
        }
        store.setPreviousLocation(store.currentLocation);
      }

      // Update current location
      store.setCurrentLocation(location);
      
      if (DEBUG_GPS) {
        console.log(`[GPS Provider ${getTimestamp()}] Updated store.currentLocation`);
      }

      // Update GPS status to active
      const newGpsStatus = getGpsStatus(location);
      store.setGpsStatus(newGpsStatus);
      
      if (DEBUG_GPS) {
        console.log(`[GPS Provider ${getTimestamp()}] Updated store.gpsStatus: ${newGpsStatus}`);
      }

      // Update movement state
      const movementState = movementDetectorRef.current.update(location);
      if (movementState.isMoving !== store.isTracking) {
        if (DEBUG_GPS) {
          console.log(`[GPS Provider ${getTimestamp()}] Updating isTracking: ${movementState.isMoving}`);
        }
        store.setIsTracking(movementState.isMoving);
      }

      // Clear error and update timestamp
      store.setError(null);
      const now = Date.now();
      store.setLastUpdate(now);
      
      if (DEBUG_GPS) {
        console.log(`[GPS Provider ${getTimestamp()}] Cleared error, set lastUpdate: ${now}`);
        console.log(`[GPS Provider ${getTimestamp()}] ==============================`);
      }
    },
    [store],
  );

  // Handle location errors
  const handleLocationError = useCallback(
    (error: {code: string; message: string}) => {
      if (DEBUG_GPS) {
        console.log(`[GPS Provider ${getTimestamp()}] ==============================`);
        console.log(`[GPS Provider ${getTimestamp()}] handleLocationError() CALLED`);
        console.log(`[GPS Provider ${getTimestamp()}] Error:`, JSON.stringify(error));
      }

      const locationError = {
        code: error.code as LocationErrorCode,
        message: error.message,
      };
      store.setError(locationError);
      store.setGpsStatus('unavailable');
      
      if (DEBUG_GPS) {
        console.log(`[GPS Provider ${getTimestamp()}] Updated store.gpsStatus: 'unavailable'`);
      }
      
      if (error.code === LocationErrorCode.PERMISSION_DENIED) {
        store.setPermissionStatus('denied');
        if (DEBUG_GPS) {
          console.log(`[GPS Provider ${getTimestamp()}] Updated store.permissionStatus: 'denied'`);
        }
      }
      
      if (DEBUG_GPS) {
        console.log(`[GPS Provider ${getTimestamp()}] ==============================`);
      }
    },
    [store],
  );

  // Start tracking
  const startTracking = useCallback(() => {
    if (DEBUG_GPS) {
      console.log(`[GPS Provider ${getTimestamp()}] ==============================`);
      console.log(`[GPS Provider ${getTimestamp()}] startTracking() CALLED`);
      console.log(`[GPS Provider ${getTimestamp()}] Current store state:`);
      console.log(`[GPS Provider ${getTimestamp()}]   isTracking: ${store.isTracking}`);
      console.log(`[GPS Provider ${getTimestamp()}]   permissionStatus: ${store.permissionStatus}`);
      console.log(`[GPS Provider ${getTimestamp()}]   gpsStatus: ${store.gpsStatus}`);
    }

    if (store.isTracking) {
      if (DEBUG_GPS) {
        console.log(`[GPS Provider ${getTimestamp()}] Already tracking, returning early`);
        console.log(`[GPS Provider ${getTimestamp()}] ==============================`);
      }
      return;
    }

    if (DEBUG_GPS) {
      console.log(`[GPS Provider ${getTimestamp()}] Setting tracking state...`);
    }

    // Set tracking state
    store.setIsTracking(true);
    
    // Set GPS status to searching while we get first fix
    store.setGpsStatus('searching');
    
    if (DEBUG_GPS) {
      console.log(`[GPS Provider ${getTimestamp()}] Set store.gpsStatus: 'searching'`);
    }
    
    // Clear any previous errors
    store.setError(null);
    if (DEBUG_GPS) {
      console.log(`[GPS Provider ${getTimestamp()}] Cleared previous errors`);
    }

    // Start continuous location updates
    if (DEBUG_GPS) {
      console.log(`[GPS Provider ${getTimestamp()}] Calling locationService.startLocationUpdates()`);
      console.log(`[GPS Provider ${getTimestamp()}] Options:`, {enableHighAccuracy, distanceFilter, interval});
    }
    
    locationService.startLocationUpdates(
      handleLocationUpdate,
      handleLocationError,
      {enableHighAccuracy, distanceFilter, interval},
    );

    // Also request immediate location for faster first fix
    if (DEBUG_GPS) {
      console.log(`[GPS Provider ${getTimestamp()}] Calling locationService.getCurrentLocation() for immediate fix`);
    }
    
    locationService.getCurrentLocation({enableHighAccuracy})
      .then(handleLocationUpdate)
      .catch((error) => {
        if (DEBUG_GPS) {
          console.log(`[GPS Provider ${getTimestamp()}] Immediate location failed:`, JSON.stringify(error));
          console.log(`[GPS Provider ${getTimestamp()}] WatchPosition should still provide location...`);
        }
        // Don't call handleLocationError here - let watchPosition handle it
      });
      
    if (DEBUG_GPS) {
      console.log(`[GPS Provider ${getTimestamp()}] ==============================`);
    }
  }, [store, handleLocationUpdate, handleLocationError, enableHighAccuracy, distanceFilter, interval]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    if (DEBUG_GPS) {
      console.log(`[GPS Provider ${getTimestamp()}] ==============================`);
      console.log(`[GPS Provider ${getTimestamp()}] stopTracking() CALLED`);
    }
    
    locationService.stopLocationUpdates();
    store.setIsTracking(false);
    store.setGpsStatus('inactive');
    
    if (DEBUG_GPS) {
      console.log(`[GPS Provider ${getTimestamp()}] Set store.isTracking: false`);
      console.log(`[GPS Provider ${getTimestamp()}] Set store.gpsStatus: 'inactive'`);
      console.log(`[GPS Provider ${getTimestamp()}] ==============================`);
    }
  }, [store]);

  // Request permission
  const requestPermission = useCallback(async () => {
    if (DEBUG_GPS) {
      console.log(`[GPS Provider ${getTimestamp()}] ==============================`);
      console.log(`[GPS Provider ${getTimestamp()}] requestPermission() CALLED`);
    }
    
    const result = await requestLocationPermission();
    store.setPermissionStatus(result.status);
    
    if (DEBUG_GPS) {
      console.log(`[GPS Provider ${getTimestamp()}] Permission result:`, JSON.stringify(result));
      console.log(`[GPS Provider ${getTimestamp()}] Updated store.permissionStatus: ${result.status}`);
      console.log(`[GPS Provider ${getTimestamp()}] ==============================`);
    }
    
    return {
      granted: result.status === 'granted' || result.status === 'limited',
      status: result.status,
    };
  }, [store]);

  // Refresh location once
  const refreshLocation = useCallback(async () => {
    if (DEBUG_GPS) {
      console.log(`[GPS Provider ${getTimestamp()}] ==============================`);
      console.log(`[GPS Provider ${getTimestamp()}] refreshLocation() CALLED`);
    }
    
    store.setGpsStatus('searching');
    
    if (DEBUG_GPS) {
      console.log(`[GPS Provider ${getTimestamp()}] Set store.gpsStatus: 'searching'`);
    }
    
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
    
    if (DEBUG_GPS) {
      console.log(`[GPS Provider ${getTimestamp()}] ==============================`);
    }
  }, [store, handleLocationUpdate, handleLocationError, enableHighAccuracy]);

  // Check permission on mount
  useEffect(() => {
    const checkPermission = async () => {
      if (DEBUG_GPS) {
        console.log(`[GPS Provider ${getTimestamp()}] ==============================`);
        console.log(`[GPS Provider ${getTimestamp()}] checkPermission() on mount CALLED`);
      }
      const status = await getPermissionStatus();
      store.setPermissionStatus(status);
      
      if (DEBUG_GPS) {
        console.log(`[GPS Provider ${getTimestamp()}] Initial permission status: ${status}`);
        console.log(`[GPS Provider ${getTimestamp()}] Updated store.permissionStatus: ${status}`);
        console.log(`[GPS Provider ${getTimestamp()}] ==============================`);
      }
    };
    checkPermission();
  }, [store]);

  // Handle app state changes
  useEffect(() => {
    if (appState === 'active' && store.permissionStatus === 'granted') {
      if (DEBUG_GPS) {
        console.log(`[GPS Provider ${getTimestamp()}] App state: 'active', permission: 'granted'`);
      }
      // Could refresh location here if needed
    } else if (appState === 'background') {
      if (DEBUG_GPS) {
        console.log(`[GPS Provider ${getTimestamp()}] App state: 'background'`);
      }
      // Continue tracking if needed
    }
  }, [appState, store.permissionStatus]);

  // Cleanup on unmount
  useEffect(() => {
    const detector = movementDetectorRef.current;
    return () => {
      if (DEBUG_GPS) {
        console.log(`[GPS Provider ${getTimestamp()}] ==============================`);
        console.log(`[GPS Provider ${getTimestamp()}] Cleanup on unmount`);
      }
      // Stop location tracking
      locationService.stopLocationUpdates();
      if (detector) {
        detector.reset();
      }
      if (DEBUG_GPS) {
        console.log(`[GPS Provider ${getTimestamp()}] ==============================`);
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
export function useGpsStatus(): GpsStatus {
  const {gpsStatus} = useLocation();
  return gpsStatus;
}
