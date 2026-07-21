/**
 * GUIDY - Location Service
 * Main service for handling location operations
 * 
 * IMPORTANT: This file now uses FusedLocationProvider (Native Module)
 * which internally uses Android's FusedLocationProviderClient via Google Play Services.
 * 
 * The native module handles:
 * - Permission requests
 * - getCurrentLocation (single location with timeout)
 * - requestLocationUpdates (continuous tracking)
 * - Error handling
 * 
 * This provides optimal GPS performance on Android.
 */

import type {
  LocationData,
  LocationOptions,
  LocationUpdateCallback,
  LocationErrorCallback,
  LocationError,
} from './LocationTypes';
import {LocationErrorCode} from './LocationTypes';
import {DEFAULT_LOCATION_OPTIONS} from './LocationTypes';
import {hasLocationPermission, requestLocationPermission} from './LocationPermissions';
import {isValidLocation} from './LocationUtils';
import {fusedLocationProvider} from './FusedLocationProvider';

// Debug logging flag - MUST remain true until STAGE 4
const DEBUG_GPS = true;

const getTimestamp = (): string => new Date().toISOString();

/**
 * Convert native error to LocationError
 */
function toLocationError(code: string, message: string): LocationError {
  let errorCode: LocationErrorCode;
  let errorMsg = message;

  switch (code) {
    case 'PERMISSION_DENIED':
      errorCode = LocationErrorCode.PERMISSION_DENIED;
      errorMsg = 'Permiso de ubicación denegado';
      break;
    case 'LOCATION_UNAVAILABLE':
      errorCode = LocationErrorCode.POSITION_UNAVAILABLE;
      errorMsg = 'Ubicación no disponible. Verifique que el GPS esté activado.';
      break;
    case 'TIMEOUT':
      errorCode = LocationErrorCode.TIMEOUT;
      errorMsg = 'Tiempo de espera de ubicación agotado. Intente nuevamente.';
      break;
    default:
      errorCode = LocationErrorCode.UNKNOWN;
  }

  if (DEBUG_GPS) {
    console.log(`[GPS ${getTimestamp()}] ERROR - Code: ${errorCode}, Message: "${errorMsg}"`);
  }

  return {code: errorCode, message: errorMsg};
}

/**
 * LocationService class
 * Provides high-level location functionality using FusedLocationProviderClient
 */
class LocationService {
  private isTracking = false;
  private currentOptions: LocationOptions = DEFAULT_LOCATION_OPTIONS;
  private startTime = 0;

  /**
   * Get current location once
   */
  async getCurrentLocation(
    options: Partial<LocationOptions> = {},
  ): Promise<LocationData> {
    if (DEBUG_GPS) {
      console.log(`[GPS ${getTimestamp()}] ========================================`);
      console.log(`[GPS ${getTimestamp()}] getCurrentLocation() CALLED`);
      console.log(`[GPS ${getTimestamp()}] Provider: FusedLocationProviderClient`);
      console.log(`[GPS ${getTimestamp()}] Options:`, JSON.stringify(options));
    }

    const mergedOptions = {...this.currentOptions, ...options};
    this.currentOptions = mergedOptions;

    // Check permission first
    const hasPermission = await hasLocationPermission();

    if (DEBUG_GPS) {
      console.log(`[GPS ${getTimestamp()}] hasPermission: ${hasPermission}`);
    }

    if (!hasPermission) {
      const result = await requestLocationPermission();
      if (result.status !== 'granted' && result.status !== 'limited') {
        if (DEBUG_GPS) {
          console.log(`[GPS ${getTimestamp()}] Permission DENIED`);
        }
        throw {code: LocationErrorCode.PERMISSION_DENIED, message: 'Permiso de ubicación denegado'};
      }
    }

    this.startTime = Date.now();

    try {
      if (DEBUG_GPS) {
        console.log(`[GPS ${getTimestamp()}] Requesting location via FusedLocationProvider...`);
      }

      const location = await fusedLocationProvider.getCurrentLocation({
        enableHighAccuracy: mergedOptions.enableHighAccuracy ?? true,
        timeout: mergedOptions.timeout ?? 15000,
      });

      const elapsed = Date.now() - this.startTime;

      if (DEBUG_GPS) {
        console.log(`[GPS ${getTimestamp()}] ========================================`);
        console.log(`[GPS ${getTimestamp()}] getCurrentLocation SUCCESS`);
        console.log(`[GPS ${getTimestamp()}] Time to first fix: ${elapsed}ms`);
        console.log(`[GPS ${getTimestamp()}] Coordinates:`, {
          lat: location.latitude.toFixed(6),
          lng: location.longitude.toFixed(6),
          accuracy: location.accuracy,
          provider: location.provider,
        });
        console.log(`[GPS ${getTimestamp()}] isValid: ${isValidLocation(location)}`);
        console.log(`[GPS ${getTimestamp()}] ========================================`);
      }

      if (isValidLocation(location)) {
        return location;
      } else {
        throw {code: LocationErrorCode.UNKNOWN, message: 'Ubicación inválida'};
      }
    } catch (error) {
      const err = error as {code?: string; message?: string};
      if (DEBUG_GPS) {
        console.log(`[GPS ${getTimestamp()}] getCurrentLocation ERROR:`, err.message);
      }
      throw toLocationError(err.code || 'UNKNOWN', err.message || 'Unknown error');
    }
  }

  /**
   * Start continuous location updates
   */
  startLocationUpdates(
    onSuccess: LocationUpdateCallback,
    onError: LocationErrorCallback,
    options: Partial<LocationOptions> = {},
  ): void {
    if (this.isTracking) {
      if (DEBUG_GPS) {
        console.log(`[GPS ${getTimestamp()}] Already tracking, skipping...`);
      }
      return;
    }

    if (DEBUG_GPS) {
      console.log(`[GPS ${getTimestamp()}] ========================================`);
      console.log(`[GPS ${getTimestamp()}] startLocationUpdates() CALLED`);
      console.log(`[GPS ${getTimestamp()}] Provider: FusedLocationProviderClient`);
      console.log(`[GPS ${getTimestamp()}] ========================================`);
    }

    const mergedOptions = {...this.currentOptions, ...options};
    this.currentOptions = mergedOptions;
    this.startTime = Date.now();

    hasLocationPermission()
      .then(hasPermission => {
        if (!hasPermission) {
          return requestLocationPermission();
        }
        return {status: 'granted' as const, canAskAgain: true};
      })
      .then(result => {
        if (result.status !== 'granted' && result.status !== 'limited') {
          if (DEBUG_GPS) {
            console.log(`[GPS ${getTimestamp()}] Permission NOT granted`);
          }
          onError({code: LocationErrorCode.PERMISSION_DENIED, message: 'Permiso de ubicación denegado'});
          return;
        }

        if (DEBUG_GPS) {
          console.log(`[GPS ${getTimestamp()}] Starting location updates via FusedLocationProvider...`);
        }

        fusedLocationProvider.startLocationUpdates(
          {
            enableHighAccuracy: mergedOptions.enableHighAccuracy ?? true,
            interval: mergedOptions.interval ?? 5000,
            fastestInterval: mergedOptions.fastestInterval ?? 2000,
            distanceFilter: mergedOptions.distanceFilter ?? 0,
          },
          (location: LocationData) => {
            const elapsed = Date.now() - this.startTime;
            this.isTracking = true;

            if (DEBUG_GPS) {
              console.log(`[GPS ${getTimestamp()}] Location update: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)} (${elapsed}ms)`);
            }

            if (isValidLocation(location)) {
              onSuccess(location);
            }
          },
          (code: string, message: string) => {
            if (DEBUG_GPS) {
              console.log(`[GPS ${getTimestamp()}] Location error: ${code} - ${message}`);
            }
            onError(toLocationError(code, message));
          },
        );

        this.isTracking = true;

        if (DEBUG_GPS) {
          console.log(`[GPS ${getTimestamp()}] Tracking started`);
        }
      })
      .catch((error: LocationError) => {
        if (DEBUG_GPS) {
          console.log(`[GPS ${getTimestamp()}] startLocationUpdates error:`, error);
        }
        onError(error);
      });
  }

  /**
   * Stop continuous location updates
   */
  stopLocationUpdates(): void {
    if (DEBUG_GPS) {
      console.log(`[GPS ${getTimestamp()}] stopLocationUpdates() CALLED`);
    }

    fusedLocationProvider.stopLocationUpdates();
    this.isTracking = false;

    if (DEBUG_GPS) {
      console.log(`[GPS ${getTimestamp()}] Tracking stopped`);
    }
  }

  /**
   * Check if currently tracking
   */
  getIsTracking(): boolean {
    return this.isTracking;
  }

  /**
   * Request location permission
   */
  async requestPermission(): Promise<{granted: boolean; status: string}> {
    const result = await requestLocationPermission();
    return {
      granted: result.status === 'granted' || result.status === 'limited',
      status: result.status,
    };
  }

  /**
   * Check if has location permission
   */
  async hasPermission(): Promise<boolean> {
    return hasLocationPermission();
  }
}

// Export singleton instance
export const locationService = new LocationService();

// Export class for testing
export {LocationService};

export default locationService;
