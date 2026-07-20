/**
 * GUIDY - Location Permissions
 * Handle location permission requests on Android
 * 
 * Supports:
 * - Android 12+ (API 31+)
 * - Android 13+ (API 33+) - NEARBY_WIFI_DEVICES for precise location
 * - Android 14+ (API 34+)
 */

import {Platform, PermissionsAndroid, Alert, Linking} from 'react-native';
import type {PermissionStatus, PermissionResult} from './LocationTypes';

/**
 * Request location permissions for Android
 * Handles both fine and coarse location
 * 
 * @returns Promise<PermissionResult> with status and canAskAgain flag
 */
export async function requestLocationPermission(): Promise<PermissionResult> {
  try {
    if (Platform.OS !== 'android') {
      return {status: 'granted', canAskAgain: true};
    }

    // Check if permissions are already granted
    const fineLocation = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
    const coarseLocation = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    );

    if (fineLocation && coarseLocation) {
      return {status: 'granted', canAskAgain: true};
    }

    // Build permissions array
    const permissionsToRequest = [
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    ];

    // Request with rationale callback for better UX
    const result = await PermissionsAndroid.requestMultiple(permissionsToRequest);

    // Analyze results
    const fineResult = result[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
    const coarseResult = result[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION];

    // Check for granted permissions
    if (fineResult === PermissionsAndroid.RESULTS.GRANTED) {
      return {status: 'granted', canAskAgain: true};
    }

    if (coarseResult === PermissionsAndroid.RESULTS.GRANTED) {
      return {status: 'limited', canAskAgain: true};
    }

    // Check for blocked/permanently denied
    if (fineResult === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      return {status: 'blocked', canAskAgain: false};
    }

    // Regular denial - can ask again
    if (fineResult === PermissionsAndroid.RESULTS.DENIED) {
      return {status: 'denied', canAskAgain: true};
    }

    // Fallback for any other case
    return {status: 'denied', canAskAgain: true};
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return {status: 'unavailable', canAskAgain: false};
  }
}

/**
 * Check if location permission is granted
 */
export async function hasLocationPermission(): Promise<boolean> {
  try {
    if (Platform.OS !== 'android') {
      return true;
    }

    const fineLocation = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
    const coarseLocation = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    );

    return fineLocation || coarseLocation;
  } catch (error) {
    console.error('Error checking location permission:', error);
    return false;
  }
}

/**
 * Get current permission status
 */
export async function getPermissionStatus(): Promise<PermissionStatus> {
  try {
    if (Platform.OS !== 'android') {
      return 'granted';
    }

    const fineLocation = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
    const coarseLocation = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    );

    if (fineLocation) {
      return 'granted';
    }

    if (coarseLocation) {
      return 'limited';
    }

    return 'denied';
  } catch (error) {
    console.error('Error getting permission status:', error);
    return 'unavailable';
  }
}

/**
 * Open app settings for user to manually enable permissions
 */
export function openAppSettings(): void {
  Linking.openSettings();
}

/**
 * Show alert explaining why permission is needed
 */
export function showPermissionRationale(): void {
  Alert.alert(
    'Permiso de Ubicación Requerido',
    'Guidy necesita acceso a tu ubicación para mostrarte puntos de interés cercanos y guiarte durante los recorridos. Tu ubicación se usa únicamente para fines de navegación.',
    [
      {text: 'Cancelar', style: 'cancel'},
      {text: 'Conceder Permiso', onPress: requestLocationPermission},
      {text: 'Configuración', onPress: openAppSettings},
    ],
    {cancelable: true},
  );
}

/**
 * Show alert when permission is permanently denied
 * Opens app settings automatically
 */
export function showPermissionDeniedAlert(): void {
  Alert.alert(
    'Permiso de Ubicación Denegado',
    'Has denegado el permiso de ubicación permanentemente. Para usar Guidy, necesitas habilitar el permiso en la configuración de la aplicación.',
    [
      {text: 'Cancelar', style: 'cancel'},
      {text: 'Abrir Configuración', onPress: openAppSettings},
    ],
    {cancelable: false},
  );
}

/**
 * Handle permission result and show appropriate alert if needed
 * @returns true if permission was granted, false otherwise
 */
export async function handlePermissionResult(
  result: PermissionResult,
  onGranted?: () => void,
  onDenied?: () => void,
  onBlocked?: () => void,
): Promise<boolean> {
  switch (result.status) {
    case 'granted':
    case 'limited':
      onGranted?.();
      return true;
    
    case 'denied':
      onDenied?.();
      showPermissionRationale();
      return false;
    
    case 'blocked':
      onBlocked?.();
      showPermissionDeniedAlert();
      return false;
    
    default:
      return false;
  }
}
