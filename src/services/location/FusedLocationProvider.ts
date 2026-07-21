/**
 * GUIDY - Fused Location Provider (Native Module)
 * 
 * TypeScript wrapper for Android's FusedLocationProviderClient via native module.
 * Uses Google Play Services Location API for optimal GPS performance.
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
 * FusedLocationProvider class
 * Uses native FusedLocationProviderClient for GPS operations
 */
class FusedLocationProvider {
  private isInitialized = false;
  private trackingCallback: ((location: LocationData) => void) | null = null;
  private errorCallback: ((code: string, message: string) => void) | null = null;
  private locationSubscription: {remove: () => void} | null = null;

  constructor() {
    log('FusedLocationProvider initializing...');
    this.setupEventListeners();
    this.isInitialized = true;
    log('FusedLocationProvider ready');
  }

  private setupEventListeners(): void {
    if (!locationEmitter) {
      log('Event emitter not available (not on Android or module missing)');
      return;
    }

    // Listen for location updates
    this.locationSubscription = locationEmitter.addListener(
      'GuidyLocationUpdate',
      (event: {location: LocationData; type: string}) => {
        log('Native location update received:', event.location);
        if (this.trackingCallback) {
          this.trackingCallback(event.location);
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
      throw new Error('FusedLocationProvider not available');
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
    } catch (error) {
      log('getCurrentLocation error:', error);
      throw error;
    }
  }

  /**
   * Start continuous location updates
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
          this.errorCallback?.(code, message);
        },
      );
      log('Location updates started');
    } catch (error) {
      log('startLocationUpdates exception:', error);
      onError('START_ERROR', String(error));
    }
  }

  /**
   * Stop continuous location updates
   */
  stopLocationUpdates(): void {
    log('stopLocationUpdates called');
    
    if (GuidyLocation) {
      GuidyLocation.stopLocationUpdates();
      log('Location updates stopped');
    }

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
   * Cleanup
   */
  destroy(): void {
    log('Destroying FusedLocationProvider');
    this.stopLocationUpdates();
    this.locationSubscription?.remove();
    this.locationSubscription = null;
    this.isInitialized = false;
  }
}

// Export singleton instance
export const fusedLocationProvider = new FusedLocationProvider();

// Export class for testing
export {FusedLocationProvider};

export default fusedLocationProvider;
