/**
 * GUIDY - Location Permissions Tests
 */

import {PermissionsAndroid, Linking, Alert} from 'react-native';

// Import the functions to test
import {
  requestLocationPermission,
  hasLocationPermission,
  getPermissionStatus,
  openAppSettings,
  showPermissionRationale,
  showPermissionDeniedAlert,
} from '../src/services/location/LocationPermissions';

describe('LocationPermissions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mocks to default state
    PermissionsAndroid.check.mockResolvedValue(false);
    PermissionsAndroid.requestMultiple.mockResolvedValue({
      'android.permission.ACCESS_FINE_LOCATION': 'granted',
      'android.permission.ACCESS_COARSE_LOCATION': 'granted',
    });
  });

  describe('requestLocationPermission', () => {
    it('should return granted when permissions already exist', async () => {
      PermissionsAndroid.check.mockResolvedValue(true);

      const result = await requestLocationPermission();

      expect(result.status).toBe('granted');
      expect(result.canAskAgain).toBe(true);
    });

    it('should request permissions when not granted', async () => {
      PermissionsAndroid.check.mockResolvedValue(false);
      PermissionsAndroid.requestMultiple.mockResolvedValue({
        'android.permission.ACCESS_FINE_LOCATION': 'granted',
        'android.permission.ACCESS_COARSE_LOCATION': 'granted',
      });

      const result = await requestLocationPermission();

      expect(result.status).toBe('granted');
      expect(PermissionsAndroid.requestMultiple).toHaveBeenCalledWith([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ]);
    });

    it('should return limited when only coarse location is granted', async () => {
      PermissionsAndroid.check.mockResolvedValue(false);
      PermissionsAndroid.requestMultiple.mockResolvedValue({
        'android.permission.ACCESS_FINE_LOCATION': 'denied',
        'android.permission.ACCESS_COARSE_LOCATION': 'granted',
      });

      const result = await requestLocationPermission();

      expect(result.status).toBe('limited');
    });

    it('should return denied when user denies permission', async () => {
      PermissionsAndroid.check.mockResolvedValue(false);
      PermissionsAndroid.requestMultiple.mockResolvedValue({
        'android.permission.ACCESS_FINE_LOCATION': 'denied',
        'android.permission.ACCESS_COARSE_LOCATION': 'denied',
      });

      const result = await requestLocationPermission();

      expect(result.status).toBe('denied');
      expect(result.canAskAgain).toBe(true);
    });

    it('should return blocked when user selects "Never ask again"', async () => {
      PermissionsAndroid.check.mockResolvedValue(false);
      PermissionsAndroid.requestMultiple.mockResolvedValue({
        'android.permission.ACCESS_FINE_LOCATION': 'never_ask_again',
        'android.permission.ACCESS_COARSE_LOCATION': 'never_ask_again',
      });

      const result = await requestLocationPermission();

      expect(result.status).toBe('blocked');
      expect(result.canAskAgain).toBe(false);
    });

    it('should return unavailable on error', async () => {
      PermissionsAndroid.check.mockRejectedValue(new Error('Permission check failed'));

      const result = await requestLocationPermission();

      expect(result.status).toBe('unavailable');
      expect(result.canAskAgain).toBe(false);
    });
  });

  describe('hasLocationPermission', () => {
    it('should return true when fine location is granted', async () => {
      PermissionsAndroid.check
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const result = await hasLocationPermission();

      expect(result).toBe(true);
    });

    it('should return true when coarse location is granted', async () => {
      PermissionsAndroid.check
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      const result = await hasLocationPermission();

      expect(result).toBe(true);
    });

    it('should return false when no permission is granted', async () => {
      PermissionsAndroid.check.mockResolvedValue(false);

      const result = await hasLocationPermission();

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      PermissionsAndroid.check.mockRejectedValue(new Error('Check failed'));

      const result = await hasLocationPermission();

      expect(result).toBe(false);
    });
  });

  describe('getPermissionStatus', () => {
    it('should return granted when fine location is granted', async () => {
      PermissionsAndroid.check
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const result = await getPermissionStatus();

      expect(result).toBe('granted');
    });

    it('should return limited when only coarse location is granted', async () => {
      PermissionsAndroid.check
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      const result = await getPermissionStatus();

      expect(result).toBe('limited');
    });

    it('should return denied when no permission is granted', async () => {
      PermissionsAndroid.check.mockResolvedValue(false);

      const result = await getPermissionStatus();

      expect(result).toBe('denied');
    });

    it('should return unavailable on error', async () => {
      PermissionsAndroid.check.mockRejectedValue(new Error('Error'));

      const result = await getPermissionStatus();

      expect(result).toBe('unavailable');
    });
  });

  describe('openAppSettings', () => {
    it('should open app settings', () => {
      openAppSettings();

      expect(Linking.openSettings).toHaveBeenCalled();
    });
  });

  describe('showPermissionRationale', () => {
    it('should show rationale alert', () => {
      showPermissionRationale();

      expect(Alert.alert).toHaveBeenCalledWith(
        'Permiso de Ubicación Requerido',
        expect.stringContaining('Guidy necesita acceso'),
        expect.arrayContaining([
          expect.objectContaining({text: 'Cancelar'}),
          expect.objectContaining({text: 'Conceder Permiso'}),
          expect.objectContaining({text: 'Configuración'}),
        ]),
        {cancelable: true},
      );
    });
  });

  describe('showPermissionDeniedAlert', () => {
    it('should show denied alert', () => {
      showPermissionDeniedAlert();

      expect(Alert.alert).toHaveBeenCalledWith(
        'Permiso de Ubicación Denegado',
        expect.stringContaining('Has denegado'),
        expect.arrayContaining([
          expect.objectContaining({text: 'Cancelar'}),
          expect.objectContaining({text: 'Abrir Configuración'}),
        ]),
        {cancelable: false},
      );
    });
  });
});
