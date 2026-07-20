/**
 * GUIDY - Location Types
 * Type definitions for location-related data structures
 */

/**
 * Geographic coordinates
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
  altitude?: number | null;
}

/**
 * Full location data including accuracy and speed
 */
export interface LocationData extends Coordinates {
  accuracy: number;
  altitudeAccuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  timestamp: number;
}

/**
 * Location permission status
 */
export type PermissionStatus =
  | 'granted'
  | 'denied'
  | 'blocked'
  | 'limited'
  | 'unavailable';

/**
 * Permission result from the system
 */
export interface PermissionResult {
  status: PermissionStatus;
  canAskAgain: boolean;
}

/**
 * GPS status indicator
 */
export type GpsStatus = 'active' | 'inactive' | 'unavailable';

/**
 * Movement state
 */
export interface MovementState {
  isMoving: boolean;
  speed: number | null;
  heading: number | null;
  lastMovementTimestamp: number | null;
}

/**
 * Location update callback
 */
export type LocationUpdateCallback = (location: LocationData) => void;

/**
 * Location error callback
 */
export type LocationErrorCallback = (error: LocationError) => void;

/**
 * Location error types
 */
export interface LocationError {
  code: LocationErrorCode;
  message: string;
}

/**
 * Location error codes
 */
export enum LocationErrorCode {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  POSITION_UNAVAILABLE = 'POSITION_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Location options for requesting updates
 */
export interface LocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  distanceFilter?: number;
  interval?: number;
  fastestInterval?: number;
  smallestDisplacement?: number;
}

/**
 * Default location options
 */
export const DEFAULT_LOCATION_OPTIONS: LocationOptions = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 10000,
  distanceFilter: 0,
  interval: 5000,
  fastestInterval: 2000,
  smallestDisplacement: 0,
};

/**
 * Location service state for Zustand
 */
export interface LocationState {
  currentLocation: LocationData | null;
  previousLocation: LocationData | null;
  permissionStatus: PermissionStatus;
  gpsStatus: GpsStatus;
  isTracking: boolean;
  lastUpdate: number | null;
  error: LocationError | null;
}

/**
 * Location service actions for Zustand
 */
export interface LocationActions {
  setCurrentLocation: (location: LocationData) => void;
  setPreviousLocation: (location: LocationData) => void;
  setPermissionStatus: (status: PermissionStatus) => void;
  setGpsStatus: (status: GpsStatus) => void;
  setIsTracking: (isTracking: boolean) => void;
  setError: (error: LocationError | null) => void;
  setLastUpdate: (timestamp: number | null) => void;
  reset: () => void;
}

/**
 * Location service full store type
 */
export type LocationStore = LocationState & LocationActions;
