import { useEffect, useMemo, useState } from "react";
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

  const title = useMemo(() => (mode === "login" ? "Sign in to your account" : "Create your account"), [mode]);
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
      <View style={styles.brandHeader}>
        <View style={styles.brandMark}>
          <MaterialCommunityIcons name="music-clef-treble" size={24} color={theme.semanticColors.textOnDark} />
        </View>
        <View style={styles.brandCopy}>
          <Text style={styles.brandName}>Musician's Arena</Text>
          <Text style={styles.brandTagline}>Creative work, one account.</Text>
        </View>
      </View>

      <View style={styles.authCard}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.kicker}>{isLogin ? "Welcome back" : "Join the community"}</Text>
            <View style={styles.secureLabel}>
              <MaterialCommunityIcons name="shield-check-outline" size={14} color={theme.colors.teal[600]} />
              <Text style={styles.secureLabelText}>Secure access</Text>
            </View>
          </View>
          <Text style={styles.title}>{title}</Text>
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
          >
            <Text style={[styles.modeLabel, mode === "login" ? styles.modeLabelActive : undefined]}>Sign in</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              switchMode("register");
            }}
            style={[styles.modeChip, mode === "register" ? styles.modeChipActive : undefined]}
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
          />
          {mode === "register" ? (
            <>
              <TextField label="Email" value={form.email} onChangeText={(value) => setForm((current) => ({ ...current, email: value }))} keyboardType="email-address" />
              <TextField label="Phone" value={form.phone} onChangeText={(value) => setForm((current) => ({ ...current, phone: value }))} keyboardType="phone-pad" />
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
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        <View style={styles.actions}>
          <PrimaryButton label={loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"} onPress={() => void handleSubmit()} />
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
    paddingVertical: theme.spacing[5],
  },
  brandHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
  },
  brandMark: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.semanticColors.primary,
    ...theme.shadows.card,
  },
  brandCopy: {
    gap: 2,
  },
  brandName: {
    fontFamily: theme.typography.fontFamily.displayMedium,
    fontSize: theme.typography.size.lg,
    color: theme.semanticColors.textPrimary,
  },
  brandTagline: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.xs,
    color: theme.semanticColors.textMuted,
  },
  authCard: {
    borderRadius: theme.radius.xl,
    padding: theme.spacing[4],
    gap: theme.spacing[5],
    backgroundColor: theme.semanticColors.surface,
    borderWidth: 1,
    borderColor: theme.semanticColors.borderSoft,
    ...theme.shadows.card,
  },
  header: {
    gap: theme.spacing[2],
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing[2],
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
    fontSize: theme.typography.size["2xl"],
    lineHeight: theme.typography.lineHeight["2xl"],
    color: theme.semanticColors.textPrimary,
  },
  body: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.semanticColors.textSecondary,
  },
  secureLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: 5,
    borderRadius: theme.radius.pill,
    backgroundColor: "#E8F4F1",
  },
  secureLabelText: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: 10,
    color: theme.colors.teal[600],
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
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: theme.typography.size.sm,
    color: theme.semanticColors.danger,
  },
  actions: {
    gap: theme.spacing[3],
  },
});
