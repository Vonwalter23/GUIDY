/**
 * GUIDY - Jest Setup
 * Mock configurations for native modules
 */

/* eslint-disable no-undef */

// Mock @react-native-community/geolocation
jest.mock('@react-native-community/geolocation', () => ({
  getCurrentPosition: jest.fn((success) => {
    success({
      coords: {
        latitude: -34.6037,
        longitude: -58.3816,
        altitude: 0,
        accuracy: 10,
        altitudeAccuracy: 5,
        speed: 0,
        heading: 0,
      },
      timestamp: Date.now(),
    });
  }),
  watchPosition: jest.fn(() => 1),
  clearWatch: jest.fn(),
  stopObserving: jest.fn(),
}));

// Mock @react-native-community/hooks
jest.mock('@react-native-community/hooks', () => ({
  useAppState: jest.fn(() => 'active'),
}));
