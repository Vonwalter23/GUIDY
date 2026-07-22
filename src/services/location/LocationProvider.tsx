/**
 * GUIDY - Location Provider
 * React context and hooks for location functionality
 * 
 * STAGE 3.4B: Architectural Rebuild
 * Uses LocationStateMachine as single source of truth
 */

import React, {createContext, useContext, useEffect, useCallback, useRef, useMemo} from 'react';
import {useAppState} from '@react-native-community/hooks';
import type {LocationData, PermissionStatus} from './LocationTypes';
import locationService from './LocationService';
import {requestLocationPermission, getPermissionStatus} from './LocationPermissions';
import {useLocationStore} from './useLocationStore';
import {
  LocationEngineState,
  LocationEvent,
  locationStateMachine,
} from './LocationStateMachine';

const DEBUG_GPS = true;
const log = (message: string, ...data: unknown[]): void => {
  if (DEBUG_GPS) {
    console.log(`[LOCATION PROVIDER ${new Date().toISOString()}] ${message}`, ...data);
  }
};

interface LocationProviderProps {
  children: React.ReactNode;
  enableHighAccuracy?: boolean;
  distanceFilter?: number;
  interval?: number;
}

interface LocationContextValue {
  currentLocation: LocationData | null;
  permissionStatus: PermissionStatus;
  gpsStatus: 'unavailable' | 'inactive' | 'searching' | 'active';
  isTracking: boolean;
  error: {code: string; message: string} | null;
  lastUpdate: number | null;
  engineState: LocationEngineState;
  requestPermission: () => Promise<{granted: boolean; status: string}>;
  startTracking: () => void;
  stopTracking: () => void;
}

const LocationContext = createContext<LocationContextValue | null>(null);

const defaultContextValue: LocationContextValue = {
  currentLocation: null,
  permissionStatus: 'denied',
  gpsStatus: 'unavailable',
  isTracking: false,
  error: null,
  lastUpdate: null,
  engineState: LocationEngineState.IDLE,
  requestPermission: async () => ({granted: false, status: 'denied'}),
  startTracking: () => {},
  stopTracking: () => {},
};

export function LocationProvider({
  children,
  enableHighAccuracy = true,
  distanceFilter = 0,
  interval = 5000,
}: LocationProviderProps): React.JSX.Element {
  log('[INIT] LocationProvider mounting');
  
  const isMountedRef = useRef(true);
  const isStartingTrackingRef = useRef(false);
  const lastLocationTimestampRef = useRef(0);
  
  const appState = useAppState();

  const setPermissionStatus = useLocationStore(state => state.setPermissionStatus);
  const setCurrentLocation = useLocationStore(state => state.setCurrentLocation);
  const setPreviousLocation = useLocationStore(state => state.setPreviousLocation);
  const setEngineState = useLocationStore(state => state.setEngineState);
  const setLastUpdate = useLocationStore(state => state.setLastUpdate);
  
  const storePermissionStatus = useLocationStore(state => state.permissionStatus);
  const storeLastUpdate = useLocationStore(state => state.lastUpdate);

  const handleLocationUpdate = useCallback((location: LocationData) => {
    if (!isMountedRef.current) {
      log('[LOCATION] Ignoring - not mounted');
      return;
    }
    
    const locationTimestamp = location.timestamp || 0;
    if (locationTimestamp > 0 && locationTimestamp === lastLocationTimestampRef.current) {
      log('[LOCATION] Duplicate location ignored');
      return;
    }
    lastLocationTimestampRef.current = locationTimestamp;
    
    log('[LOCATION] Update:', {
      lat: location.latitude.toFixed(6),
      lng: location.longitude.toFixed(6),
      accuracy: location.accuracy,
    });
    
    const currentLoc = locationStateMachine.getCurrentLocation();
    if (currentLoc) {
      setPreviousLocation(currentLoc);
    }
    
    locationStateMachine.handleLocationUpdate(location);
    setCurrentLocation(location);
    setLastUpdate(Date.now());
    
    if (locationStateMachine.getState() === LocationEngineState.STARTING_LOCATION) {
      log('[LOCATION] First fix - transitioning to TRACKING');
      locationStateMachine.sendEvent(LocationEvent.FIRST_LOCATION_RECEIVED);
    }
    
    log('[LOCATION] State:', locationStateMachine.getState());
  }, [setCurrentLocation, setPreviousLocation, setLastUpdate]);

  const handleLocationError = useCallback((error: {code: string; message: string}) => {
    if (!isMountedRef.current) {
      log('[ERROR] Ignoring - not mounted');
      return;
    }
    
    log('[ERROR]', error);
    locationStateMachine.handleError(error);
    locationStateMachine.sendEvent(LocationEvent.ERROR, {error});
  }, []);

  const startTracking = useCallback(() => {
    log('[TRACKING] startTracking called, state:', locationStateMachine.getState());
    
    if (!isMountedRef.current) {
      log('[TRACKING] Ignoring - not mounted');
      return;
    }
    
    if (isStartingTrackingRef.current) {
      log('[TRACKING] Already starting, ignoring');
      return;
    }
    
    if (locationStateMachine.getState() === LocationEngineState.TRACKING) {
      log('[TRACKING] Already tracking');
      return;
    }
    
    isStartingTrackingRef.current = true;
    locationStateMachine.sendEvent(LocationEvent.START_TRACKING);
    
    locationService.startLocationUpdates(
      handleLocationUpdate,
      handleLocationError,
      {enableHighAccuracy, distanceFilter, interval},
    );
    
    isStartingTrackingRef.current = false;
    log('[TRACKING] Started');
  }, [handleLocationUpdate, handleLocationError, enableHighAccuracy, distanceFilter, interval]);

  const stopTracking = useCallback(() => {
    log('[TRACKING] stopTracking called');
    locationService.stopLocationUpdates();
    locationStateMachine.sendEvent(LocationEvent.STOP_TRACKING);
    log('[TRACKING] Stopped');
  }, []);

  const requestPermission = useCallback(async () => {
    log('[PERMISSION] requestPermission called');
    locationStateMachine.sendEvent(LocationEvent.REQUEST_PERMISSION);
    
    const result = await requestLocationPermission();
    setPermissionStatus(result.status);
    log('[PERMISSION] Result:', result.status);
    
    return {
      granted: result.status === 'granted' || result.status === 'limited',
      status: result.status,
    };
  }, [setPermissionStatus]);

  useEffect(() => {
    return () => {
      log('[CLEANUP] Provider unmounting');
      isMountedRef.current = false;
      locationService.stopLocationUpdates();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = locationStateMachine.onStateChange((state, prevState) => {
      log(`[STATE] ${prevState} -> ${state}`);
      setEngineState(state);
    });
    return unsubscribe;
  }, [setEngineState]);

  useEffect(() => {
    const checkPermission = async () => {
      const status = await getPermissionStatus();
      setPermissionStatus(status);
      log('[PERMISSION] Initial status:', status);
    };
    checkPermission();
  }, [setPermissionStatus]);

  useEffect(() => {
    log('[APP_STATE] App state:', appState);
  }, [appState]);

  const engineState = useLocationStore.getState().engineState;

  const contextValue = useMemo<LocationContextValue>(() => {
    // Compute GPS status from engine state
    const computeGpsStatus = (): 'unavailable' | 'inactive' | 'searching' | 'active' => {
      switch (engineState) {
        case LocationEngineState.TRACKING:
          return 'active';
        case LocationEngineState.WAITING_FIRST_FIX:
        case LocationEngineState.STARTING_LOCATION:
          return 'searching';
        case LocationEngineState.STOPPED:
        case LocationEngineState.PAUSED:
        case LocationEngineState.PERMISSION_GRANTED:
          return 'inactive';
        default:
          return 'unavailable';
      }
    };
    
    return {
      currentLocation: locationStateMachine.getCurrentLocation(),
      permissionStatus: storePermissionStatus,
      gpsStatus: computeGpsStatus(),
      isTracking: locationStateMachine.isTracking(),
      error: locationStateMachine.getError(),
      lastUpdate: storeLastUpdate,
      engineState,
      requestPermission,
      startTracking,
      stopTracking,
    };
  }, [
    storePermissionStatus,
    storeLastUpdate,
    engineState,
    requestPermission,
    startTracking,
    stopTracking,
  ]);

  log('[RENDER] Provider render, state:', engineState);

  return (
    <LocationContext.Provider value={contextValue}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation(): LocationContextValue {
  const context = useContext(LocationContext);
  if (!context) {
    console.warn('useLocation must be used within a LocationProvider');
    return defaultContextValue;
  }
  return context;
}

export function useCurrentLocation(): LocationData | null {
  const {currentLocation} = useLocation();
  return currentLocation;
}

export function useHasLocationPermission(): boolean {
  const {permissionStatus} = useLocation();
  return permissionStatus === 'granted' || permissionStatus === 'limited';
}

export function useGpsStatus(): 'unavailable' | 'inactive' | 'searching' | 'active' {
  const {gpsStatus} = useLocation();
  return gpsStatus;
}

export default useLocation;
