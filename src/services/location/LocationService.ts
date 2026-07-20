/**
 * GUIDY - Location Service
 * Main service for handling location operations
 * 
 * IMPORTANT: This file uses @react-native-community/geolocation
 * which internally uses Android's LocationManager (NOT FusedLocationProviderClient)
 * 
 * The library handles:
 * - Permission requests
 * - Location updates
 * - Error handling
 * 
 * For FusedLocationProviderClient, consider using react-native-geolocation-service
 * but this requires additional native configuration.
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

// Debug logging flag - MUST remain true until STAGE 4
// This logs every GPS operation for debugging
const DEBUG_GPS = true;

/**
 * Get current timestamp for logging
 */
const getTimestamp = (): string => {
  const now = new Date();
  return now.toISOString();
};

/**
 * Get error description
 */
const getErrorDescription = (code: number): string => {
  switch (code) {
    case 1:
      return 'PERMISSION_DENIED';
    case 2:
      return 'POSITION_UNAVAILABLE';
    case 3:
      return 'TIMEOUT';
    default:
      return 'UNKNOWN';
  }
};

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
    console.log(`[GPS ${getTimestamp()}] toLocationData - Raw response:`, JSON.stringify({
      latitude: response.coords.latitude,
      longitude: response.coords.longitude,
      accuracy: response.coords.accuracy,
      altitude: response.coords.altitude,
      altitudeAccuracy: response.coords.altitudeAccuracy,
      heading: response.coords.heading,
      speed: response.coords.speed,
      timestamp: response.timestamp,
      provider: (response as unknown as {provider?: string}).provider || 'unknown',
    }));
    
    console.log(`[GPS ${getTimestamp()}] toLocationData - Processed:`, {
      lat: location.latitude.toFixed(6),
      lng: location.longitude.toFixed(6),
      accuracy: location.accuracy,
      isValid: isValidLocation(location),
    });
  }
  
  return location;
}

/**
 * Convert Geolocation error to LocationError
 */
function toLocationError(error: GeolocationError): LocationError {
  const errorCode = error.code;
  const errorDesc = getErrorDescription(errorCode);
  
  let errorMsg = '';
  
  switch (errorCode) {
    case 1: // PERMISSION_DENIED
      errorMsg = 'Permiso de ubicación denegado';
      break;
    case 2: // POSITION_UNAVAILABLE
      errorMsg = 'Ubicación no disponible. Verifique que el GPS esté activado y tenga conexión.';
      break;
    case 3: // TIMEOUT
      errorMsg = 'Tiempo de espera de ubicación agotado. Intente nuevamente.';
      break;
    default:
      errorMsg = error.message || 'Error desconocido de ubicación';
  }
  
  if (DEBUG_GPS) {
    console.log(`[GPS ${getTimestamp()}] ERROR - Code: ${errorCode} (${errorDesc}), Message: "${errorMsg}"`);
    console.log(`[GPS ${getTimestamp()}] ERROR - Full error object:`, JSON.stringify(error));
  }
  
  return {
    code: errorCode.toString() as LocationErrorCode,
    message: errorMsg,
  };
}

/**
 * LocationService class
 * Provides high-level location functionality
 * 
 * Uses @react-native-community/geolocation which uses Android's LocationManager
 * NOT FusedLocationProviderClient
 */
class LocationService {
  private watchId: number | null = null;
  private isTracking: boolean = false;
  private currentOptions: LocationOptions = DEFAULT_LOCATION_OPTIONS;
  private startTime: number = 0;

  /**
   * Get current location once
   * @param options - Location options
   * @returns Promise with current location
   */
  async getCurrentLocation(
    options: Partial<LocationOptions> = {},
  ): Promise<LocationData> {
    if (DEBUG_GPS) {
      console.log(`[GPS ${getTimestamp()}] ========================================`);
      console.log(`[GPS ${getTimestamp()}] getCurrentLocation() CALLED`);
      console.log(`[GPS ${getTimestamp()}] Options:`, JSON.stringify(options));
      console.log(`[GPS ${getTimestamp()}] Library: @react-native-community/geolocation v3.4.0`);
      console.log(`[GPS ${getTimestamp()}] Provider: Android LocationManager (NOT FusedLocationProviderClient)`);
    }
    
    const mergedOptions = {...this.currentOptions, ...options};
    this.currentOptions = mergedOptions;
    
    if (DEBUG_GPS) {
      console.log(`[GPS ${getTimestamp()}] Merged options:`, {
        enableHighAccuracy: mergedOptions.enableHighAccuracy,
        timeout: mergedOptions.timeout,
        maximumAge: mergedOptions.maximumAge,
        distanceFilter: mergedOptions.distanceFilter,
      });
    }

    // Check permission first
    if (DEBUG_GPS) {
      console.log(`[GPS ${getTimestamp()}] Checking location permission...`);
    }
    
    const hasPermission = await hasLocationPermission();
    
    if (DEBUG_GPS) {
      console.log(`[GPS ${getTimestamp()}] hasPermission result: ${hasPermission}`);
    }
    
    if (!hasPermission) {
      if (DEBUG_GPS) {
        console.log(`[GPS ${getTimestamp()}] No permission, requesting...`);
      }
      const result = await requestLocationPermission();
      
      if (DEBUG_GPS) {
        console.log(`[GPS ${getTimestamp()}] Permission request result:`, JSON.stringify(result));
      }
      
      if (result.status !== 'granted' && result.status !== 'limited') {
        if (DEBUG_GPS) {
          console.log(`[GPS ${getTimestamp()}] Permission DENIED, throwing error`);
        }
        throw {code: LocationErrorCode.PERMISSION_DENIED, message: 'Permiso de ubicación denegado'};
      }
    } else {
      if (DEBUG_GPS) {
        console.log(`[GPS ${getTimestamp()}] Permission already granted`);
      }
    }
    
    this.startTime = Date.now();

    return new Promise((resolve, reject) => {
      if (DEBUG_GPS) {
        console.log(`[GPS ${getTimestamp()}] Calling Geolocation.getCurrentPosition()`);
        console.log(`[GPS ${getTimestamp()}] With options:`, {
          enableHighAccuracy: mergedOptions.enableHighAccuracy ?? true,
          timeout: mergedOptions.timeout ?? 15000,
          maximumAge: mergedOptions.maximumAge ?? 0,
        });
      }
      
      Geolocation.getCurrentPosition(
        (position: GeolocationResponse) => {
          const elapsed = Date.now() - this.startTime;
          
          if (DEBUG_GPS) {
            console.log(`[GPS ${getTimestamp()}] ========================================`);
            console.log(`[GPS ${getTimestamp()}] getCurrentPosition SUCCESS`);
            console.log(`[GPS ${getTimestamp()}] Time to first fix: ${elapsed}ms`);
            console.log(`[GPS ${getTimestamp()}] Position received:`, JSON.stringify({
              coords: position.coords,
              timestamp: position.timestamp,
              provider: (position as unknown as {provider?: string}).provider || 'unknown',
            }));
          }
          
          const location = toLocationData(position);
          
          if (DEBUG_GPS) {
            console.log(`[GPS ${getTimestamp()}] isValidLocation: ${isValidLocation(location)}`);
          }
          
          if (isValidLocation(location)) {
            if (DEBUG_GPS) {
              console.log(`[GPS ${getTimestamp()}] Location VALID, resolving promise`);
              console.log(`[GPS ${getTimestamp()}] Final coordinates:`, {
                lat: location.latitude.toFixed(6),
                lng: location.longitude.toFixed(6),
                accuracy: location.accuracy,
              });
              console.log(`[GPS ${getTimestamp()}] ========================================`);
            }
            resolve(location);
          } else {
            if (DEBUG_GPS) {
              console.log(`[GPS ${getTimestamp()}] Location INVALID, rejecting promise`);
            }
            reject({code: LocationErrorCode.UNKNOWN, message: 'Ubicación inválida'});
          }
        },
        (error: GeolocationError) => {
          const elapsed = Date.now() - this.startTime;
          
          if (DEBUG_GPS) {
            console.log(`[GPS ${getTimestamp()}] ========================================`);
            console.log(`[GPS ${getTimestamp()}] getCurrentPosition ERROR`);
            console.log(`[GPS ${getTimestamp()}] Time until error: ${elapsed}ms`);
            console.log(`[GPS ${getTimestamp()}] Error code: ${error.code} (${getErrorDescription(error.code)})`);
            console.log(`[GPS ${getTimestamp()}] Error message: ${error.message}`);
            console.log(`[GPS ${getTimestamp()}] Full error:`, JSON.stringify(error));
            console.log(`[GPS ${getTimestamp()}] ========================================`);
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
      if (DEBUG_GPS) {
        console.log(`[GPS ${getTimestamp()}] startLocationUpdates called but ALREADY TRACKING`);
        console.log(`[GPS ${getTimestamp()}] watchId: ${this.watchId}`);
      }
      return;
    }

    if (DEBUG_GPS) {
      console.log(`[GPS ${getTimestamp()}] ========================================`);
      console.log(`[GPS ${getTimestamp()}] startLocationUpdates() CALLED`);
      console.log(`[GPS ${getTimestamp()}] Options:`, JSON.stringify(options));
      console.log(`[GPS ${getTimestamp()}] Library: @react-native-community/geolocation`);
      console.log(`[GPS ${getTimestamp()}] ========================================`);
    }

    const mergedOptions = {...this.currentOptions, ...options};
    this.currentOptions = mergedOptions;

    this.startTime = Date.now();

    // Check permission first
    hasLocationPermission()
      .then(hasPermission => {
        if (DEBUG_GPS) {
          console.log(`[GPS ${getTimestamp()}] hasPermission: ${hasPermission}`);
        }
        
        if (!hasPermission) {
          if (DEBUG_GPS) {
            console.log(`[GPS ${getTimestamp()}] Requesting permission...`);
          }
          return requestLocationPermission();
        }
        return {status: 'granted' as const, canAskAgain: true};
      })
      .then(result => {
        if (DEBUG_GPS) {
          console.log(`[GPS ${getTimestamp()}] Permission result:`, JSON.stringify(result));
        }
        
        if (result.status !== 'granted' && result.status !== 'limited') {
          if (DEBUG_GPS) {
            console.log(`[GPS ${getTimestamp()}] Permission NOT granted, calling onError`);
          }
          onError({code: LocationErrorCode.PERMISSION_DENIED, message: 'Permiso de ubicación denegado'});
          return;
        }

        if (DEBUG_GPS) {
          console.log(`[GPS ${getTimestamp()}] Permission granted, starting watchPosition()`);
          console.log(`[GPS ${getTimestamp()}] Watch options:`, {
            enableHighAccuracy: mergedOptions.enableHighAccuracy ?? true,
            distanceFilter: mergedOptions.distanceFilter ?? 0,
          });
        }

        // @react-native-community/geolocation uses distanceFilter instead of interval
        // This uses Android's LocationManager, NOT FusedLocationProviderClient
        this.watchId = Geolocation.watchPosition(
          (position: GeolocationResponse) => {
            const elapsed = Date.now() - this.startTime;
            
            if (DEBUG_GPS) {
              console.log(`[GPS ${getTimestamp()}] ========================================`);
              console.log(`[GPS ${getTimestamp()}] watchPosition SUCCESS`);
              console.log(`[GPS ${getTimestamp()}] Time since start: ${elapsed}ms`);
              console.log(`[GPS ${getTimestamp()}] Position:`, JSON.stringify({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                provider: (position as unknown as {provider?: string}).provider || 'unknown',
              }));
            }
            
            const location = toLocationData(position);
            
            if (isValidLocation(location)) {
              this.isTracking = true;
              
              if (DEBUG_GPS) {
                console.log(`[GPS ${getTimestamp()}] Valid location, calling onSuccess callback`);
                console.log(`[GPS ${getTimestamp()}] Coordinates:`, {
                  lat: location.latitude.toFixed(6),
                  lng: location.longitude.toFixed(6),
                });
                console.log(`[GPS ${getTimestamp()}] ========================================`);
              }
              
              onSuccess(location);
            } else {
              if (DEBUG_GPS) {
                console.log(`[GPS ${getTimestamp()}] Invalid location, ignoring update`);
              }
            }
          },
          (error: GeolocationError) => {
            const elapsed = Date.now() - this.startTime;
            
            if (DEBUG_GPS) {
              console.log(`[GPS ${getTimestamp()}] ========================================`);
              console.log(`[GPS ${getTimestamp()}] watchPosition ERROR`);
              console.log(`[GPS ${getTimestamp()}] Time since start: ${elapsed}ms`);
              console.log(`[GPS ${getTimestamp()}] Error code: ${error.code} (${getErrorDescription(error.code)})`);
              console.log(`[GPS ${getTimestamp()}] Error message: ${error.message}`);
              console.log(`[GPS ${getTimestamp()}] ========================================`);
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
          console.log(`[GPS ${getTimestamp()}] watchPosition started successfully`);
          console.log(`[GPS ${getTimestamp()}] watchId assigned: ${this.watchId}`);
          console.log(`[GPS ${getTimestamp()}] isTracking set to: ${this.isTracking}`);
        }
      })
      .catch((error: LocationError) => {
        if (DEBUG_GPS) {
          console.log(`[GPS ${getTimestamp()}] ========================================`);
          console.log(`[GPS ${getTimestamp()}] startLocationUpdates CATCH ERROR`);
          console.log(`[GPS ${getTimestamp()}] Error:`, JSON.stringify(error));
          console.log(`[GPS ${getTimestamp()}] ========================================`);
        }
        onError(error);
      });
  }

  /**
   * Stop continuous location updates
   */
  stopLocationUpdates(): void {
    if (DEBUG_GPS) {
      console.log(`[GPS ${getTimestamp()}] ========================================`);
      console.log(`[GPS ${getTimestamp()}] stopLocationUpdates() CALLED`);
      console.log(`[GPS ${getTimestamp()}] Current watchId: ${this.watchId}`);
      console.log(`[GPS ${getTimestamp()}] Current isTracking: ${this.isTracking}`);
    }
    
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      
      if (DEBUG_GPS) {
        console.log(`[GPS ${getTimestamp()}] Geolocation.clearWatch(${this.watchId}) called`);
      }
      
      this.watchId = null;
    } else {
      if (DEBUG_GPS) {
        console.log(`[GPS ${getTimestamp()}] No watchId to clear (was null)`);
      }
    }
    
    this.isTracking = false;
    
    if (DEBUG_GPS) {
      console.log(`[GPS ${getTimestamp()}] isTracking set to: false`);
      console.log(`[GPS ${getTimestamp()}] ========================================`);
    }
  }

  /**
   * Check if currently tracking
   * @returns True if tracking
   */
  getIsTracking(): boolean {
    if (DEBUG_GPS) {
      console.log(`[GPS ${getTimestamp()}] getIsTracking() returning: ${this.isTracking}`);
    }
    return this.isTracking;
  }

  /**
   * Request location permission
   * @returns Promise with permission result
   */
  async requestPermission(): Promise<{granted: boolean; status: string}> {
    if (DEBUG_GPS) {
      console.log(`[GPS ${getTimestamp()}] requestPermission() called`);
    }
    
    const result = await requestLocationPermission();
    
    if (DEBUG_GPS) {
      console.log(`[GPS ${getTimestamp()}] requestPermission() result:`, JSON.stringify(result));
    }
    
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
    if (DEBUG_GPS) {
      console.log(`[GPS ${getTimestamp()}] hasPermission() called`);
    }
    
    const result = await hasLocationPermission();
    
    if (DEBUG_GPS) {
      console.log(`[GPS ${getTimestamp()}] hasPermission() result: ${result}`);
    }
    
    return result;
  }
}

// Export singleton instance
export const locationService = new LocationService();

// Export class for testing
export {LocationService};

export default locationService;
