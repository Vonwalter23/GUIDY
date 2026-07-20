/**
 * GUIDY - Design System Spacing
 * Consistent spacing scale for the app
 */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const iconSizes = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 48,
  xxl: 64,
} as const;

export const touchTargets = {
  minimum: 48, // Minimum touch target for accessibility
  comfortable: 56,
} as const;

export type Spacing = typeof spacing;
export default spacing;
