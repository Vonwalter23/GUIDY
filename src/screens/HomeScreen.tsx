/**
 * GUIDY - Home Screen
 * Welcome screen with logo, title, and action buttons
 */

import React from 'react';
import {View, StyleSheet, ScrollView} from 'react-native';
import {Text, Button, Surface, useTheme} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';

import Logo from '../components/Logo';
import {spacing} from '../theme';

type RootStackParamList = {
  Home: undefined;
  Configuracion: undefined;
  Recorrido: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

function HomeScreen({navigation}: Props): React.JSX.Element {
  const theme = useTheme();

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.logoSection}>
          <Logo size="large" />
        </View>

        <View style={styles.textSection}>
          <Text variant="displaySmall" style={[styles.title, {color: theme.colors.onBackground}]}>
            Guidy
          </Text>
          <Text
            variant="titleLarge"
            style={[styles.subtitle, {color: theme.colors.primary}]}>
            AI Audio Tourist Companion
          </Text>
        </View>

        <Surface style={[styles.welcomeCard, {backgroundColor: theme.colors.surface}]} elevation={1}>
          <Text variant="bodyLarge" style={[styles.welcomeText, {color: theme.colors.onSurface}]}>
            Hola, soy Guidy. Te acompaño a descubrir la ciudad.
          </Text>
        </Surface>

        <View style={styles.buttonsSection}>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('Recorrido')}
            style={styles.button}
            contentStyle={styles.buttonContent}
            icon="map-marker-path"
            labelStyle={styles.buttonLabel}>
            Iniciar recorrido
          </Button>

          <Button
            mode="outlined"
            onPress={() => navigation.navigate('Configuracion')}
            style={styles.button}
            contentStyle={styles.buttonContent}
            icon="cog"
            labelStyle={styles.buttonLabel}>
            Configuración
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  logoSection: {
    marginBottom: spacing.xl,
  },
  textSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  subtitle: {
    textAlign: 'center',
    fontWeight: '500',
  },
  welcomeCard: {
    padding: spacing.lg,
    borderRadius: 16,
    marginBottom: spacing.xl,
    width: '100%',
  },
  welcomeText: {
    textAlign: 'center',
    lineHeight: 28,
  },
  buttonsSection: {
    width: '100%',
    gap: spacing.md,
  },
  button: {
    borderRadius: 12,
  },
  buttonContent: {
    paddingVertical: spacing.sm,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HomeScreen;
