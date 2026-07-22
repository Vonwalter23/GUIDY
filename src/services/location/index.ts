/**
 * GUIDY - Location Service Module
 * Complete location engine for Guidy
 */

// Types
export * from './LocationTypes';

// Permissions
export {
  requestLocationPermission,
  hasLocationPermission,
  getPermissionStatus,
  openAppSettings,
  showPermissionRationale,
  showPermissionDeniedAlert,
  handlePermissionResult,
} from './LocationPermissions';

// Utilities
export {
  formatLatitude,
  formatLongitude,
  formatCoordinates,
  formatAccuracy,
  formatSpeed,
  formatLastUpdate,
  getGpsStatus,
  isValidLocation,
  getAccuracyLevel,
  isValidCoordinate,
} from './LocationUtils';

// Distance Calculator
export {
  calculateDistance,
  calculateDistanceMeters,
  calculateDistanceKilometers,
  calculateDistanceMiles,
  calculateBearing,
  getCardinalDirection,
  calculateMidpoint,
  formatDistance,
  isWithinRadius,
  toRadians,
  toDegrees,
} from './DistanceCalculator';

// Movement Detector
export {MovementDetector, createMovementDetector} from './MovementDetector';
export type {MovementDetectorConfig} from './MovementDetector';

// Location Service
export {locationService, LocationService} from './LocationService';

// Location Provider (React Context)
export {
  LocationProvider,
  useLocation,
  useCurrentLocation,
  useHasLocationPermission,
  useGpsStatus,
} from './LocationProvider';

// Zustand Store
export {
  useLocationStore,
  useCurrentLocation as useStoreCurrentLocation,
  usePermissionStatus as useStorePermissionStatus,
  useGpsStatus as useStoreGpsStatus,
  useIsTracking as useStoreIsTracking,
  useLastUpdate as useStoreLastUpdate,
  useLocationError as useStoreError,
  useEngineState,
} from './useLocationStore';

// Location State Machine
export {
  LocationEngineState,
  LocationEvent,
  locationStateMachine,
} from './LocationStateMachine';
