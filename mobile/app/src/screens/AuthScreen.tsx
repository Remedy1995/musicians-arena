import { useEffect, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AuthMode } from "../AppShell";
import { ApiError } from "../services/api/client";
import { api } from "../services/api";
import { AuthResponse } from "../services/api/types";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { SecondaryButton } from "../components/SecondaryButton";
import { TextField } from "../components/TextField";
import { theme } from "../theme/theme";

type AuthScreenProps = {
  initialMode: AuthMode;
  onAuthenticated: (session: AuthResponse) => void;
  onBack: () => void;
  onSwitchMode: (mode: AuthMode) => void;
};

export function AuthScreen({ initialMode, onAuthenticated, onBack, onSwitchMode }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [form, setForm] = useState({
    username: "",
    password: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    setMode(initialMode);
    setPasswordTouched(false);
    setError(null);
  }, [initialMode]);

  const isLogin = mode === "login";
  const passwordRules = [
    { label: "8 or more characters", valid: form.password.length >= 8 },
    { label: "At least one letter", valid: /[A-Za-z]/.test(form.password) },
    { label: "At least one number", valid: /\d/.test(form.password) },
  ];
  const passwordIsValid = passwordRules.every((rule) => rule.valid) && !/^\d+$/.test(form.password);
  const showPasswordGuide = mode === "register" && passwordTouched && Boolean(form.password) && !passwordIsValid;

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setPasswordTouched(false);
    setError(null);
    onSwitchMode(nextMode);
  }

  async function handleSubmit() {
    if (!form.username.trim()) {
      setError("Username is required.");
      return;
    }
    if (!form.password) {
      if (mode === "register") setPasswordTouched(true);
      setError("Password is required.");
      return;
    }
    if (mode === "register" && !passwordIsValid) {
      setPasswordTouched(true);
      setError("Use a medium-strength password with 8 characters, a letter, and a number.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const session =
        mode === "login"
          ? await api.login({
              username: form.username,
              password: form.password,
            })
          : await api.register({
              username: form.username,
              email: form.email,
              phone: form.phone,
              password: form.password,
              display_name: form.username,
            });
      onAuthenticated(session);
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
      } else if (caught instanceof Error) {
        setError(caught.message);
      } else {
        setError("Authentication failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen contentContainerStyle={[styles.screenContent, isLogin ? styles.loginScreenContent : undefined]}>
      <LinearGradient colors={[theme.colors.ink[950], theme.colors.ink[800]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.brandStage}>
        <View style={[styles.stageOrb, styles.stageOrbTop]} />
        <View style={[styles.stageOrb, styles.stageOrbBottom]} />
        <View style={styles.brandHeader}>
          <View style={styles.brandMark}>
            <MaterialCommunityIcons name="music-clef-treble" size={25} color={theme.semanticColors.textOnDark} />
          </View>
          <View style={styles.brandCopy}>
            <Text style={styles.brandName}>MUSICIAN'S ARENA</Text>
            <Text style={styles.brandTagline}>One account. Every stage.</Text>
          </View>
          <View style={styles.liveMark}>
            <View style={styles.liveDot} />
            <Text style={styles.liveLabel}>LIVE</Text>
          </View>
        </View>
        <View style={styles.stageCopy}>
          <Text style={styles.stageKicker}>{isLogin ? "WELCOME BACK" : "YOUR NEXT CHAPTER"}</Text>
          <Text style={styles.stageTitle}>{isLogin ? "Return to your next stage." : "Find your place in the sound."}</Text>
          <Text style={styles.stageBody}>
            {isLogin
              ? "Connect with the people and opportunities that keep your work moving."
              : "Meet the talent, organizers, and opportunities that make live music happen."}
          </Text>
        </View>
        <View style={styles.stagePills}>
          <View style={styles.stagePill}>
            <MaterialCommunityIcons name="music-note-outline" size={16} color={theme.colors.gold[300]} />
            <Text style={styles.stagePillLabel}>Talent</Text>
          </View>
          <View style={styles.stagePill}>
            <MaterialCommunityIcons name="calendar-star-outline" size={16} color={theme.colors.gold[300]} />
            <Text style={styles.stagePillLabel}>Opportunities</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.authCard}>
        <View style={styles.header}>
          <View style={styles.authIntroRow}>
            <View style={styles.authIntroIcon}>
              <MaterialCommunityIcons name={isLogin ? "login-variant" : "account-plus-outline"} size={19} color={theme.semanticColors.primary} />
            </View>
            <View style={styles.authIntroCopy}>
              <Text style={styles.kicker}>{isLogin ? "Welcome back" : "Join the community"}</Text>
              <Text style={styles.title}>{isLogin ? "Pick up where you left off." : "Create your arena account."}</Text>
            </View>
          </View>
          <Text style={styles.body}>
            {isLogin
              ? "Sign in once to access your available workspaces."
              : "Create one account, then add a talent profile, an organizer profile, or both later."}
          </Text>
        </View>

        <View style={styles.modeSwitch}>
          <Pressable
            onPress={() => {
              switchMode("login");
            }}
            style={[styles.modeChip, mode === "login" ? styles.modeChipActive : undefined]}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === "login" }}
          >
            <Text style={[styles.modeLabel, mode === "login" ? styles.modeLabelActive : undefined]}>Sign in</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              switchMode("register");
            }}
            style={[styles.modeChip, mode === "register" ? styles.modeChipActive : undefined]}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === "register" }}
          >
            <Text style={[styles.modeLabel, mode === "register" ? styles.modeLabelActive : undefined]}>Register</Text>
          </Pressable>
        </View>

        <View style={styles.form}>
          <TextField
            label="Username"
            value={form.username}
            onChangeText={(value) => setForm((current) => ({ ...current, username: value }))}
            placeholder="Choose a username"
            leftAccessory={<MaterialCommunityIcons name="account-outline" size={20} color={theme.semanticColors.textMuted} />}
          />
          {mode === "register" ? (
            <>
              <TextField
                label="Email"
                value={form.email}
                onChangeText={(value) => setForm((current) => ({ ...current, email: value }))}
                keyboardType="email-address"
                leftAccessory={<MaterialCommunityIcons name="email-outline" size={20} color={theme.semanticColors.textMuted} />}
              />
              <TextField
                label="Phone"
                value={form.phone}
                onChangeText={(value) => setForm((current) => ({ ...current, phone: value }))}
                keyboardType="phone-pad"
                leftAccessory={<MaterialCommunityIcons name="phone-outline" size={20} color={theme.semanticColors.textMuted} />}
              />
            </>
          ) : null}
          <TextField
            label="Password"
            value={form.password}
            onChangeText={(value) => {
              setPasswordTouched(true);
              setError(null);
              setForm((current) => ({ ...current, password: value }));
            }}
            secureTextEntry={!showPassword}
            placeholder="Enter your password"
            leftAccessory={<MaterialCommunityIcons name="lock-outline" size={20} color={theme.semanticColors.textMuted} />}
            rightAccessory={
              <Pressable onPress={() => setShowPassword((current) => !current)} accessibilityLabel={showPassword ? "Hide password" : "Show password"}>
                <MaterialCommunityIcons name={showPassword ? "eye-off-outline" : "eye-outline"} size={21} color={theme.semanticColors.textMuted} />
              </Pressable>
            }
          />
          {showPasswordGuide ? (
            <View style={styles.passwordGuide}>
              <Text style={styles.passwordGuideTitle}>Medium password</Text>
              <View style={styles.passwordRules}>
                {passwordRules.map((rule) => (
                  <View key={rule.label} style={styles.passwordRule}>
                    <MaterialCommunityIcons
                      name={rule.valid ? "check-circle" : "circle-outline"}
                      size={15}
                      color={rule.valid ? theme.colors.verdant[500] : theme.semanticColors.textMuted}
                    />
                    <Text style={[styles.passwordRuleLabel, rule.valid ? styles.passwordRuleLabelValid : undefined]}>{rule.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
          {error ? (
            <View style={styles.errorBanner}>
              <MaterialCommunityIcons name="alert-circle-outline" size={18} color={theme.semanticColors.danger} />
              <Text style={styles.error}>{error}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.actions}>
          <PrimaryButton
            label={loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
            disabled={loading}
            onPress={() => void handleSubmit()}
          />
          {mode === "register" ? <SecondaryButton label="Back to welcome" onPress={onBack} /> : null}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    flexGrow: 1,
  },
  loginScreenContent: {
    justifyContent: "center",
    paddingVertical: theme.spacing[4],
  },
  brandStage: {
    position: "relative",
    overflow: "hidden",
    borderRadius: theme.radius.xl,
    padding: theme.spacing[5],
    gap: theme.spacing[4],
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    ...theme.shadows.floating,
  },
  stageOrb: {
    position: "absolute",
    borderRadius: theme.radius.pill,
  },
  stageOrbTop: {
    width: 170,
    height: 170,
    top: -90,
    right: -42,
    backgroundColor: "rgba(217,181,83,0.24)",
  },
  stageOrbBottom: {
    width: 120,
    height: 120,
    bottom: -78,
    left: 42,
    backgroundColor: "rgba(217,75,36,0.20)",
  },
  brandHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
  },
  brandMark: {
    width: 46,
    height: 46,
    borderRadius: theme.radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.gold[500],
  },
  brandCopy: {
    flex: 1,
    gap: 2,
  },
  brandName: {
    fontFamily: theme.typography.fontFamily.displayMedium,
    fontSize: theme.typography.size.sm,
    letterSpacing: 1,
    color: theme.colors.gold[300],
  },
  brandTagline: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.xs,
    color: "rgba(255,255,255,0.68)",
  },
  liveMark: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: 5,
    borderRadius: theme.radius.pill,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.teal[300],
  },
  liveLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: 10,
    letterSpacing: 0.7,
    color: "rgba(255,255,255,0.82)",
  },
  stageCopy: {
    gap: theme.spacing[2],
    maxWidth: 320,
  },
  stageKicker: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.xs,
    letterSpacing: 1,
    color: theme.colors.ember[300],
  },
  stageTitle: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.size["3xl"],
    lineHeight: theme.typography.lineHeight["3xl"],
    color: theme.semanticColors.textOnDark,
  },
  stageBody: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.md,
    lineHeight: theme.typography.lineHeight.md,
    color: "rgba(255,255,255,0.72)",
  },
  stagePills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[2],
  },
  stagePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.radius.pill,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  stagePillLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.xs,
    color: "rgba(255,255,255,0.86)",
  },
  authCard: {
    borderRadius: theme.radius.xl,
    padding: theme.spacing[5],
    gap: theme.spacing[4],
    backgroundColor: theme.semanticColors.surface,
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
    ...theme.shadows.card,
  },
  header: {
    gap: theme.spacing[2],
  },
  authIntroRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing[3],
  },
  authIntroIcon: {
    width: 38,
    height: 38,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF1E8",
  },
  authIntroCopy: {
    flex: 1,
    gap: theme.spacing[1],
  },
  kicker: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.xs,
    color: theme.semanticColors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  title: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.size.xl,
    lineHeight: theme.typography.lineHeight.xl,
    color: theme.semanticColors.textPrimary,
  },
  body: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.semanticColors.textSecondary,
  },
  modeSwitch: {
    flexDirection: "row",
    gap: theme.spacing[2],
    padding: theme.spacing[1],
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.stone[100],
  },
  modeChip: {
    flex: 1,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  modeChipActive: {
    backgroundColor: theme.semanticColors.primary,
  },
  modeLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.md,
    color: theme.semanticColors.textMuted,
  },
  modeLabelActive: {
    color: theme.semanticColors.textOnDark,
  },
  form: {
    gap: theme.spacing[3],
  },
  passwordGuide: {
    gap: theme.spacing[2],
    padding: theme.spacing[3],
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.stone[50],
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
  },
  passwordGuideTitle: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.xs,
    color: theme.semanticColors.textSecondary,
  },
  passwordRules: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[2],
  },
  passwordRule: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  passwordRuleLabel: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.xs,
    color: theme.semanticColors.textMuted,
  },
  passwordRuleLabelValid: {
    color: theme.colors.verdant[600],
  },
  error: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.semanticColors.danger,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing[2],
    padding: theme.spacing[3],
    borderRadius: theme.radius.md,
    backgroundColor: "#FFF0ED",
    borderWidth: 1,
    borderColor: "#F4C5B7",
  },
  actions: {
    gap: theme.spacing[3],
  },
});
