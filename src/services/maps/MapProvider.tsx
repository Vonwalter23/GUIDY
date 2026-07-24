/**
 * GUIDY - Map Provider
 * React context and hooks for map functionality
 * 
 * STAGE 4.1 CERTIFIED BASE
 * Recovery from Stage 4.4H - Removed debug logs
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import type {MapRegion, MapCoordinate, MapMarker} from './MapTypes';
import {DEFAULT_REGION, DEFAULT_MAP_STYLE} from './MapConstants';
import {mapService} from './MapService';
import {isValidCoordinate} from './MapUtils';
import {useLocation} from '../location';

// Context types
interface MapContextValue {
  region: MapRegion;
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  mapType: 'standard' | 'satellite' | 'hybrid';
  isFollowingUser: boolean;
  userMarker: MapMarker | null;
  setRegion: (region: MapRegion) => void;
  centerOnUser: () => void;
  centerOnCoordinate: (coordinate: MapCoordinate, delta?: number) => void;
  setMapType: (type: 'standard' | 'satellite' | 'hybrid') => void;
  toggleFollowMode: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetToDefault: () => void;
}

/**
 * Map Provider Props
 */
interface MapProviderProps {
  children: React.ReactNode;
  enableFollowOnLocationUpdate?: boolean;
  defaultDelta?: number;
}

// Context
const MapContext = createContext<MapContextValue | undefined>(undefined);

// Provider component
export function MapProvider({
  children,
  enableFollowOnLocationUpdate = true,
  defaultDelta = 0.005,
}: MapProviderProps) {
  // Local state
  const [region, setRegionState] = useState<MapRegion>(DEFAULT_REGION);
  const [isReady, setIsReady] = useState(false);
  const [isLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapType, setMapTypeState] = useState<'standard' | 'satellite' | 'hybrid'>(
    DEFAULT_MAP_STYLE.mapType as 'standard' | 'satellite' | 'hybrid',
  );
  const [isFollowingUser, setIsFollowingUser] = useState(true);
  const [userMarker, setUserMarker] = useState<MapMarker | null>(null);

  // Location from Location Engine
  const location = useLocation();
  const currentLocation = location?.currentLocation;

  // Track previous location to prevent unnecessary updates
  const previousLocationRef = useRef<MapCoordinate | null>(null);

  // Update region when location changes
  useEffect(() => {
    if (currentLocation && isFollowingUser && enableFollowOnLocationUpdate) {
      const newCoordinate: MapCoordinate = {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      };

      // Check if location has changed significantly
      const prev = previousLocationRef.current;
      if (prev) {
        const distance = Math.sqrt(
          Math.pow(newCoordinate.latitude - prev.latitude, 2) +
            Math.pow(newCoordinate.longitude - prev.longitude, 2),
        );
        // Only update if moved more than ~5 meters
        if (distance < 0.00005) {
          return;
        }
      }

      previousLocationRef.current = newCoordinate;

      // Update user marker
      setUserMarker({
        id: 'user-location',
        coordinate: newCoordinate,
        title: 'Tu ubicación',
      });

      // Center on new location
      setRegionState({
        ...newCoordinate,
        latitudeDelta: defaultDelta,
        longitudeDelta: defaultDelta,
      });

      // Update map service
      mapService.updateUserLocation(newCoordinate);
    }
  }, [currentLocation, isFollowingUser, enableFollowOnLocationUpdate, defaultDelta]);

  // Set region
  const setRegion = useCallback((newRegion: MapRegion) => {
    setRegionState(newRegion);
    mapService.setRegion(newRegion);
  }, []);

  // Center on user location
  const centerOnUser = useCallback(() => {
    if (currentLocation) {
      const coordinate: MapCoordinate = {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      };
      setRegionState({
        ...coordinate,
        latitudeDelta: defaultDelta,
        longitudeDelta: defaultDelta,
      });
      setIsFollowingUser(true);
      mapService.startFollowing();
    }
  }, [currentLocation, defaultDelta]);

  // Center on specific coordinate
  const centerOnCoordinate = useCallback(
    (coordinate: MapCoordinate, delta?: number) => {
      if (!isValidCoordinate(coordinate)) {
        setError('Coordenada inválida');
        return;
      }
      setError(null);
      const newRegion: MapRegion = {
        ...coordinate,
        latitudeDelta: delta ?? defaultDelta,
        longitudeDelta: delta ?? defaultDelta,
      };
      setRegionState(newRegion);
      mapService.centerOnCoordinate(coordinate, delta ?? defaultDelta);
    },
    [defaultDelta],
  );

  // Set map type
  const setMapType = useCallback(
    (type: 'standard' | 'satellite' | 'hybrid') => {
      setMapTypeState(type);
      mapService.setMapType(type);
    },
    [],
  );

  // Toggle follow mode
  const toggleFollowMode = useCallback(() => {
    setIsFollowingUser(prev => {
      const newValue = !prev;
      if (newValue) {
        mapService.startFollowing();
      } else {
        mapService.stopFollowing();
      }
      return newValue;
    });
  }, []);

  // Zoom in
  const zoomIn = useCallback(() => {
    const newRegion = mapService.zoomIn();
    setRegionState({...newRegion});
  }, []);

  // Zoom out
  const zoomOut = useCallback(() => {
    const newRegion = mapService.zoomOut();
    setRegionState({...newRegion});
  }, []);

  // Reset to default
  const resetToDefault = useCallback(() => {
    setRegionState(DEFAULT_REGION);
    mapService.resetToDefault();
  }, []);

  // Mark as ready
  useEffect(() => {
    setIsReady(true);
  }, []);

  // Context value
  const contextValue: MapContextValue = useMemo(
    () => ({
      region,
      isReady,
      isLoading,
      error,
      mapType,
      isFollowingUser,
      userMarker,
      setRegion,
      centerOnUser,
      centerOnCoordinate,
      setMapType,
      toggleFollowMode,
      zoomIn,
      zoomOut,
      resetToDefault,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      region,
      isReady,
      error,
      mapType,
      isFollowingUser,
      userMarker,
      setRegion,
      centerOnUser,
      centerOnCoordinate,
      setMapType,
      toggleFollowMode,
      zoomIn,
      zoomOut,
      resetToDefault,
    ],
  );

  return (
    <MapContext.Provider value={contextValue}>{children}</MapContext.Provider>
  );
}

/**
 * Hook to access map context
 */
export function useMap(): MapContextValue {
  const context = useContext(MapContext);
  if (context === undefined) {
    throw new Error('useMap must be used within a MapProvider');
  }
  return context;
}

/**
 * Hook to get current region
 */
export function useMapRegion() {
  const {region} = useMap();
  return region;
}

/**
 * Hook to check if following user
 */
export function useIsFollowingUser() {
  const {isFollowingUser} = useMap();
  return isFollowingUser;
}

/**
 * Hook to get user marker
 */
export function useUserMarker() {
  const {userMarker} = useMap();
  return userMarker;
}
