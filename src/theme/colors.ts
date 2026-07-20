/**
 * GUIDY - Design System Colors
 * Official brand colors as Design Tokens
 */

export const colors = {
  // Brand Colors
  brand: {
    primary: '#2E5B3D', // Verde Principal (Bosque)
    secondary: '#9B724C', // Marrón Secundario (Tierra)
    background: '#F4EFE6', // Beige de Fondo (Suave)
  },

  // Semantic Colors
  semantic: {
    success: '#2E5B3D',
    warning: '#E6A800',
    error: '#D32F2F',
    info: '#1976D2',
  },

  // Text Colors
  text: {
    primary: '#1A1A1A',
    secondary: '#9B724C',
    disabled: '#BDBDBD',
    inverse: '#FFFFFF',
  },

  // Surface Colors
  surface: {
    default: '#F4EFE6',
    elevated: '#FFFFFF',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },

  // Border Colors
  border: {
    default: '#E0E0E0',
    strong: '#BDBDBD',
  },

  // Icon Colors
  icon: {
    primary: '#2E5B3D',
    secondary: '#9B724C',
    inverse: '#FFFFFF',
  },

  // Map POI Colors
  poi: {
    primary: '#2E5B3D',
    background: '#F4EFE6',
    border: '#9B724C',
  },

  // Audio Player Colors
  audioPlayer: {
    background: '#F4EFE6',
    playButton: '#2E5B3D',
    progress: '#9B724C',
  },
} as const;

export type Colors = typeof colors;
export default colors;
