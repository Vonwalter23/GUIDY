/**
 * GUIDY - Location Service
 * Main service for handling location operations
 * 
 * Provides:
 * - getCurrentLocation: Get single location fix
 * - startLocationUpdates: Continuous location tracking
 * - stopLocationUpdates: Stop tracking
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

// Debug logging flag - set to false in production
const DEBUG_GPS = true;

/**
 * Convert Geolocation response to LocationData
 */
function toLocationData(response: GeolocationResponse): LocationData {
  const location: LocationData = {
    latitude: response.coords.latitude,
    longitude: response.coords.longitude,
    altitude: response.coords.altitude,
    accuracy: response.coords.accuracy,
    altitudeAccuracy: response.coords.altitudeAccuracy,
    speed: response.coords.speed,
    heading: response.coords.heading,
    timestamp: response.timestamp,
  };
  
  if (DEBUG_GPS) {
    console.log('[GPS] toLocationData:', {
      lat: location.latitude.toFixed(6),
      lng: location.longitude.toFixed(6),
      accuracy: location.accuracy,
    });
  }
  
  return location;
}

/**
 * Convert Geolocation error to LocationError
 */
function toLocationError(error: GeolocationError): LocationError {
  let errorMsg = '';
  
  switch (error.code) {
    case 1: // PERMISSION_DENIED
      errorMsg = 'Permiso de ubicación denegado';
      break;
    case 2: // POSITION_UNAVAILABLE
      errorMsg = 'Ubicación no disponible. Verifique que el GPS esté activado.';
      break;
    case 3: // TIMEOUT
      errorMsg = 'Tiempo de espera de ubicación agotado. Intente nuevamente.';
      break;
    default:
      errorMsg = error.message || 'Error desconocido de ubicación';
  }
  
  if (DEBUG_GPS) {
    console.log('[GPS] Error:', error.code, errorMsg);
  }
  
  return {
    code: error.code.toString() as LocationErrorCode,
    message: errorMsg,
  };
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
    if (DEBUG_GPS) {
      console.log('[GPS] getCurrentLocation requested');
    }
    
    const mergedOptions = {...this.currentOptions, ...options};

    // Check permission first
    const hasPermission = await hasLocationPermission();
    if (!hasPermission) {
      if (DEBUG_GPS) {
        console.log('[GPS] No permission, requesting...');
      }
      const result = await requestLocationPermission();
      if (result.status !== 'granted' && result.status !== 'limited') {
        throw {code: LocationErrorCode.PERMISSION_DENIED, message: 'Permiso de ubicación denegado'};
      }
    }

    return new Promise((resolve, reject) => {
      if (DEBUG_GPS) {
        console.log('[GPS] Calling Geolocation.getCurrentPosition');
      }
      
      Geolocation.getCurrentPosition(
        (position: GeolocationResponse) => {
          if (DEBUG_GPS) {
            console.log('[GPS] getCurrentPosition success');
          }
          const location = toLocationData(position);
          if (isValidLocation(location)) {
            resolve(location);
          } else {
            reject({code: LocationErrorCode.UNKNOWN, message: 'Ubicación inválida'});
          }
        },
        (error: GeolocationError) => {
          if (DEBUG_GPS) {
            console.log('[GPS] getCurrentPosition error:', error);
          }
          reject(toLocationError(error));
        },
        {
          enableHighAccuracy: mergedOptions.enableHighAccuracy ?? true,
          timeout: mergedOptions.timeout ?? 15000,
          maximumAge: mergedOptions.maximumAge ?? 0,
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
      console.warn('[GPS] Location updates already running');
      return;
    }

    if (DEBUG_GPS) {
      console.log('[GPS] startLocationUpdates called');
    }

    const mergedOptions = {...this.currentOptions, ...options};
    this.currentOptions = mergedOptions;

    // Check permission first
    hasLocationPermission()
      .then(hasPermission => {
        if (DEBUG_GPS) {
          console.log('[GPS] hasPermission:', hasPermission);
        }
        
        if (!hasPermission) {
          if (DEBUG_GPS) {
            console.log('[GPS] Requesting permission...');
          }
          return requestLocationPermission();
        }
        return {status: 'granted' as const, canAskAgain: true};
      })
      .then(result => {
        if (result.status !== 'granted' && result.status !== 'limited') {
          if (DEBUG_GPS) {
            console.log('[GPS] Permission not granted:', result.status);
          }
          onError({code: LocationErrorCode.PERMISSION_DENIED, message: 'Permiso de ubicación denegado'});
          return;
        }

        if (DEBUG_GPS) {
          console.log('[GPS] Permission granted, starting watchPosition');
        }

        // @react-native-community/geolocation uses distanceFilter instead of interval
        this.watchId = Geolocation.watchPosition(
          (position: GeolocationResponse) => {
            if (DEBUG_GPS) {
              console.log('[GPS] watchPosition success');
            }
            const location = toLocationData(position);
            if (isValidLocation(location)) {
              this.isTracking = true;
              onSuccess(location);
            }
          },
          (error: GeolocationError) => {
            if (DEBUG_GPS) {
              console.log('[GPS] watchPosition error:', error);
            }
            onError(toLocationError(error));
          },
          {
            enableHighAccuracy: mergedOptions.enableHighAccuracy ?? true,
            distanceFilter: mergedOptions.distanceFilter ?? 0,
          },
        );

        this.isTracking = true;
        if (DEBUG_GPS) {
          console.log('[GPS] watchId:', this.watchId);
        }
      })
      .catch((error: LocationError) => {
        if (DEBUG_GPS) {
          console.log('[GPS] startLocationUpdates error:', error);
        }
        onError(error);
      });
  }

  /**
   * Stop continuous location updates
   */
  stopLocationUpdates(): void {
    if (DEBUG_GPS) {
      console.log('[GPS] stopLocationUpdates, watchId:', this.watchId);
    }
    
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
