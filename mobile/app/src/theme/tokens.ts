export const colors = {
  ink: {
    950: "#111315",
    900: "#171A1D",
    800: "#20252A",
    700: "#313942",
  },
  stone: {
    50: "#F8F4EE",
    100: "#F1E8DB",
    200: "#E6D7C1",
    300: "#D7C2A2",
  },
  gold: {
    300: "#E7C975",
    400: "#D9B553",
    500: "#C89B2D",
    600: "#A57D1F",
  },
  ember: {
    300: "#F48A6A",
    400: "#EA6843",
    500: "#D94B24",
    600: "#B93A18",
  },
  teal: {
    300: "#72C7C1",
    400: "#45B2AA",
    500: "#2B938B",
    600: "#1D726C",
  },
  verdant: {
    300: "#8CCD8E",
    400: "#63B768",
    500: "#429C49",
    600: "#2F7A36",
  },
  sky: {
    300: "#99C7F3",
    400: "#69ACEA",
    500: "#3E8FD9",
  },
  white: "#FFFFFF",
  black: "#000000",
  transparent: "transparent",
};

export const semanticColors = {
  background: colors.stone[50],
  surface: colors.white,
  surfaceMuted: "#FBF8F3",
  surfaceStrong: colors.ink[900],
  textPrimary: colors.ink[900],
  textSecondary: "#505B64",
  textMuted: "#7C847D",
  textOnDark: colors.white,
  borderSoft: "#E7DED1",
  borderStrong: "#D7C2A2",
  primary: colors.ember[500],
  primaryPressed: colors.ember[600],
  accent: colors.gold[500],
  accentSoft: "#F5E6BF",
  success: colors.verdant[500],
  info: colors.teal[500],
  warning: colors.gold[500],
  danger: colors.ember[500],
  overlay: "rgba(17, 19, 21, 0.48)",
};

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
};

export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
};

export const typography = {
  fontFamily: {
    display: "Sora_700Bold",
    displayMedium: "Sora_600SemiBold",
    body: "IBMPlexSans_400Regular",
    bodyMedium: "IBMPlexSans_500Medium",
    bodySemibold: "IBMPlexSans_600SemiBold",
  },
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    "2xl": 24,
    "3xl": 30,
    "4xl": 36,
  },
  lineHeight: {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 26,
    xl: 28,
    "2xl": 32,
    "3xl": 38,
    "4xl": 44,
  },
};

export const shadows = {
  card: {
    shadowColor: "#101214",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  floating: {
    shadowColor: "#101214",
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
};

export const motion = {
  quick: 140,
  normal: 220,
  slow: 320,
};

export const layout = {
  screenPadding: spacing[5],
  cardGap: spacing[4],
  sectionGap: spacing[8],
  buttonHeight: 54,
  inputHeight: 56,
  tabBarHeight: 78,
};
