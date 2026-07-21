/**
 * GUIDY - Jest Setup
 * Mock configurations for native modules
 */

/* eslint-disable no-undef */

// Mock GuidyLocation Native Module (FusedLocationProviderClient)
jest.mock('./src/services/location/FusedLocationProvider', () => ({
  fusedLocationProvider: {
    hasPermission: jest.fn(() => Promise.resolve(true)),
    requestPermission: jest.fn(() => Promise.resolve({status: 'granted', canAskAgain: true})),
    getCurrentLocation: jest.fn(() =>
      Promise.resolve({
        latitude: -34.6037,
        longitude: -58.3816,
        altitude: 0,
        accuracy: 10,
        altitudeAccuracy: 5,
        speed: 0,
        heading: 0,
        timestamp: Date.now(),
        provider: 'fused',
      }),
    ),
    startLocationUpdates: jest.fn(),
    stopLocationUpdates: jest.fn(),
    isTracking: jest.fn(() => Promise.resolve(false)),
    destroy: jest.fn(),
  },
  FusedLocationProvider: jest.fn(),
}));

// Mock NativeModules.GuidyLocation
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    NativeModules: {
      ...RN.NativeModules,
      GuidyLocation: {
        hasPermission: jest.fn(() => Promise.resolve(true)),
        requestPermission: jest.fn(() => Promise.resolve({status: 'granted', canAskAgain: true})),
        getCurrentLocation: jest.fn(() =>
          Promise.resolve({
            latitude: -34.6037,
            longitude: -58.3816,
            altitude: 0,
            accuracy: 10,
            altitudeAccuracy: 5,
            speed: 0,
            heading: 0,
            timestamp: Date.now(),
            provider: 'fused',
          }),
        ),
        startLocationUpdates: jest.fn(),
        stopLocationUpdates: jest.fn(),
        isTracking: jest.fn(() => Promise.resolve(false)),
      },
    },
    NativeEventEmitter: jest.fn(() => ({
      addListener: jest.fn(() => ({remove: jest.fn()})),
      removeListeners: jest.fn(),
    })),
  };
});

// Mock @react-native-community/hooks
jest.mock('@react-native-community/hooks', () => ({
  useAppState: jest.fn(() => 'active'),
}));
