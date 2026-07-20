/**
 * GUIDY - Theme Configuration
 * Centralized theme using React Native Paper MD3
 */

import {MD3LightTheme, MD3DarkTheme, configureFonts} from 'react-native-paper';
import type {MD3Theme} from 'react-native-paper';

const fontConfig = {
  fontFamily: 'System',
};

export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  fonts: configureFonts({config: fontConfig}),
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6200EE',
    primaryContainer: '#E8DEF8',
    secondary: '#03DAC6',
    secondaryContainer: '#CCF5F0',
    tertiary: '#7D5260',
    tertiaryContainer: '#FFD8E4',
    surface: '#FFFBFE',
    surfaceVariant: '#E7E0EC',
    surfaceDisabled: 'rgba(28, 27, 31, 0.12)',
    background: '#FFFBFE',
    error: '#B3261E',
    errorContainer: '#F9DEDC',
    onPrimary: '#FFFFFF',
    onPrimaryContainer: '#21005D',
    onSecondary: '#000000',
    onSecondaryContainer: '#00504A',
    onTertiary: '#FFFFFF',
    onTertiaryContainer: '#31111D',
    onSurface: '#1C1B1F',
    onSurfaceVariant: '#49454F',
    onSurfaceDisabled: 'rgba(28, 27, 31, 0.38)',
    onError: '#FFFFFF',
    onErrorContainer: '#410E0B',
    onBackground: '#1C1B1F',
    outline: '#79747E',
    outlineVariant: '#CAC4D0',
    inverseSurface: '#313033',
    inverseOnSurface: '#F4EFF4',
    inversePrimary: '#D0BCFF',
    shadow: '#000000',
    scrim: '#000000',
    backdrop: 'rgba(50, 47, 55, 0.4)',
    elevation: {
      level0: 'transparent',
      level1: '#F7F2FA',
      level2: '#F3EDF7',
      level3: '#EFE9F4',
      level4: '#EDE7F2',
      level5: '#EBE4F0',
    },
  },
};

export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  fonts: configureFonts({config: fontConfig}),
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#D0BCFF',
    primaryContainer: '#4F378B',
    secondary: '#03DAC6',
    secondaryContainer: '#00504A',
    tertiary: '#EFB8C8',
    tertiaryContainer: '#633B48',
    surface: '#1C1B1F',
    surfaceVariant: '#49454F',
    surfaceDisabled: 'rgba(230, 225, 229, 0.12)',
    background: '#1C1B1F',
    error: '#F2B8B5',
    errorContainer: '#8C1D18',
    onPrimary: '#381E72',
    onPrimaryContainer: '#EADDFF',
    onSecondary: '#000000',
    onSecondaryContainer: '#CCF5F0',
    onTertiary: '#492532',
    onTertiaryContainer: '#FFD8E4',
    onSurface: '#E6E1E5',
    onSurfaceVariant: '#CAC4D0',
    onSurfaceDisabled: 'rgba(230, 225, 229, 0.38)',
    onError: '#601410',
    onErrorContainer: '#F9DEDC',
    onBackground: '#E6E1E5',
    outline: '#938F99',
    outlineVariant: '#49454F',
    inverseSurface: '#E6E1E5',
    inverseOnSurface: '#313033',
    inversePrimary: '#6750A4',
    shadow: '#000000',
    scrim: '#000000',
    backdrop: 'rgba(50, 47, 55, 0.4)',
    elevation: {
      level0: 'transparent',
      level1: '#2D2831',
      level2: '#332D38',
      level3: '#38323E',
      level4: '#3A3340',
      level5: '#3D3643',
    },
  },
};

// Spacing constants
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export default {lightTheme, darkTheme, spacing};
