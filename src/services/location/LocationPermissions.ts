/**
 * GUIDY - Location Permissions
 * Handle location permission requests on Android
 */

import {Platform, PermissionsAndroid, Alert, Linking} from 'react-native';
import type {PermissionStatus, PermissionResult} from './LocationTypes';

/**
 * Request location permissions for Android
 * Handles both fine and coarse location
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

    // Request permissions
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    ]);

    const fineGranted =
      result[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] ===
      PermissionsAndroid.RESULTS.GRANTED;
    const coarseGranted =
      result[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] ===
      PermissionsAndroid.RESULTS.GRANTED;

    if (fineGranted) {
      return {status: 'granted', canAskAgain: true};
    }

    if (coarseGranted) {
      return {status: 'limited', canAskAgain: true};
    }

    // Check if user can be asked again
    const fineDenied =
      result[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] ===
      PermissionsAndroid.RESULTS.DENIED;
    const coarseDenied =
      result[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] ===
      PermissionsAndroid.RESULTS.DENIED;

    if (fineDenied || coarseDenied) {
      return {status: 'denied', canAskAgain: true};
    }

    // Permissions are blocked
    return {status: 'blocked', canAskAgain: false};
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
    'Guidy necesita acceso a tu ubicación para ofrecerte experiencias personalizadas basadas en tu posición. Tu ubicación se usa únicamente para mostrarte puntos de interés cercanos y guiarte durante los recorridos.',
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
 */
export function showPermissionDeniedAlert(): void {
  Alert.alert(
    'Permiso de Ubicación Denegado',
    'Has denegado el permiso de ubicación. Para usar todas las funciones de Guidy, necesitas habilitar el permiso en la configuración de la aplicación.',
    [
      {text: 'Cancelar', style: 'cancel'},
      {text: 'Abrir Configuración', onPress: openAppSettings},
    ],
    {cancelable: true},
  );
}
