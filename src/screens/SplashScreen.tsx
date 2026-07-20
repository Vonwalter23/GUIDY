/**
 * GUIDY - Splash Screen
 * Initial loading screen
 */

import React, {useEffect} from 'react';
import {View, StyleSheet} from 'react-native';
import {Text} from 'react-native-paper';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';

import Logo from '../components/Logo';
import {lightTheme} from '../theme';

type RootStackParamList = {
  Splash: undefined;
  Home: undefined;
  Configuracion: undefined;
  Recorrido: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

function SplashScreen({navigation}: Props): React.JSX.Element {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Home');
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={[styles.container, {backgroundColor: lightTheme.colors.primary}]}>
      <Logo size="large" />
      <Text style={styles.title}>Guidy</Text>
      <Text style={styles.subtitle}>AI Audio Tourist Companion</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
});

export default SplashScreen;
