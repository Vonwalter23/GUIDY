/**
 * GUIDY - Recorrido Screen
 * Screen showing GPS status and location information
 */

import React, {useEffect} from 'react';
import {View, StyleSheet, ScrollView} from 'react-native';
import {Text, Surface, useTheme, Button, Divider} from 'react-native-paper';
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
  getAccuracyLevel,
} from '../services/location';

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
    requestPermission,
    startTracking,
    stopTracking,
  } = useLocation();

  // Start tracking when permission is granted
  useEffect(() => {
    if (permissionStatus === 'granted' && !isTracking) {
      startTracking();
    }
  }, [permissionStatus, isTracking, startTracking]);

  const getGpsStatusColor = () => {
    switch (gpsStatus) {
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
      case 'active':
        return 'GPS Activo';
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

  // Permission request screen
  if (permissionStatus !== 'granted') {
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
              Guidy necesita acceso a tu ubicación para mostrarte puntos de interés cercanos y
              guiarte durante los recorridos.
            </Text>
            <Button
              mode="contained"
              onPress={requestPermission}
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* GPS Status Indicator */}
        <Surface
          style={[
            styles.gpsStatusCard,
            {backgroundColor: theme.colors.primaryContainer},
          ]}
          elevation={1}>
          <View style={styles.gpsStatusRow}>
            <Icon
              name={gpsStatus === 'active' ? 'crosshairs-gps' : 'crosshairs'}
              size={32}
              color={getGpsStatusColor()}
            />
            <View style={styles.gpsStatusInfo}>
              <Text
                variant="titleMedium"
                style={{color: getGpsStatusColor()}}>
                {getGpsStatusText()}
              </Text>
              <Text
                variant="bodySmall"
                style={{color: theme.colors.onPrimaryContainer}}>
                {getPermissionText()}
              </Text>
            </View>
            <View
              style={[
                styles.statusDot,
                {backgroundColor: getGpsStatusColor()},
              ]}
            />
          </View>
        </Surface>

        {/* Location Information */}
        <Surface style={[styles.infoCard, {backgroundColor: theme.colors.surface}]} elevation={1}>
          <Text
            variant="titleMedium"
            style={[styles.sectionTitle, {color: theme.colors.onSurface}]}>
            Información de Ubicación
          </Text>

          <Divider style={styles.divider} />

          {/* Latitude */}
          <View style={styles.infoRow}>
            <View style={styles.infoLabel}>
              <Icon name="latitude" size={20} color={theme.colors.primary} />
              <Text variant="bodyMedium" style={{color: theme.colors.onSurfaceVariant}}>
                Latitud
              </Text>
            </View>
            <Text
              variant="bodyLarge"
              style={[styles.infoValue, {color: theme.colors.onSurface}]}>
              {currentLocation ? formatLatitude(currentLocation.latitude) : 'N/A'}
            </Text>
          </View>

          {/* Longitude */}
          <View style={styles.infoRow}>
            <View style={styles.infoLabel}>
              <Icon name="longitude" size={20} color={theme.colors.primary} />
              <Text variant="bodyMedium" style={{color: theme.colors.onSurfaceVariant}}>
                Longitud
              </Text>
            </View>
            <Text
              variant="bodyLarge"
              style={[styles.infoValue, {color: theme.colors.onSurface}]}>
              {currentLocation ? formatLongitude(currentLocation.longitude) : 'N/A'}
            </Text>
          </View>

          {/* Accuracy */}
          <View style={styles.infoRow}>
            <View style={styles.infoLabel}>
              <Icon name="target" size={20} color={theme.colors.primary} />
              <Text variant="bodyMedium" style={{color: theme.colors.onSurfaceVariant}}>
                Precisión
              </Text>
            </View>
            <View style={styles.accuracyContainer}>
              <Text
                variant="bodyLarge"
                style={[styles.infoValue, {color: theme.colors.onSurface}]}>
                {currentLocation ? formatAccuracy(currentLocation.accuracy) : 'N/A'}
              </Text>
              {currentLocation && (
                <Text
                  variant="bodySmall"
                  style={[styles.accuracyLevel, {color: getAccuracyLevelColor(currentLocation.accuracy)}]}>
                  {getAccuracyLevel(currentLocation.accuracy)}
                </Text>
              )}
            </View>
          </View>

          {/* Speed */}
          <View style={styles.infoRow}>
            <View style={styles.infoLabel}>
              <Icon name="speedometer" size={20} color={theme.colors.primary} />
              <Text variant="bodyMedium" style={{color: theme.colors.onSurfaceVariant}}>
                Velocidad
              </Text>
            </View>
            <Text
              variant="bodyLarge"
              style={[styles.infoValue, {color: theme.colors.onSurface}]}>
              {currentLocation ? formatSpeed(currentLocation.speed ?? null) : 'N/A'}
            </Text>
          </View>

          <Divider style={styles.divider} />

          {/* Last Update */}
          <View style={styles.infoRow}>
            <View style={styles.infoLabel}>
              <Icon name="clock-outline" size={20} color={theme.colors.primary} />
              <Text variant="bodyMedium" style={{color: theme.colors.onSurfaceVariant}}>
                Última Actualización
              </Text>
            </View>
            <Text
              variant="bodyLarge"
              style={[styles.infoValue, {color: theme.colors.onSurface}]}>
              {lastUpdate ? formatLastUpdate(lastUpdate) : 'Nunca'}
            </Text>
          </View>
        </Surface>

        {/* Error Display */}
        {error && (
          <Surface
            style={[styles.errorCard, {backgroundColor: theme.colors.errorContainer}]}
            elevation={1}>
            <Icon name="alert-circle" size={24} color={theme.colors.error} />
            <Text
              variant="bodyMedium"
              style={[styles.errorText, {color: theme.colors.onErrorContainer}]}>
              {error.message}
            </Text>
          </Surface>
        )}

        {/* Control Buttons */}
        <View style={styles.controlsRow}>
          <Button
            mode="contained"
            onPress={startTracking}
            disabled={isTracking}
            icon="play"
            style={styles.controlButton}>
            Iniciar GPS
          </Button>
          <Button
            mode="outlined"
            onPress={stopTracking}
            disabled={!isTracking}
            icon="stop"
            style={styles.controlButton}>
            Detener GPS
          </Button>
        </View>
      </ScrollView>
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
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
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
  gpsStatusCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  gpsStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  gpsStatusInfo: {
    flex: 1,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  infoCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  divider: {
    marginVertical: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  infoLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoValue: {
    fontWeight: '500',
  },
  accuracyContainer: {
    alignItems: 'flex-end',
  },
  accuracyLevel: {
    textTransform: 'capitalize',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  errorText: {
    flex: 1,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  controlButton: {
    flex: 1,
  },
});

export default RecorridoScreen;
