/**
 * GUIDY - Splash Screen
 * Official splash screen with brand imagery
 */

import React, {useEffect} from 'react';
import {View, StyleSheet, Image, StatusBar} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';

import {colors} from '../theme';

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
    }, 2500);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.brand.primary} />
      <Image
        source={require('../assets/images/Splash.png')}
        style={styles.image}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

export default SplashScreen;
