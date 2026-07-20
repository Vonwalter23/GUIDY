/**
 * GUIDY - Map Types
 * Type definitions for map-related data structures
 */

/**
 * Geographic coordinates for map
 */
export interface MapCoordinate {
  latitude: number;
  longitude: number;
}

/**
 * Map region (viewport)
 */
export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

/**
 * Map marker configuration
 */
export interface MapMarker {
  id: string;
  coordinate: MapCoordinate;
  title?: string;
  description?: string;
  pinColor?: string;
}

/**
 * Map camera configuration
 */
export interface MapCamera {
  center: MapCoordinate;
  zoom: number;
  heading?: number;
  pitch?: number;
}

/**
 * Map style configuration
 */
export interface MapStyle {
  mapType?: 'standard' | 'satellite' | 'hybrid';
  showsUserLocation: boolean;
  showsMyLocationButton: boolean;
  showsCompass: boolean;
  showsScale: boolean;
  showsZoomControls: boolean;
}

/**
 * Map provider types
 */
export type MapProvider = 'openstreetmap' | 'google' | 'custom';

/**
 * Tile provider configuration
 */
export interface TileProvider {
  url: string;
  attribution?: string;
  minZoom?: number;
  maxZoom?: number;
}

/**
 * Map events
 */
export interface MapEvent {
  nativeEvent: {
    coordinate?: MapCoordinate;
    position?: {
      x: number;
      y: number;
    };
  };
}

/**
 * User location marker config
 */
export interface UserLocationMarkerConfig {
  showsHeadingIndicator: boolean;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  icon?: number;
}

/**
 * Map state for store
 */
export interface MapState {
  region: MapRegion;
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  mapType: 'standard' | 'satellite' | 'hybrid';
}

/**
 * Map actions for store
 */
export interface MapActions {
  setRegion: (region: MapRegion) => void;
  setIsReady: (ready: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setMapType: (type: 'standard' | 'satellite' | 'hybrid') => void;
  centerOnUser: (coordinate: MapCoordinate) => void;
  reset: () => void;
}

/**
 * Map store type
 */
export type MapStore = MapState & MapActions;

/**
 * Map bounds
 */
export interface MapBounds {
  northEast: MapCoordinate;
  southWest: MapCoordinate;
}

/**
 * Panning state
 */
export interface PanState {
  isPanning: boolean;
  startCoordinate: MapCoordinate | null;
  currentCoordinate: MapCoordinate | null;
}
