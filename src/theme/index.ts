/**
 * GUIDY - Theme Configuration
 * Centralized theme using React Native Paper MD3 with Design Tokens
 */

import {MD3LightTheme, MD3DarkTheme, configureFonts} from 'react-native-paper';
import type {MD3Theme} from 'react-native-paper';
import {colors} from './colors';
import {spacing} from './spacing';
import {typography} from './typography';
import {radius, componentRadius, borderRadius} from './radius';

const fontConfig = {
  fontFamily: 'System',
};

export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  fonts: configureFonts({config: fontConfig}),
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.brand.primary,
    primaryContainer: colors.brand.background,
    secondary: colors.brand.secondary,
    secondaryContainer: colors.surface.elevated,
    tertiary: colors.brand.secondary,
    tertiaryContainer: colors.surface.elevated,
    surface: colors.brand.background,
    surfaceVariant: colors.surface.elevated,
    surfaceDisabled: 'rgba(28, 27, 31, 0.12)',
    background: colors.brand.background,
    error: colors.semantic.error,
    errorContainer: colors.surface.elevated,
    onPrimary: '#FFFFFF',
    onPrimaryContainer: colors.text.primary,
    onSecondary: '#FFFFFF',
    onSecondaryContainer: colors.text.primary,
    onTertiary: '#FFFFFF',
    onTertiaryContainer: colors.text.primary,
    onSurface: colors.text.primary,
    onSurfaceVariant: colors.text.secondary,
    onSurfaceDisabled: 'rgba(28, 27, 31, 0.38)',
    onError: '#FFFFFF',
    onErrorContainer: colors.text.primary,
    onBackground: colors.text.primary,
    outline: colors.border.default,
    outlineVariant: colors.border.strong,
    inverseSurface: colors.text.primary,
    inverseOnSurface: colors.text.inverse,
    inversePrimary: colors.brand.primary,
    shadow: '#000000',
    scrim: '#000000',
    backdrop: 'rgba(0, 0, 0, 0.5)',
    elevation: {
      level0: 'transparent',
      level1: colors.surface.elevated,
      level2: colors.surface.elevated,
      level3: colors.surface.elevated,
      level4: colors.surface.elevated,
      level5: colors.surface.elevated,
    },
  },
};

export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  fonts: configureFonts({config: fontConfig}),
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.brand.primary,
    primaryContainer: '#1E3D2A',
    secondary: colors.brand.secondary,
    secondaryContainer: '#3D2E1F',
    tertiary: colors.brand.secondary,
    tertiaryContainer: '#3D2E1F',
    surface: '#1A1A1A',
    surfaceVariant: '#2D2D2D',
    surfaceDisabled: 'rgba(230, 225, 229, 0.12)',
    background: '#121212',
    error: '#EF5350',
    errorContainer: '#3D2020',
    onPrimary: '#FFFFFF',
    onPrimaryContainer: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onSecondaryContainer: '#FFFFFF',
    onTertiary: '#FFFFFF',
    onTertiaryContainer: '#FFFFFF',
    onSurface: '#FFFFFF',
    onSurfaceVariant: '#E0E0E0',
    onSurfaceDisabled: 'rgba(230, 225, 229, 0.38)',
    onError: '#000000',
    onErrorContainer: '#FFFFFF',
    onBackground: '#FFFFFF',
    outline: '#5C5C5C',
    outlineVariant: '#3D3D3D',
    inverseSurface: '#FFFFFF',
    inverseOnSurface: '#121212',
    inversePrimary: '#7BC89A',
    shadow: '#000000',
    scrim: '#000000',
    backdrop: 'rgba(0, 0, 0, 0.7)',
    elevation: {
      level0: 'transparent',
      level1: '#1E1E1E',
      level2: '#232323',
      level3: '#282828',
      level4: '#2D2D2D',
      level5: '#323232',
    },
  },
};

// Re-export design tokens
export {colors, spacing, typography, radius, componentRadius, borderRadius};
export default {lightTheme, darkTheme, colors, spacing, typography, radius, componentRadius, borderRadius};
