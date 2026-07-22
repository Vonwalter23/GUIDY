/**
 * GUIDY - Fused Location Provider (Native Module)
 *
 * TypeScript wrapper for Android's FusedLocationProviderClient via native module.
 * Uses Google Play Services Location API for optimal GPS performance.
 * STAGE 3.3K: Uses ONLY NativeEventEmitter for continuous location updates.
 * React Native callbacks have single-use semantics and cannot be reused.
 */

import {NativeModules, NativeEventEmitter, Platform} from 'react-native';
import type {
  LocationData,
  LocationOptions,
  PermissionResult,
} from './LocationTypes';

// Native module interface - NO callbacks for startLocationUpdates
interface GuidyLocationNativeModule {
  hasPermission(): Promise<boolean>;
  requestPermission(): Promise<PermissionResult>;
  getCurrentLocation(options: LocationOptions): Promise<LocationData>;
  startLocationUpdates(options: LocationOptions): void;
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
 * STAGE 3.3K: Check if native module is available and ready
 */
const isModuleReady = (): boolean => {
  return !!(GuidyLocation && locationEmitter);
};

/**
 * FusedLocationProvider class
 * Uses native FusedLocationProviderClient for GPS operations
 * STAGE 3.3K: Uses ONLY events for continuous updates, no callbacks
 * 
 * IMPORTANT: React Native callbacks have single-use semantics.
 * They crash when invoked more than once.
 * Solution: Use NativeEventEmitter for all continuous updates.
 */
class FusedLocationProvider {
  private isInitialized = false;
  private isCurrentlyTrackingState = false;
  private trackingCallback: ((location: LocationData) => void) | null = null;
  private errorCallback: ((code: string, message: string) => void) | null = null;

  // Store all subscriptions as instance properties for proper cleanup
  private locationSubscription: {remove: () => void} | null = null;
  private updateSubscription: {remove: () => void} | null = null;
  private errorSubscription: {remove: () => void} | null = null;

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

    // STAGE 3.4B: Listen for all status updates
    this.locationSubscription = locationEmitter.addListener(
      'GuidyLocationStatus',
      (event: {type: string; isTracking?: boolean; isLocationAvailable?: boolean}) => {
        log('[FUSED] GuidyLocationStatus:', event);
        
        if (event.type === 'trackingStopped') {
          this.isCurrentlyTrackingState = false;
          this.trackingCallback = null;
          this.errorCallback = null;
        }
        
        // STAGE 3.4B: Handle GPS searching status
        // This is sent when GPS temporarily unavailable, NOT an error
        if (event.type === 'gpsSearching') {
          log('[FUSED] GPS temporarily unavailable - searching');
          // Don't call error callback - this is a temporary state
          // The GPS will become available again
        }
      },
    );

    // STAGE 3.3K: Listen for location updates via events ONLY
    this.updateSubscription = locationEmitter.addListener(
      'GuidyLocationUpdate',
      (event: {location: LocationData; type: string}) => {
        log('[FUSED] Location update:', {
          lat: event.location.latitude.toFixed(6),
          lng: event.location.longitude.toFixed(6),
          accuracy: event.location.accuracy,
        });
        
        if (this.isCurrentlyTrackingState && this.trackingCallback) {
          try {
            this.trackingCallback(event.location);
          } catch (err) {
            log('[FUSED] Error invoking tracking callback:', err);
          }
        }
      },
    );

    // Listen for error events (only true errors, not GPS availability)
    this.errorSubscription = locationEmitter.addListener(
      'GuidyLocationError',
      (event: {code: string; message: string; type: string}) => {
        log('[FUSED] GuidyLocationError:', event);
        if (this.errorCallback) {
          try {
            this.errorCallback(event.code, event.message);
          } catch (err) {
            log('[FUSED] Error invoking error callback:', err);
          }
        }
      },
    );

    log('[FUSED] Event listeners setup complete');
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
   * STAGE 3.3K: Uses events instead of callbacks
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

    // Store callbacks for event listeners
    this.isCurrentlyTrackingState = true;
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
      // STAGE 3.3K: Call without callbacks - events handle the updates
      GuidyLocation.startLocationUpdates(mergedOptions);
      log('Location updates started via events');
    } catch (error) {
      log('startLocationUpdates exception:', error);
      this.isCurrentlyTrackingState = false;
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

    this.isCurrentlyTrackingState = false;
    this.trackingCallback = null;
    this.errorCallback = null;
  }

  /**
   * Get internal tracking state
   */
  isCurrentlyTracking(): boolean {
    return this.isCurrentlyTrackingState;
  }

  /**
   * Cleanup - removes all event subscriptions
   */
  destroy(): void {
    log('Destroying FusedLocationProvider');
    this.stopLocationUpdates();

    const removeSubscription = (sub: {remove: () => void} | null, name: string) => {
      if (sub) {
        try {
          sub.remove();
          log(`${name} subscription removed`);
        } catch (err) {
          log(`Error removing ${name} subscription:`, err);
        }
      }
    };

    removeSubscription(this.locationSubscription, 'locationSubscription');
    removeSubscription(this.updateSubscription, 'updateSubscription');
    removeSubscription(this.errorSubscription, 'errorSubscription');

    this.locationSubscription = null;
    this.updateSubscription = null;
    this.errorSubscription = null;

    this.isInitialized = false;
    log('FusedLocationProvider destroyed');
  }
}

// Export singleton instance
export const fusedLocationProvider = new FusedLocationProvider();

// Export class for testing
export {FusedLocationProvider};

export default fusedLocationProvider;
