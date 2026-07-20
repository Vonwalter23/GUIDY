/**
 * Mock for react-native modules
 * Includes jest mock functions for testing
 */

// Create mock functions that support jest methods
const createMockFn = (defaultValue) => {
  const mockFn = (...args) => Promise.resolve(defaultValue);
  mockFn.mockResolvedValue = (val) => {
    const fn = (...a) => Promise.resolve(val);
    fn.mockResolvedValueOnce = (v) => fn;
    fn.mockRejectedValue = (e) => fn;
    fn.mockRejectedValueOnce = (e) => fn;
    return fn;
  };
  mockFn.mockResolvedValueOnce = (val) => mockFn.mockResolvedValue(val);
  mockFn.mockRejectedValue = (err) => {
    const fn = (...a) => {
      /* ignore error */
      return Promise.reject(err);
    };
    fn.mockResolvedValue = mockFn.mockResolvedValue;
    fn.mockResolvedValueOnce = mockFn.mockResolvedValueOnce;
    fn.mockRejectedValue = mockFn.mockRejectedValue;
    fn.mockRejectedValueOnce = (e) => fn;
    return fn;
  };
  mockFn.mockRejectedValueOnce = (err) => mockFn.mockRejectedValue(err);
  return mockFn;
};

// PermissionsAndroid mock
const PermissionsAndroid = {
  PERMISSIONS: {
    ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
    ACCESS_COARSE_LOCATION: 'android.permission.ACCESS_COARSE_LOCATION',
  },
  RESULTS: {
    GRANTED: 'granted',
    DENIED: 'denied',
    NEVER_ASK_AGAIN: 'never_ask_again',
  },
  check: createMockFn(false),
  request: createMockFn('granted'),
  requestMultiple: createMockFn({
    'android.permission.ACCESS_FINE_LOCATION': 'granted',
    'android.permission.ACCESS_COARSE_LOCATION': 'granted',
  }),
};

// Linking mock
const Linking = {
  openSettings: createMockFn(undefined),
};

// Platform mock
const Platform = {
  OS: 'android',
  Version: 33,
};

// NativeModules mock
const NativeModules = {
  PlatformConstants: {
    ReactNativeVersion: { major: 0, minor: 86, patch: 0 },
  },
};

// Alert mock
const Alert = {
  alert: jest.fn(),
};

// React hooks
const useRef = (initialValue) => ({ current: initialValue });
const useState = (initialValue) => [initialValue, jest.fn()];
const useEffect = (callback, deps) => { callback(); };
const useCallback = (callback, deps) => callback;
const useMemo = (factory, deps) => factory();

module.exports = {
  PermissionsAndroid,
  Linking,
  Platform,
  NativeModules,
  Alert,
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
};
