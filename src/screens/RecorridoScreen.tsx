/**
 * GUIDY - Recorrido Screen
 * Placeholder screen for tour/map view
 */

import React from 'react';
import {View, StyleSheet} from 'react-native';
import {Text, Surface, useTheme} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';

import {spacing} from '../theme';

type RootStackParamList = {
  Home: undefined;
  Configuracion: undefined;
  Recorrido: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'Recorrido'>;

function RecorridoScreen({}: Props): React.JSX.Element {
  const theme = useTheme();

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.colors.background}]} edges={['bottom']}>
      <View style={styles.content}>
        <Surface style={[styles.mapPlaceholder, {backgroundColor: theme.colors.surfaceVariant}]} elevation={0}>
          <Icon name="map" size={80} color={theme.colors.onSurfaceVariant} />
          <Text variant="headlineSmall" style={[styles.mapText, {color: theme.colors.onSurfaceVariant}]}>
            Mapa próximamente
          </Text>
        </Surface>

        <Surface style={[styles.statusCard, {backgroundColor: theme.colors.primaryContainer}]} elevation={1}>
          <Icon name="information-outline" size={24} color={theme.colors.onPrimaryContainer} />
          <Text
            variant="bodyLarge"
            style={[styles.statusText, {color: theme.colors.onPrimaryContainer}]}>
            Guidy listo para comenzar el recorrido.
          </Text>
        </Surface>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  mapPlaceholder: {
    flex: 1,
    width: '100%',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  mapText: {
    fontWeight: '500',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    gap: spacing.sm,
    width: '100%',
  },
  statusText: {
    flex: 1,
    textAlign: 'center',
  },
});

export default RecorridoScreen;
