/**
 * GUIDY - Design System Border Radius
 * Consistent border radius scale for the app
 */

export const radius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  full: 9999,
} as const;

// Alias for borderRadius (common name)
export const borderRadius = radius;

// Component-specific radii
export const componentRadius = {
  button: 12,
  card: 16,
  input: 8,
  bottomSheet: 24,
  chip: 20,
  avatar: 9999,
  iconButton: 9999,
} as const;

export type Radius = typeof radius;
export default radius;
