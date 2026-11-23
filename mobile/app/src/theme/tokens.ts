export const colors = {
  ink: {
    950: "#29272A",
    900: "#343135",
    800: "#444146",
    700: "#59565C",
  },
  brand: {
    950: "#0B514E",
    900: "#0E5C58",
    800: "#126B66",
    700: "#278D84",
  },
  stone: {
    50: "#F8F4EE",
    100: "#F1E8DB",
    200: "#E6D7C1",
    300: "#D7C2A2",
  },
  gold: {
    300: "#E8D18D",
    400: "#DEBC63",
    500: "#D6A83E",
    600: "#A97D20",
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
  background: "#F7F5F0",
  surface: colors.white,
  surfaceMuted: "#F1EEE8",
  surfaceStrong: colors.ink[950],
  textPrimary: colors.ink[950],
  textSecondary: "#62666A",
  textMuted: "#7A817F",
  textOnDark: colors.white,
  textOnDarkMuted: "rgba(255,255,255,0.72)",
  surfaceOnDark: "rgba(255,255,255,0.08)",
  borderOnDark: "rgba(255,255,255,0.12)",
  borderSoft: "#E2DED6",
  borderStrong: "#C8C1B5",
  primary: colors.brand[800],
  primaryPressed: colors.brand[950],
  accent: colors.gold[500],
  accentSoft: "#F5EBCF",
  success: colors.verdant[500],
  successSoft: "#E5F2E7",
  info: colors.teal[500],
  infoSoft: "#E4F2F0",
  warning: colors.gold[500],
  warningSoft: "#FAF0D8",
  danger: colors.ember[500],
  dangerSoft: "#FCEAE5",
  focus: colors.gold[500],
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
    shadowColor: colors.ink[950],
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  floating: {
    shadowColor: colors.ink[950],
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
};

export const motion = {
  quick: 140,
  normal: 220,
  slow: 320,
};

export const layout = {
  screenPadding: spacing[5],
  cardGap: spacing[3],
  sectionGap: spacing[7],
  buttonHeight: 54,
  inputHeight: 56,
  tabBarHeight: 72,
};
