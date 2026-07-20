/**
 * GUIDY - Location Service
 * Main service for handling location operations
 */

import Geolocation, {
  GeolocationResponse,
  GeolocationError,
} from '@react-native-community/geolocation';
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

/**
 * Convert Geolocation response to LocationData
 */
function toLocationData(response: GeolocationResponse): LocationData {
  return {
    latitude: response.coords.latitude,
    longitude: response.coords.longitude,
    altitude: response.coords.altitude,
    accuracy: response.coords.accuracy,
    altitudeAccuracy: response.coords.altitudeAccuracy,
    speed: response.coords.speed,
    heading: response.coords.heading,
    timestamp: response.timestamp,
  };
}

/**
 * Convert Geolocation error to LocationError
 */
function toLocationError(error: GeolocationError): LocationError {
  switch (error.code) {
    case 1: // PERMISSION_DENIED
      return {
        code: LocationErrorCode.PERMISSION_DENIED,
        message: 'Permiso de ubicación denegado',
      };
    case 2: // POSITION_UNAVAILABLE
      return {
        code: LocationErrorCode.POSITION_UNAVAILABLE,
        message: 'Ubicación no disponible',
      };
    case 3: // TIMEOUT
      return {
        code: LocationErrorCode.TIMEOUT,
        message: 'Tiempo de espera de ubicación agotado',
      };
    default:
      return {
        code: LocationErrorCode.UNKNOWN,
        message: error.message || 'Error desconocido de ubicación',
      };
  }
}

/**
 * LocationService class
 * Provides high-level location functionality
 */
class LocationService {
  private watchId: number | null = null;
  private isTracking: boolean = false;
  private currentOptions: LocationOptions = DEFAULT_LOCATION_OPTIONS;

  /**
   * Get current location once
   * @param options - Location options
   * @returns Promise with current location
   */
  async getCurrentLocation(
    options: Partial<LocationOptions> = {},
  ): Promise<LocationData> {
    const mergedOptions = {...this.currentOptions, ...options};

    // Check permission first
    const hasPermission = await hasLocationPermission();
    if (!hasPermission) {
      const result = await requestLocationPermission();
      if (result.status !== 'granted' && result.status !== 'limited') {
        throw {code: LocationErrorCode.PERMISSION_DENIED, message: 'Permiso de ubicación denegado'};
      }
    }

    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position: GeolocationResponse) => {
          const location = toLocationData(position);
          if (isValidLocation(location)) {
            resolve(location);
          } else {
            reject({code: LocationErrorCode.UNKNOWN, message: 'Ubicación inválida'});
          }
        },
        (error: GeolocationError) => {
          reject(toLocationError(error));
        },
        {
          enableHighAccuracy: mergedOptions.enableHighAccuracy,
          timeout: mergedOptions.timeout,
          maximumAge: mergedOptions.maximumAge,
        },
      );
    });
  }

  /**
   * Start continuous location updates
   * @param onSuccess - Callback for successful location updates
   * @param onError - Callback for location errors
   * @param options - Location options
   */
  startLocationUpdates(
    onSuccess: LocationUpdateCallback,
    onError: LocationErrorCallback,
    options: Partial<LocationOptions> = {},
  ): void {
    if (this.isTracking) {
      console.warn('Location updates already running');
      return;
    }

    const mergedOptions = {...this.currentOptions, ...options};
    this.currentOptions = mergedOptions;

    // Check permission first
    hasLocationPermission()
      .then(hasPermission => {
        if (!hasPermission) {
          return requestLocationPermission();
        }
        return {status: 'granted' as const, canAskAgain: true};
      })
      .then(result => {
        if (result.status !== 'granted' && result.status !== 'limited') {
          onError({code: LocationErrorCode.PERMISSION_DENIED, message: 'Permiso de ubicación denegado'});
          return;
        }

        this.watchId = Geolocation.watchPosition(
          (position: GeolocationResponse) => {
            const location = toLocationData(position);
            if (isValidLocation(location)) {
              this.isTracking = true;
              onSuccess(location);
            }
          },
          (error: GeolocationError) => {
            onError(toLocationError(error));
          },
          {
            enableHighAccuracy: mergedOptions.enableHighAccuracy,
            distanceFilter: mergedOptions.distanceFilter,
            interval: mergedOptions.interval,
            fastestInterval: mergedOptions.fastestInterval,
          },
        );

        this.isTracking = true;
      })
      .catch((error: LocationError) => {
        onError(error);
      });
  }

  /**
   * Stop continuous location updates
   */
  stopLocationUpdates(): void {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.isTracking = false;
  }

  /**
   * Check if currently tracking
   * @returns True if tracking
   */
  getIsTracking(): boolean {
    return this.isTracking;
  }

  /**
   * Request location permission
   * @returns Promise with permission result
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
   * @returns Promise with permission status
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
