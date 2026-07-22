/**
 * GUIDY - Location Provider
 * React context and hooks for location functionality
 * 
 * Provides:
 * - Location state management via Zustand
 * - Permission handling
 * - GPS tracking with callbacks
 * - Automatic initial location fetch
 * 
 * STAGE 3.3F: Stabilized with proper selectors and eliminated render loop
 * 
 * ARCHITECTURE CHANGES:
 * - Uses Zustand store actions via refs to avoid dependency loops
 * - Single render on mount (no infinite re-renders)
 * - Proper cleanup on unmount
 * - Context value memoized to prevent unnecessary re-renders
 */

import React, {createContext, useContext, useEffect, useCallback, useRef, useState, useMemo} from 'react';
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

// STAGE 3.3F: Render counter for diagnostics
let renderCounter = 0;

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
 * STAGE 3.3F: Fully stabilized version
 */
export function LocationProvider({
  children,
  enableHighAccuracy = true,
  distanceFilter = 0,
  interval = 5000,
}: LocationProviderProps): React.JSX.Element {
  // STAGE 3.3F: Render counter for diagnostics
  renderCounter++;
  if (DEBUG_GPS && renderCounter <= 5) {
    console.log(`[GPS Provider ${getTimestamp()}] [RENDER] Render #${renderCounter}`);
  }
  
  // STAGE 3.3F: Track if component is mounted to prevent state updates after unmount
  const [isMounted, setIsMounted] = useState(true);
  
  // STAGE 3.3F: Track initial permission check completion
  const permissionCheckRef = useRef(false);
  
  // STAGE 3.3I: Track if startTracking is in progress to prevent concurrent calls
  const isStartingTrackingRef = useRef(false);
  
  const appState = useAppState();
  const movementDetectorRef = useRef(createMovementDetector());

  // STAGE 3.3F: Use refs for store actions to avoid recreating callbacks
  const setCurrentLocationRef = useRef(useLocationStore.getState().setCurrentLocation);
  const setPreviousLocationRef = useRef(useLocationStore.getState().setPreviousLocation);
  const setPermissionStatusRef = useRef(useLocationStore.getState().setPermissionStatus);
  const setGpsStatusRef = useRef(useLocationStore.getState().setGpsStatus);
  const setIsTrackingRef = useRef(useLocationStore.getState().setIsTracking);
  const setErrorRef = useRef(useLocationStore.getState().setError);
  const setLastUpdateRef = useRef(useLocationStore.getState().setLastUpdate);

  // STAGE 3.3F: Cleanup on unmount
  useEffect(() => {
    const detector = movementDetectorRef.current;
    return () => {
      if (DEBUG_GPS) {
        console.log(`[GPS Provider ${getTimestamp()}] [CLEANUP] LocationProvider unmounting`);
      }
      // Mark as not mounted FIRST to prevent callbacks
      setIsMounted(false);
      
      // Stop location tracking on unmount
      locationService.stopLocationUpdates();
      
      // Reset movement detector
      if (detector) {
        detector.reset();
      }
      
      if (DEBUG_GPS) {
        console.log(`[GPS Provider ${getTimestamp()}] [CLEANUP] Cleanup complete`);
      }
    };
  }, []);

  // STAGE 3.3F: Handle location updates using refs
  const handleLocationUpdate = useCallback(
    (location: LocationData) => {
      if (!isMounted) {
        if (DEBUG_GPS) {
          console.log(`[GPS Provider ${getTimestamp()}] [LOCATION] handleLocationUpdate: Component unmounted, ignoring`);
        }
        return;
      }
      
      try {
        if (DEBUG_GPS) {
          console.log(`[GPS Provider ${getTimestamp()}] [LOCATION] handleLocationUpdate() CALLED`);
          console.log(`[GPS Provider ${getTimestamp()}] [LOCATION] Location:`, {
            lat: location.latitude.toFixed(6),
            lng: location.longitude.toFixed(6),
            accuracy: location.accuracy,
          });
        }

        // Get current state using Zustand getState (not subscription)
        const currentState = useLocationStore.getState();
        const currentLocation = currentState.currentLocation;
        const isTracking = currentState.isTracking;

        // Update previous location
        if (currentLocation) {
          setPreviousLocationRef.current(currentLocation);
        }

        // Update current location and timestamp
        setCurrentLocationRef.current(location);
        
        // Update GPS status to active
        const newGpsStatus = getGpsStatus(location);
        setGpsStatusRef.current(newGpsStatus);

        // Update movement state
        const movementState = movementDetectorRef.current.update(location);
        if (movementState.isMoving !== isTracking) {
          setIsTrackingRef.current(movementState.isMoving);
        }

        // Clear error and update timestamp
        setErrorRef.current(null);
        setLastUpdateRef.current(Date.now());
        
        if (DEBUG_GPS) {
          console.log(`[GPS Provider ${getTimestamp()}] [LOCATION] Store updated`);
        }
      } catch (error) {
        if (DEBUG_GPS) {
          console.log(`[GPS Provider ${getTimestamp()}] [LOCATION] Error:`, error);
        }
      }
    },
    [isMounted],
  );

  // STAGE 3.3F: Handle location errors using refs
  const handleLocationError = useCallback(
    (error: {code: string; message: string}) => {
      if (!isMounted) {
        if (DEBUG_GPS) {
          console.log(`[GPS Provider ${getTimestamp()}] [ERROR] handleLocationError: Component unmounted`);
        }
        return;
      }
      
      try {
        if (DEBUG_GPS) {
          console.log(`[GPS Provider ${getTimestamp()}] [ERROR] handleLocationError() CALLED`);
          console.log(`[GPS Provider ${getTimestamp()}] [ERROR] Error:`, JSON.stringify(error));
        }

        const locationError = {
          code: error.code as LocationErrorCode,
          message: error.message,
        };
        setErrorRef.current(locationError);
        setGpsStatusRef.current('unavailable');
        
        if (error.code === LocationErrorCode.PERMISSION_DENIED) {
          setPermissionStatusRef.current('denied');
        }
        
        if (DEBUG_GPS) {
          console.log(`[GPS Provider ${getTimestamp()}] [ERROR] Store updated`);
        }
      } catch (err) {
        if (DEBUG_GPS) {
          console.log(`[GPS Provider ${getTimestamp()}] [ERROR] Error in handler:`, err);
        }
      }
    },
    [isMounted],
  );

  // STAGE 3.3F: Start tracking using refs
  const startTracking = useCallback(() => {
    if (!isMounted) {
      if (DEBUG_GPS) {
        console.log(`[GPS Provider ${getTimestamp()}] [TRACKING] startTracking: Component unmounted`);
      }
      return;
    }
    
    if (DEBUG_GPS) {
      console.log(`[GPS Provider ${getTimestamp()}] [TRACKING] startTracking() CALLED`);
    }

    // STAGE 3.3I: Prevent concurrent calls using ref
    if (isStartingTrackingRef.current) {
      if (DEBUG_GPS) {
        console.log(`[GPS Provider ${getTimestamp()}] [TRACKING] Already starting tracking, returning early`);
      }
      return;
    }

    // Get current state
    const currentState = useLocationStore.getState();
    
    if (currentState.isTracking) {
      if (DEBUG_GPS) {
        console.log(`[GPS Provider ${getTimestamp()}] [TRACKING] Already tracking, returning early`);
      }
      return;
    }

    // STAGE 3.3I: Mark as starting BEFORE setting state
    isStartingTrackingRef.current = true;

    if (DEBUG_GPS) {
      console.log(`[GPS Provider ${getTimestamp()}] [TRACKING] Setting tracking state...`);
    }

    // Set tracking state
    setIsTrackingRef.current(true);
    setGpsStatusRef.current('searching');
    setErrorRef.current(null);

    // Start continuous location updates
    if (DEBUG_GPS) {
      console.log(`[GPS Provider ${getTimestamp()}] [TRACKING] Starting location updates with:`, {
        enableHighAccuracy,
        distanceFilter,
        interval,
      });
    }
    
    try {
      locationService.startLocationUpdates(
        handleLocationUpdate,
        handleLocationError,
        {enableHighAccuracy, distanceFilter, interval},
      );
    } catch (error) {
      if (DEBUG_GPS) {
        console.log(`[GPS Provider ${getTimestamp()}] [TRACKING] Error starting updates:`, error);
      }
      // STAGE 3.3I: Reset flag on error
      isStartingTrackingRef.current = false;
    }
      
    if (DEBUG_GPS) {
      console.log(`[GPS Provider ${getTimestamp()}] [TRACKING] startTracking() complete`);
    }
  }, [handleLocationUpdate, handleLocationError, enableHighAccuracy, distanceFilter, interval, isMounted, isStartingTrackingRef]);

  // STAGE 3.3F: Stop tracking
  const stopTracking = useCallback(() => {
    if (DEBUG_GPS) {
      console.log(`[GPS Provider ${getTimestamp()}] [TRACKING] stopTracking() CALLED`);
    }
    
    locationService.stopLocationUpdates();
    setIsTrackingRef.current(false);
    setGpsStatusRef.current('inactive');
    
    // STAGE 3.3I: Reset starting tracking flag
    isStartingTrackingRef.current = false;
    
    if (DEBUG_GPS) {
      console.log(`[GPS Provider ${getTimestamp()}] [TRACKING] stopTracking() complete`);
    }
  }, []);

  // STAGE 3.3F: Request permission
  const requestPermission = useCallback(async () => {
    if (DEBUG_GPS) {
      console.log(`[GPS Provider ${getTimestamp()}] [PERMISSION] requestPermission() CALLED`);
    }
    
    const result = await requestLocationPermission();
    setPermissionStatusRef.current(result.status);
    
    if (DEBUG_GPS) {
      console.log(`[GPS Provider ${getTimestamp()}] [PERMISSION] Result:`, JSON.stringify(result));
    }
    
    return {
      granted: result.status === 'granted' || result.status === 'limited',
      status: result.status,
    };
  }, []);

  // STAGE 3.3F: Refresh location once
  const refreshLocation = useCallback(async () => {
    if (DEBUG_GPS) {
      console.log(`[GPS Provider ${getTimestamp()}] [REFRESH] refreshLocation() CALLED`);
    }
    
    setGpsStatusRef.current('searching');
    
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
      console.log(`[GPS Provider ${getTimestamp()}] [REFRESH] refreshLocation() complete`);
    }
  }, [handleLocationUpdate, handleLocationError, enableHighAccuracy]);

  // STAGE 3.3F: Check permission on mount - runs ONLY ONCE
  useEffect(() => {
    // Prevent multiple executions
    if (permissionCheckRef.current) {
      return;
    }
    permissionCheckRef.current = true;
    
    const checkPermission = async () => {
      // Check mounted state using ref (not stale closure)
      if (!isMounted) {
        return;
      }
      
      if (DEBUG_GPS) {
        console.log(`[GPS Provider ${getTimestamp()}] [PERMISSION] checkPermission() on mount CALLED`);
      }
      const status = await getPermissionStatus();
      
      // Check mounted state again after async
      if (!isMounted) {
        return;
      }
      
      setPermissionStatusRef.current(status);
      
      if (DEBUG_GPS) {
        console.log(`[GPS Provider ${getTimestamp()}] [PERMISSION] Initial status: ${status}`);
        console.log(`[GPS Provider ${getTimestamp()}] [PERMISSION] checkPermission() complete`);
      }
    };
    
    checkPermission();
    // STAGE 3.3F: Empty deps = runs only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty - should only run on mount

  // STAGE 3.3F: Handle app state changes
  useEffect(() => {
    if (DEBUG_GPS) {
      console.log(`[GPS Provider ${getTimestamp()}] [APP_STATE] App state changed: ${appState}`);
    }
    
    if (appState === 'active') {
      // Could refresh location here if needed
    }
  }, [appState]);

  // STAGE 3.3F: Use individual selectors instead of full store subscription
  const currentLocation = useLocationStore(state => state.currentLocation);
  const previousLocation = useLocationStore(state => state.previousLocation);
  const permissionStatus = useLocationStore(state => state.permissionStatus);
  const gpsStatus = useLocationStore(state => state.gpsStatus);
  const isTracking = useLocationStore(state => state.isTracking);
  const error = useLocationStore(state => state.error);
  const lastUpdate = useLocationStore(state => state.lastUpdate);

  // STAGE 3.3F: Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<LocationContextValue>(() => ({
    currentLocation,
    previousLocation,
    permissionStatus,
    gpsStatus,
    isTracking,
    isMoving: isTracking,
    error,
    lastUpdate,
    requestPermission,
    startTracking,
    stopTracking,
    refreshLocation,
  }), [
    currentLocation,
    previousLocation,
    permissionStatus,
    gpsStatus,
    isTracking,
    error,
    lastUpdate,
    requestPermission,
    startTracking,
    stopTracking,
    refreshLocation,
  ]);

  if (DEBUG_GPS && renderCounter <= 5) {
    console.log(`[GPS Provider ${getTimestamp()}] [RENDER] Render #${renderCounter} complete`);
  }

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
