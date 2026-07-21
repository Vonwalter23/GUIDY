/**
 * GUIDY - Fused Location Provider (Native Module)
 * 
 * TypeScript wrapper for Android's FusedLocationProviderClient via native module.
 * Uses Google Play Services Location API for optimal GPS performance.
 * STAGE 3.3C: Added crash protection for Google Play Services issues.
 */

import {NativeModules, NativeEventEmitter, Platform} from 'react-native';
import type {
  LocationData,
  LocationOptions,
  PermissionResult,
} from './LocationTypes';

// Native module interface
interface GuidyLocationNativeModule {
  hasPermission(): Promise<boolean>;
  requestPermission(): Promise<PermissionResult>;
  getCurrentLocation(options: LocationOptions): Promise<LocationData>;
  startLocationUpdates(
    options: LocationOptions,
    onLocation: (error: string | null, location: LocationData | null) => void,
    onError: (code: string, message: string) => void,
  ): void;
  stopLocationUpdates(): void;
  isTracking(): Promise<boolean>;
}

// Native module singleton
const {GuidyLocation} = NativeModules as {GuidyLocation: GuidyLocationNativeModule};

// Event emitter for native events
const locationEmitter = Platform.OS === 'android' && GuidyLocation
  ? new NativeEventEmitter(NativeModules.GuidyLocation)
  : null;

// Debug logging
const DEBUG_GPS = true;
const getTimestamp = (): string => new Date().toISOString();

/**
 * Log GPS operations
 */
const log = (message: string, ...data: unknown[]): void => {
  if (DEBUG_GPS) {
    console.log(`[GUIDY GPS ${getTimestamp()}] ${message}`, ...data);
  }
};

/**
 * STAGE 3.3C: Check if native module is available and ready
 */
const isModuleReady = (): boolean => {
  return !!(GuidyLocation && locationEmitter);
};

/**
 * FusedLocationProvider class
 * Uses native FusedLocationProviderClient for GPS operations
 * STAGE 3.3C: Added crash protection
 */
class FusedLocationProvider {
  private isInitialized = false;
  private isTracking = false;
  private trackingCallback: ((location: LocationData) => void) | null = null;
  private errorCallback: ((code: string, message: string) => void) | null = null;
  private locationSubscription: {remove: () => void} | null = null;

  constructor() {
    log('FusedLocationProvider initializing...');
    this.setupEventListeners();
    this.isInitialized = true;
    log('FusedLocationProvider ready, module ready:', isModuleReady());
  }

  private setupEventListeners(): void {
    if (!locationEmitter) {
      log('Event emitter not available (not on Android or module missing)');
      return;
    }

    // STAGE 3.3C: Listen for status updates
    this.locationSubscription = locationEmitter.addListener(
      'GuidyLocationStatus',
      (event: {type: string; isTracking: boolean}) => {
        log('GuidyLocationStatus received:', event);
        if (event.type === 'trackingStopped') {
          this.isTracking = false;
          this.trackingCallback = null;
          this.errorCallback = null;
        }
      },
    );

    // STAGE 3.3C: Listen for location updates
    const updateSubscription = locationEmitter.addListener(
      'GuidyLocationUpdate',
      (event: {location: LocationData; type: string}) => {
        log('Native location update received:', event.location);
        // STAGE 3.3C: Only invoke callback if we're tracking
        if (this.isTracking && this.trackingCallback) {
          try {
            this.trackingCallback(event.location);
          } catch (err) {
            log('Error invoking tracking callback:', err);
          }
        }
      },
    );

    // STAGE 3.3C: Listen for error events
    const errorSubscription = locationEmitter.addListener(
      'GuidyLocationError',
      (event: {code: string; message: string; type: string}) => {
        log('GuidyLocationError received:', event);
        // STAGE 3.3C: Forward error to callback if we have one
        if (this.errorCallback) {
          try {
            this.errorCallback(event.code, event.message);
          } catch (err) {
            log('Error invoking error callback:', err);
          }
        }
      },
    );

    log('Event listeners setup complete');
  }

  /**
   * Check if location permission is granted
   */
  async hasPermission(): Promise<boolean> {
    log('hasPermission called');
    
    if (!GuidyLocation) {
      log('GuidyLocation native module not available');
      return false;
    }

    try {
      const result = await GuidyLocation.hasPermission();
      log('hasPermission result:', result);
      return result;
    } catch (error) {
      log('hasPermission error:', error);
      return false;
    }
  }

  /**
   * Request location permission
   */
  async requestPermission(): Promise<PermissionResult> {
    log('requestPermission called');
    
    if (!GuidyLocation) {
      log('GuidyLocation native module not available');
      return {status: 'unavailable', canAskAgain: false};
    }

    try {
      const result = await GuidyLocation.requestPermission();
      log('requestPermission result:', result);
      return result;
    } catch (error) {
      log('requestPermission error:', error);
      return {status: 'unavailable', canAskAgain: false};
    }
  }

  /**
   * Get current location once
   */
  async getCurrentLocation(
    options: Partial<LocationOptions> = {},
  ): Promise<LocationData> {
    log('getCurrentLocation called', options);
    
    if (!GuidyLocation) {
      log('GuidyLocation native module not available');
      throw new Error('FusedLocationProvider not available - Google Play Services issue');
    }

    const mergedOptions = {
      enableHighAccuracy: options.enableHighAccuracy ?? true,
      timeout: options.timeout ?? 15000,
      maximumAge: options.maximumAge ?? 0,
    };

    log('Requesting location with options:', mergedOptions);

    try {
      const location = await GuidyLocation.getCurrentLocation(mergedOptions);
      log('Location received:', {
        lat: location.latitude.toFixed(6),
        lng: location.longitude.toFixed(6),
        accuracy: location.accuracy,
        provider: location.provider,
      });
      return location;
    } catch (error: unknown) {
      log('getCurrentLocation error:', error);
      // STAGE 3.3C: Provide more helpful error messages
      if (error instanceof Error) {
        if (error.message.includes('MODULE_NOT_READY')) {
          throw new Error('Location module not ready - Please restart the app');
        }
        if (error.message.includes('E_NO_ACTIVITY')) {
          throw new Error('Cannot request location - App is not in foreground');
        }
        if (error.message.includes('E_CLIENT_NULL')) {
          throw new Error('Location service unavailable - Please restart the app');
        }
      }
      throw error;
    }
  }

  /**
   * Start continuous location updates
   * STAGE 3.3C: Added crash protection
   */
  startLocationUpdates(
    options: Partial<LocationOptions>,
    onLocation: (location: LocationData) => void,
    onError: (code: string, message: string) => void,
  ): void {
    log('startLocationUpdates called', options);
    
    if (!GuidyLocation) {
      log('GuidyLocation native module not available');
      onError('MODULE_NOT_AVAILABLE', 'Native location module not available');
      return;
    }

    // STAGE 3.3C: Store callbacks and mark as tracking
    this.isTracking = true;
    this.trackingCallback = onLocation;
    this.errorCallback = onError;

    const mergedOptions = {
      enableHighAccuracy: options.enableHighAccuracy ?? true,
      interval: options.interval ?? 5000,
      fastestInterval: options.fastestInterval ?? 2000,
      distanceFilter: options.distanceFilter ?? 0,
    };

    log('Starting location updates with:', mergedOptions);

    try {
      GuidyLocation.startLocationUpdates(
        mergedOptions,
        (error, location) => {
          // STAGE 3.3C: Check if we're still tracking before invoking callbacks
          if (!this.isTracking) {
            log('Received callback but not tracking, ignoring');
            return;
          }
          
          if (error) {
            log('Location error callback:', error);
            this.errorCallback?.(error, 'Location error');
          } else if (location) {
            log('Location callback:', {
              lat: location.latitude.toFixed(6),
              lng: location.longitude.toFixed(6),
            });
            this.trackingCallback?.(location);
          }
        },
        (code, message) => {
          log('Error callback:', code, message);
          // STAGE 3.3C: Don't clear callbacks on error, let caller decide
          this.errorCallback?.(code, message);
        },
      );
      log('Location updates started');
    } catch (error) {
      log('startLocationUpdates exception:', error);
      this.isTracking = false;
      onError('START_ERROR', String(error));
    }
  }

  /**
   * Stop continuous location updates
   */
  stopLocationUpdates(): void {
    log('stopLocationUpdates called');
    
    if (GuidyLocation) {
      try {
        GuidyLocation.stopLocationUpdates();
        log('Location updates stopped');
      } catch (err) {
        log('Error stopping location updates:', err);
      }
    }

    this.isTracking = false;
    this.trackingCallback = null;
    this.errorCallback = null;
  }

  /**
   * Check if currently tracking
   */
  async isTracking(): Promise<boolean> {
    if (!GuidyLocation) {
      return false;
    }

    try {
      return await GuidyLocation.isTracking();
    } catch {
      return false;
    }
  }

  /**
   * STAGE 3.3C: Get internal tracking state
   */
  isCurrentlyTracking(): boolean {
    return this.isTracking;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    log('Destroying FusedLocationProvider');
    this.stopLocationUpdates();
    
    if (this.locationSubscription) {
      try {
        this.locationSubscription.remove();
      } catch (err) {
        log('Error removing subscription:', err);
      }
      this.locationSubscription = null;
    }
    
    this.isInitialized = false;
  }
}

// Export singleton instance
export const fusedLocationProvider = new FusedLocationProvider();

// Export class for testing
export {FusedLocationProvider};

export default fusedLocationProvider;
