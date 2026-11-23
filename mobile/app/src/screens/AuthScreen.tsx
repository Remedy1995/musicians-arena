import { useEffect, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ActivityIndicator, ImageBackground, Pressable, StyleSheet, Text, View } from "react-native";

import { AuthMode } from "../AppShell";
import { ApiError } from "../services/api/client";
import { api } from "../services/api";
import { AuthResponse } from "../services/api/types";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
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
  const [errorKind, setErrorKind] = useState<"network" | "form">("form");
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
    setErrorKind("form");
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
    setErrorKind("form");
    onSwitchMode(nextMode);
  }

  async function handleSubmit() {
    if (!form.username.trim()) {
      setError("Username is required.");
      setErrorKind("form");
      return;
    }
    if (!form.password) {
      if (mode === "register") setPasswordTouched(true);
      setError("Password is required.");
      setErrorKind("form");
      return;
    }
    if (mode === "register" && !passwordIsValid) {
      setPasswordTouched(true);
      setError("Use a medium-strength password with 8 characters, a letter, and a number.");
      setErrorKind("form");
      return;
    }

    setLoading(true);
    setError(null);
    setErrorKind("form");

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
        setErrorKind(caught.status === 0 ? "network" : "form");
        setError(caught.message);
      } else if (caught instanceof Error) {
        setErrorKind("network");
        setError("We couldn't complete the request. Check your internet connection and try again.");
      } else {
        setErrorKind("form");
        setError("Authentication failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen contentContainerStyle={styles.screenContent} innerStyle={styles.screenInner}>
      <ImageBackground
        source={require("../../assets/onboarding-stage.jpg")}
        style={styles.brandStage}
        imageStyle={styles.brandStageImage}
        accessibilityLabel="A live music audience under warm stage lights"
      >
        <View style={styles.imageOverlay} />
        <LinearGradient
          colors={[theme.colors.transparent, theme.colors.ink[950]]}
          locations={[0.22, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.brandHeader}>
          <View style={styles.brandIdentity}>
            <View style={styles.brandMark}>
              <MaterialCommunityIcons name="music-note-eighth" size={20} color={theme.colors.ink[950]} />
            </View>
            <View style={styles.brandCopy}>
              <Text style={styles.brandName}>MUSICIAN’S ARENA</Text>
              <Text style={styles.brandTagline}>Talent and opportunities, connected</Text>
            </View>
          </View>
          <Pressable onPress={onBack} style={styles.backButton} accessibilityLabel="Back to welcome">
            <MaterialCommunityIcons name="arrow-left" size={20} color={theme.semanticColors.textOnDark} />
          </Pressable>
        </View>
        <View style={styles.stageCopy}>
          <Text style={styles.stageKicker}>{isLogin ? "SIGN IN" : "GET STARTED"}</Text>
          <Text style={styles.stageTitle}>{isLogin ? "Welcome back." : "Make your next connection."}</Text>
          <Text style={styles.stageBody}>
            {isLogin
              ? "Your work, messages, and bookings are right where you left them."
              : "Create one account for every way you work—on stage or behind the event."}
          </Text>
        </View>
      </ImageBackground>

      <View style={styles.authCard}>
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

        <View style={styles.formIntro}>
          <Text style={styles.formTitle}>{isLogin ? "Sign in to your account" : "Create your account"}</Text>
          <Text style={styles.formBody}>
            {isLogin ? "Use the username and password you registered with." : "Start with your details. You can set up talent and organizer profiles after joining."}
          </Text>
        </View>

        <View style={styles.form}>
          <TextField
            label="Username"
            value={form.username}
            onChangeText={(value) => {
              setError(null);
              setErrorKind("form");
              setForm((current) => ({ ...current, username: value }));
            }}
            placeholder="Choose a username"
            leftAccessory={<MaterialCommunityIcons name="account-outline" size={20} color={theme.semanticColors.textMuted} />}
          />
          {mode === "register" ? (
            <>
              <TextField
                label="Email"
                value={form.email}
                onChangeText={(value) => {
                  setError(null);
                  setErrorKind("form");
                  setForm((current) => ({ ...current, email: value }));
                }}
                keyboardType="email-address"
                leftAccessory={<MaterialCommunityIcons name="email-outline" size={20} color={theme.semanticColors.textMuted} />}
              />
              <TextField
                label="Phone"
                value={form.phone}
                onChangeText={(value) => {
                  setError(null);
                  setErrorKind("form");
                  setForm((current) => ({ ...current, phone: value }));
                }}
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
              setErrorKind("form");
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
          {loading ? (
            <View style={styles.connectionNotice}>
              <ActivityIndicator size="small" color={theme.semanticColors.primary} />
              <View style={styles.connectionCopy}>
                <Text style={styles.connectionTitle}>Connecting</Text>
                <Text style={styles.connectionBody}>We’re reaching the Musicians Arena server now.</Text>
              </View>
            </View>
          ) : null}
          {error ? (
            <View style={[styles.errorBanner, errorKind === "network" ? styles.networkBanner : undefined]}>
              <MaterialCommunityIcons
                name={errorKind === "network" ? "wifi-off" : "alert-circle-outline"}
                size={18}
                color={errorKind === "network" ? theme.colors.gold[600] : theme.semanticColors.danger}
              />
              <View style={styles.errorCopy}>
                <Text style={styles.errorTitle}>{errorKind === "network" ? "Sorry, there was a network error" : "Check your details"}</Text>
                <Text style={styles.error}>{error}</Text>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.actions}>
          <PrimaryButton
            label={loading ? "Please wait..." : error && errorKind === "network" ? "Try again" : mode === "login" ? "Sign in" : "Create account"}
            disabled={loading}
            onPress={() => void handleSubmit()}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    flexGrow: 1,
    paddingVertical: theme.spacing[4],
  },
  screenInner: {
    maxWidth: 520,
    gap: theme.spacing[5],
  },
  brandStage: {
    minHeight: 290,
    position: "relative",
    overflow: "hidden",
    borderRadius: theme.radius.xl,
    padding: theme.spacing[5],
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: theme.semanticColors.borderOnDark,
    ...theme.shadows.floating,
  },
  brandStageImage: {
    borderRadius: theme.radius.xl,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: theme.semanticColors.overlay,
  },
  brandHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing[3],
  },
  brandIdentity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
  },
  brandMark: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.gold[300],
  },
  brandCopy: {
    flex: 1,
    gap: 2,
  },
  brandName: {
    fontFamily: theme.typography.fontFamily.displayMedium,
    fontSize: theme.typography.size.xs,
    letterSpacing: 1,
    color: theme.semanticColors.textOnDark,
  },
  brandTagline: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.xs,
    color: theme.semanticColors.textOnDarkMuted,
  },
  backButton: {
    width: theme.spacing[10],
    height: theme.spacing[10],
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.semanticColors.surfaceOnDark,
    borderWidth: 1,
    borderColor: theme.semanticColors.borderOnDark,
  },
  stageCopy: {
    gap: theme.spacing[2],
    maxWidth: 390,
  },
  stageKicker: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.xs,
    letterSpacing: 1,
    color: theme.colors.gold[300],
  },
  stageTitle: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.size["2xl"],
    lineHeight: theme.typography.lineHeight["2xl"],
    color: theme.semanticColors.textOnDark,
  },
  stageBody: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.semanticColors.textOnDarkMuted,
  },
  authCard: {
    paddingHorizontal: theme.spacing[1],
    gap: theme.spacing[4],
  },
  modeSwitch: {
    flexDirection: "row",
    gap: theme.spacing[2],
    padding: theme.spacing[1],
    borderRadius: theme.radius.md,
    backgroundColor: theme.semanticColors.surfaceMuted,
  },
  modeChip: {
    flex: 1,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: theme.colors.transparent,
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
  formIntro: {
    gap: theme.spacing[1],
  },
  formTitle: {
    fontFamily: theme.typography.fontFamily.displayMedium,
    fontSize: theme.typography.size.lg,
    lineHeight: theme.typography.lineHeight.lg,
    color: theme.semanticColors.textPrimary,
  },
  formBody: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.semanticColors.textSecondary,
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
    backgroundColor: theme.semanticColors.dangerSoft,
    borderWidth: 1,
    borderColor: theme.colors.ember[300],
  },
  networkBanner: {
    backgroundColor: theme.semanticColors.warningSoft,
    borderColor: theme.colors.gold[300],
  },
  errorCopy: {
    flex: 1,
    gap: 2,
  },
  errorTitle: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textPrimary,
  },
  connectionNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    padding: theme.spacing[3],
    borderRadius: theme.radius.md,
    backgroundColor: theme.semanticColors.warningSoft,
    borderWidth: 1,
    borderColor: theme.colors.gold[300],
  },
  connectionCopy: {
    flex: 1,
    gap: 2,
  },
  connectionTitle: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.textPrimary,
  },
  connectionBody: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.xs,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.semanticColors.textSecondary,
  },
  actions: {
    gap: theme.spacing[3],
  },
});
