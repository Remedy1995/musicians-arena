import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { AuthMode, UserRole } from "../AppShell";
import { ApiError } from "../services/api/client";
import { api } from "../services/api";
import { AuthResponse } from "../services/api/types";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { SecondaryButton } from "../components/SecondaryButton";
import { TextField } from "../components/TextField";
import { theme } from "../theme/theme";

type AuthScreenProps = {
  role: UserRole;
  initialMode: AuthMode;
  onAuthenticated: (session: AuthResponse) => void;
  onBack: () => void;
  onSwitchMode: (mode: AuthMode) => void;
  onStartRegistration: () => void;
};

export function AuthScreen({ role, initialMode, onAuthenticated, onBack, onSwitchMode, onStartRegistration }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    username: "",
    password: "",
    displayName: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const title = useMemo(() => (mode === "login" ? "Sign in to your account" : "Create your account"), [mode]);
  const roleLabel = role === "client" ? "Organizer account" : "Talent account";
  const isLogin = mode === "login";
  const heroTheme = isLogin
    ? {
        heroColors: ["#241D17", "#121416"] as const,
        accent: theme.colors.gold[400],
        icon: "🔐",
        roleTitle: "Pick up where your last conversation, booking, or gig left off.",
        roleBody: "Sign in once and the app will detect whether this account belongs to an organizer or a talent.",
      }
    : role === "client"
      ? {
          heroColors: ["#241D17", "#121416"] as const,
          accent: theme.colors.gold[400],
          icon: "📋",
          roleTitle: "Create your organizer workspace.",
          roleBody: "Post gigs, review applicants, and keep every service or event booking organized.",
        }
      : {
          heroColors: ["#133033", "#121416"] as const,
          accent: theme.colors.teal[400],
          icon: "🎹",
          roleTitle: "Create your talent profile.",
          roleBody: "Show your work, find matching opportunities, and turn interest into confirmed bookings.",
        };

  async function handleSubmit() {
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
              role,
              password: form.password,
              display_name: form.displayName,
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
    <Screen>
      <LinearGradient colors={heroTheme.heroColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={[styles.heroBadge, { backgroundColor: heroTheme.accent }]}>
            <Text style={styles.heroBadgeIcon}>{heroTheme.icon}</Text>
          </View>
          {!isLogin ? (
            <View style={[styles.rolePill, role === "client" ? styles.rolePillClient : styles.rolePillTalent]}>
              <Text style={styles.rolePillText}>{roleLabel}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.heroTitle}>{heroTheme.roleTitle}</Text>
        <Text style={styles.heroBody}>{heroTheme.roleBody}</Text>
      </LinearGradient>

      <View style={styles.authCard}>
        <View style={styles.header}>
          <Text style={styles.kicker}>{isLogin ? "Welcome back" : roleLabel}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>
            {isLogin
              ? "Sign in and we will automatically open the right account experience for you."
              : `This account will be created as a ${role === "client" ? "client organizer" : "talent"} profile.`}
          </Text>
        </View>

        <View style={styles.modeSwitch}>
          <Pressable
            onPress={() => {
              setMode("login");
              onSwitchMode("login");
            }}
            style={[styles.modeChip, mode === "login" ? styles.modeChipActive : undefined]}
          >
            <Text style={[styles.modeLabel, mode === "login" ? styles.modeLabelActive : undefined]}>Sign in</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              if (mode === "login") {
                onStartRegistration();
                return;
              }
              setMode("register");
              onSwitchMode("register");
            }}
            style={[styles.modeChip, mode === "register" ? styles.modeChipActive : undefined]}
          >
            <Text style={[styles.modeLabel, mode === "register" ? styles.modeLabelActive : undefined]}>Register</Text>
          </Pressable>
        </View>

        <View style={styles.form}>
          {mode === "register" ? (
            <>
              <TextField label="Display name" value={form.displayName} onChangeText={(value) => setForm((current) => ({ ...current, displayName: value }))} />
              <TextField label="Email" value={form.email} onChangeText={(value) => setForm((current) => ({ ...current, email: value }))} keyboardType="email-address" />
              <TextField label="Phone" value={form.phone} onChangeText={(value) => setForm((current) => ({ ...current, phone: value }))} keyboardType="phone-pad" />
            </>
          ) : null}
          <TextField label="Username" value={form.username} onChangeText={(value) => setForm((current) => ({ ...current, username: value }))} />
          <TextField
            label="Password"
            value={form.password}
            onChangeText={(value) => setForm((current) => ({ ...current, password: value }))}
            secureTextEntry
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        <View style={styles.actions}>
          <PrimaryButton label={loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"} onPress={() => void handleSubmit()} />
          {mode === "register" ? <SecondaryButton label="Back to role selection" onPress={onBack} /> : null}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: theme.radius.xl,
    padding: theme.spacing[5],
    gap: theme.spacing[3],
    ...theme.shadows.floating,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroBadge: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  heroBadgeIcon: {
    fontSize: 22,
    color: theme.semanticColors.textOnDark,
  },
  heroTitle: {
    maxWidth: 320,
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.size.xl,
    lineHeight: theme.typography.lineHeight.xl,
    color: theme.semanticColors.textOnDark,
  },
  heroBody: {
    maxWidth: 320,
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: "rgba(255,255,255,0.78)",
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
  rolePill: {
    alignSelf: "flex-start",
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: 6,
  },
  rolePillClient: {
    backgroundColor: theme.colors.gold[400],
  },
  rolePillTalent: {
    backgroundColor: theme.colors.teal[500],
  },
  rolePillText: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.xs,
    color: theme.semanticColors.textOnDark,
  },
  kicker: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: theme.typography.size.xs,
    color: theme.semanticColors.textSecondary,
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
    gap: theme.spacing[4],
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
