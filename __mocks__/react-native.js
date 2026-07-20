/**
 * Mock for react-native modules
 */

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
  check: jest.fn().mockResolvedValue(false),
  request: jest.fn().mockResolvedValue('granted'),
  requestMultiple: jest.fn().mockResolvedValue({
    'android.permission.ACCESS_FINE_LOCATION': 'granted',
    'android.permission.ACCESS_COARSE_LOCATION': 'granted',
  }),
};

// Linking mock
const Linking = {
  openSettings: jest.fn().mockResolvedValue(undefined),
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
