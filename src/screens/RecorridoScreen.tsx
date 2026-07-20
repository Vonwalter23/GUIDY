/**
 * GUIDY - Recorrido Screen
 * Screen showing map and GPS location information
 * 
 * Handles:
 * - Permission request flow
 * - GPS status display
 * - Location coordinates display
 * - Permission denied/blocked states
 */

import React, {useEffect, useCallback} from 'react';
import {View, StyleSheet, Dimensions} from 'react-native';
import {Text, Surface, useTheme, Button, FAB} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';

import {spacing, borderRadius} from '../theme';
import {
  useLocation,
  formatLatitude,
  formatLongitude,
  formatAccuracy,
  formatSpeed,
  formatLastUpdate,
  openAppSettings,
  requestLocationPermission,
} from '../services/location';
import {OpenStreetMap} from '../components';
import {useMap} from '../services/maps';

type RootStackParamList = {
  Home: undefined;
  Configuracion: undefined;
  Recorrido: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'Recorrido'>;

function RecorridoScreen({}: Props): React.JSX.Element {
  const theme = useTheme();
  const {
    currentLocation,
    permissionStatus,
    gpsStatus,
    isTracking,
    error,
    lastUpdate,
    startTracking,
    stopTracking,
  } = useLocation();
  
  const {
    isFollowingUser,
    centerOnUser,
    toggleFollowMode,
  } = useMap();
  
  const screenHeight = Dimensions.get('window').height;
  const mapHeight = screenHeight * 0.45; // 45% of screen for map

  // Start tracking when permission is granted
  useEffect(() => {
    if (permissionStatus === 'granted' && !isTracking) {
      startTracking();
    }
  }, [permissionStatus, isTracking, startTracking]);

  // Handle permission request with better UX
  const handlePermissionRequest = useCallback(async () => {
    const result = await requestLocationPermission();
    if (result.status === 'denied') {
      // Show rationale - user can try again
      console.log('Permission denied, user can try again');
    } else if (result.status === 'blocked') {
      // Open settings for permanent denial
      openAppSettings();
    }
    // Permission granted will trigger useEffect to start tracking
  }, []);

  const getGpsStatusColor = () => {
    switch (gpsStatus) {
      case 'searching':
        return '#2196F3'; // Blue - searching
      case 'active':
        return '#4CAF50'; // Green
      case 'inactive':
        return '#FF9800'; // Orange
      case 'unavailable':
        return '#F44336'; // Red
      default:
        return theme.colors.onSurface;
    }
  };

  const getGpsStatusText = () => {
    switch (gpsStatus) {
      case 'searching':
        return 'Buscando ubicación...';
      case 'active':
        return 'GPS Conectado';
      case 'inactive':
        return 'GPS Inactivo';
      case 'unavailable':
        return 'GPS No Disponible';
      default:
        return 'Estado Desconocido';
    }
  };

  const getPermissionText = () => {
    switch (permissionStatus) {
      case 'granted':
        return 'Permiso Concedido';
      case 'denied':
        return 'Permiso Denegado';
      case 'blocked':
        return 'Permiso Bloqueado';
      case 'limited':
        return 'Permiso Limitado';
      case 'unavailable':
        return 'Permiso No Disponible';
      default:
        return 'Sin Estado';
    }
  };

  const getPermissionIcon = () => {
    switch (permissionStatus) {
      case 'granted':
      case 'limited':
        return 'check-circle';
      case 'denied':
        return 'close-circle';
      case 'blocked':
        return 'cancel';
      default:
        return 'help-circle';
    }
  };

  // Permission denied screen
  if (permissionStatus === 'denied') {
    return (
      <SafeAreaView
        style={[styles.container, {backgroundColor: theme.colors.background}]}
        edges={['bottom']}>
        <View style={styles.permissionContainer}>
          <Surface
            style={[styles.permissionCard, {backgroundColor: theme.colors.surfaceVariant}]}
            elevation={1}>
            <Icon name="map-marker-off" size={64} color={theme.colors.error} />
            <Text
              variant="headlineSmall"
              style={[styles.permissionTitle, {color: theme.colors.onSurface}]}>
              Permiso de Ubicación
            </Text>
            <Text
              variant="bodyMedium"
              style={[styles.permissionDescription, {color: theme.colors.onSurfaceVariant}]}>
              Has rechazado el permiso de ubicación. Guidy necesita acceso a tu ubicación para funcionar correctamente.
            </Text>
            <Button
              mode="contained"
              onPress={handlePermissionRequest}
              style={styles.permissionButton}
              icon="map-marker">
              Conceder Permiso
            </Button>
            <Button
              mode="outlined"
              onPress={openAppSettings}
              style={styles.settingsButton}
              icon="cog">
              Abrir Configuración
            </Button>
          </Surface>
        </View>
      </SafeAreaView>
    );
  }

  // Permission blocked (permanently denied) screen
  if (permissionStatus === 'blocked') {
    return (
      <SafeAreaView
        style={[styles.container, {backgroundColor: theme.colors.background}]}
        edges={['bottom']}>
        <View style={styles.permissionContainer}>
          <Surface
            style={[styles.permissionCard, {backgroundColor: theme.colors.surfaceVariant}]}
            elevation={1}>
            <Icon name="lock" size={64} color={theme.colors.error} />
            <Text
              variant="headlineSmall"
              style={[styles.permissionTitle, {color: theme.colors.onSurface}]}>
              Permiso Bloqueado
            </Text>
            <Text
              variant="bodyMedium"
              style={[styles.permissionDescription, {color: theme.colors.onSurfaceVariant}]}>
              Has marcado "No volver a preguntar". Para usar Guidy, necesitas habilitar el permiso de ubicación en la configuración de la aplicación.
            </Text>
            <Button
              mode="contained"
              onPress={openAppSettings}
              style={styles.permissionButton}
              icon="cog">
              Abrir Configuración
            </Button>
          </Surface>
        </View>
      </SafeAreaView>
    );
  }

  // Initial loading state
  if (permissionStatus !== 'granted' && permissionStatus !== 'limited') {
    return (
      <SafeAreaView
        style={[styles.container, {backgroundColor: theme.colors.background}]}
        edges={['bottom']}>
        <View style={styles.permissionContainer}>
          <Surface
            style={[styles.permissionCard, {backgroundColor: theme.colors.surfaceVariant}]}
            elevation={1}>
            <Icon name="crosshairs-gps" size={64} color={theme.colors.primary} />
            <Text
              variant="headlineSmall"
              style={[styles.permissionTitle, {color: theme.colors.onSurface}]}>
              Permiso de Ubicación
            </Text>
            <Text
              variant="bodyMedium"
              style={[styles.permissionDescription, {color: theme.colors.onSurfaceVariant}]}>
              Guidy necesita acceso a tu ubicación para mostrarte puntos de interés cercanos y guiarte durante los recorridos.
            </Text>
            <Button
              mode="contained"
              onPress={handlePermissionRequest}
              style={styles.permissionButton}
              icon="map-marker">
              Conceder Permiso
            </Button>
          </Surface>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, {backgroundColor: theme.colors.background}]}
      edges={['bottom']}>
      {/* Map Section */}
      <View style={[styles.mapContainer, {height: mapHeight}]}>
        <OpenStreetMap
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={true}
          showsScale={true}
          followsUserLocation={isFollowingUser}
        />
        
        {/* Center on User FAB */}
        <FAB
          icon={isFollowingUser ? 'crosshairs-gps' : 'map-marker'}
          style={[styles.fab, {backgroundColor: theme.colors.primaryContainer}]}
          color={theme.colors.primary}
          size="small"
          onPress={centerOnUser}
        />
      </View>

      {/* GPS Status Card */}
      <Surface
        style={[
          styles.gpsStatusCard,
          {backgroundColor: theme.colors.primaryContainer},
        ]}
        elevation={1}>
        <View style={styles.gpsStatusRow}>
          <Icon
            name={gpsStatus === 'active' ? 'crosshairs-gps' : 'crosshairs'}
            size={28}
            color={getGpsStatusColor()}
          />
          <View style={styles.gpsStatusInfo}>
            <Text
              variant="titleSmall"
              style={{color: getGpsStatusColor()}}>
              {getGpsStatusText()}
            </Text>
            <View style={styles.statusRow}>
              <Icon
                name={getPermissionIcon()}
                size={14}
                color={theme.colors.onPrimaryContainer}
              />
              <Text
                variant="bodySmall"
                style={{color: theme.colors.onPrimaryContainer, marginLeft: 4}}>
                {getPermissionText()}
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.statusDot,
              {backgroundColor: getGpsStatusColor()},
            ]}
          />
        </View>
      </Surface>

      {/* Coordinates Card */}
      <Surface style={[styles.coordinatesCard, {backgroundColor: theme.colors.surface}]} elevation={1}>
        <View style={styles.coordRow}>
          <View style={styles.coordItem}>
            <Icon name="latitude" size={18} color={theme.colors.primary} />
            <Text variant="bodySmall" style={{color: theme.colors.onSurfaceVariant}}>
              Lat
            </Text>
            <Text variant="titleMedium" style={{color: theme.colors.onSurface}}>
              {currentLocation ? formatLatitude(currentLocation.latitude) : (gpsStatus === 'searching' ? '...' : 'N/A')}
            </Text>
          </View>
          <View style={styles.coordItem}>
            <Icon name="longitude" size={18} color={theme.colors.primary} />
            <Text variant="bodySmall" style={{color: theme.colors.onSurfaceVariant}}>
              Lng
            </Text>
            <Text variant="titleMedium" style={{color: theme.colors.onSurface}}>
              {currentLocation ? formatLongitude(currentLocation.longitude) : (gpsStatus === 'searching' ? '...' : 'N/A')}
            </Text>
          </View>
          <View style={styles.coordItem}>
            <Icon name="target" size={18} color={theme.colors.primary} />
            <Text variant="bodySmall" style={{color: theme.colors.onSurfaceVariant}}>
              Prec
            </Text>
            <Text 
              variant="titleMedium" 
              style={{color: currentLocation ? getAccuracyLevelColor(currentLocation.accuracy) : theme.colors.onSurface}}>
              {currentLocation ? formatAccuracy(currentLocation.accuracy) : (gpsStatus === 'searching' ? '...' : 'N/A')}
            </Text>
          </View>
        </View>

        {/* Additional Info Row */}
        <View style={styles.additionalInfoRow}>
          <View style={styles.additionalInfoItem}>
            <Icon name="speedometer" size={16} color={theme.colors.secondary} />
            <Text variant="bodySmall" style={{color: theme.colors.onSurfaceVariant, marginLeft: 4}}>
              {currentLocation ? formatSpeed(currentLocation.speed ?? null) : (gpsStatus === 'searching' ? '...' : 'N/A')}
            </Text>
          </View>
          <View style={styles.additionalInfoItem}>
            <Icon name="clock-outline" size={16} color={theme.colors.secondary} />
            <Text variant="bodySmall" style={{color: theme.colors.onSurfaceVariant, marginLeft: 4}}>
              {lastUpdate ? formatLastUpdate(lastUpdate) : (gpsStatus === 'searching' ? '...' : 'N/A')}
            </Text>
          </View>
        </View>
      </Surface>

      {/* Error Display */}
      {error && (
        <Surface
          style={[styles.errorCard, {backgroundColor: theme.colors.errorContainer}]}
          elevation={1}>
          <Icon name="alert-circle" size={20} color={theme.colors.error} />
          <Text
            variant="bodySmall"
            style={[styles.errorText, {color: theme.colors.onErrorContainer}]}>
            {error.message}
          </Text>
        </Surface>
      )}

      {/* Control Buttons */}
      <View style={styles.controlsContainer}>
        <Button
          mode={isTracking ? 'contained' : 'outlined'}
          onPress={isTracking ? stopTracking : startTracking}
          icon={isTracking ? 'stop' : 'play'}
          style={styles.controlButton}>
          {isTracking ? 'Detener' : 'Iniciar GPS'}
        </Button>
        <Button
          mode={isFollowingUser ? 'contained' : 'outlined'}
          onPress={toggleFollowMode}
          icon="crosshairs-gps"
          style={styles.controlButton}>
          {isFollowingUser ? 'Siguiendo' : 'Seguir'}
        </Button>
      </View>
    </SafeAreaView>
  );
}

// Helper functions
function getAccuracyLevelColor(accuracy: number): string {
  if (accuracy <= 5) return '#4CAF50';
  if (accuracy <= 15) return '#8BC34A';
  if (accuracy <= 50) return '#FF9800';
  if (accuracy <= 100) return '#FF5722';
  return '#F44336';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    width: '100%',
    overflow: 'hidden',
  },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  permissionCard: {
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    gap: spacing.md,
    maxWidth: 400,
    width: '100%',
  },
  permissionTitle: {
    fontWeight: '600',
    textAlign: 'center',
  },
  permissionDescription: {
    textAlign: 'center',
  },
  permissionButton: {
    marginTop: spacing.md,
  },
  settingsButton: {
    marginTop: spacing.sm,
  },
  gpsStatusCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  gpsStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  gpsStatusInfo: {
    flex: 1,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  coordinatesCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  coordRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  coordItem: {
    alignItems: 'center',
    gap: 2,
  },
  additionalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  additionalInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  errorText: {
    flex: 1,
  },
  controlsContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  controlButton: {
    flex: 1,
  },
});

export default RecorridoScreen;
