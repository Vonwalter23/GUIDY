/**
 * GUIDY - Configuration Screen
 * Placeholder screen with interest categories
 */

import React from 'react';
import {View, StyleSheet, ScrollView} from 'react-native';
import {Text, List, Divider, useTheme} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';

import {spacing} from '../theme';

type RootStackParamList = {
  Home: undefined;
  Configuracion: undefined;
  Recorrido: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'Configuracion'>;

const interests = [
  {icon: 'castle', title: 'Historia'},
  {icon: 'office-building', title: 'Arquitectura'},
  {icon: 'palette', title: 'Cultura'},
  {icon: 'food', title: 'Gastronomía'},
  {icon: 'lightbulb-outline', title: 'Curiosidades'},
  {icon: 'store', title: 'Servicios cercanos'},
];

function ConfiguracionScreen({}: Props): React.JSX.Element {
  const theme = useTheme();

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.colors.background}]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headlineMedium" style={[styles.title, {color: theme.colors.onBackground}]}>
          Configuración
        </Text>
        <Text variant="bodyMedium" style={[styles.subtitle, {color: theme.colors.onSurfaceVariant}]}>
          Selecciona tus intereses para personalizar tu experiencia.
        </Text>

        <View style={styles.listContainer}>
          {interests.map((item, index) => (
            <React.Fragment key={item.title}>
              <List.Item
                title={item.title}
                left={props => <List.Icon {...props} icon={item.icon} color={theme.colors.primary} />}
                right={props => <List.Icon {...props} icon="chevron-right" />}
                style={[styles.listItem, {backgroundColor: theme.colors.surface}]}
                titleStyle={{color: theme.colors.onSurface}}
              />
              {index < interests.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  subtitle: {
    marginBottom: spacing.lg,
  },
  listContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  listItem: {
    paddingVertical: spacing.sm,
  },
});

export default ConfiguracionScreen;
