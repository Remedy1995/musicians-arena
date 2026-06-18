import { colors, layout, motion, radius, semanticColors, shadows, spacing, typography } from "./tokens";

export const theme = {
  colors,
  semanticColors,
  spacing,
  radius,
  typography,
  shadows,
  motion,
  layout,
};

export type AppTheme = typeof theme;
