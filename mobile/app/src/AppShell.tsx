import { IBMPlexSans_400Regular, IBMPlexSans_500Medium, IBMPlexSans_600SemiBold } from "@expo-google-fonts/ibm-plex-sans";
import { Sora_600SemiBold, Sora_700Bold, useFonts } from "@expo-google-fonts/sora";
import { ActivityIndicator, View } from "react-native";
import { useEffect, useState } from "react";

import { AuthScreen } from "./screens/AuthScreen";
import { AppTabs } from "./navigation/AppTabs";
import { OnboardingScreen } from "./screens/OnboardingScreen";
import { AuthResponse, UserSummary } from "./services/api/types";
import { clearSession, loadRole, loadSession, loadStarted, saveRole, saveSession, saveStarted } from "./services/sessionStorage";
import { theme } from "./theme/theme";

export type UserRole = "client" | "talent";
export type AuthMode = "login" | "register";

export function AppShell() {
  const [fontsLoaded] = useFonts({
    Sora_600SemiBold,
    Sora_700Bold,
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
  });
  const [hasStarted, setHasStarted] = useState(false);
  const [role, setRole] = useState<UserRole>("client");
  const [session, setSession] = useState<AuthResponse | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const effectiveRole = (session?.user.role as UserRole | undefined) ?? role;

  useEffect(() => {
    async function bootstrap() {
      const [storedSession, storedRole, storedStarted] = await Promise.all([loadSession(), loadRole(), loadStarted()]);
      if (storedRole === "client" || storedRole === "talent") {
        setRole(storedRole);
      }
      setHasStarted(storedStarted);
      setSession(storedSession);
      setBootstrapped(true);
    }

    void bootstrap();
  }, []);

  useEffect(() => {
    if (!bootstrapped) return;
    void saveRole(role);
  }, [bootstrapped, role]);

  useEffect(() => {
    if (!bootstrapped) return;
    void saveStarted(hasStarted);
  }, [bootstrapped, hasStarted]);

  useEffect(() => {
    if (!bootstrapped) return;
    if (session) {
      void saveSession(session);
      return;
    }
    void clearSession();
  }, [bootstrapped, session]);

  if (!fontsLoaded || !bootstrapped) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.semanticColors.background,
        }}
      >
        <ActivityIndicator color={theme.semanticColors.primary} size="large" />
      </View>
    );
  }

  if (!hasStarted) {
    return (
      <OnboardingScreen
        selectedRole={effectiveRole}
        onRoleChange={setRole}
        onContinue={() => {
          setHasStarted(true);
        }}
      />
    );
  }

  if (!session) {
    return (
      <AuthScreen
        role={effectiveRole}
        initialMode={authMode}
        onAuthenticated={(nextSession) => {
          setSession(nextSession);
          setRole(nextSession.user.role as UserRole);
        }}
        onBack={() => {
          setHasStarted(false);
          setAuthMode("login");
        }}
        onSwitchMode={setAuthMode}
        onStartRegistration={() => {
          setAuthMode("register");
          setHasStarted(false);
        }}
      />
    );
  }

  return (
      <AppTabs
        role={effectiveRole}
        currentUser={session.user as UserSummary}
        token={session.token}
      onExit={() => {
        setSession(null);
        setHasStarted(false);
        setAuthMode("login");
      }}
      onSignOut={() => {
        setSession(null);
        setAuthMode("login");
      }}
    />
  );
}
