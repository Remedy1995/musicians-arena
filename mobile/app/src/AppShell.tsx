import { IBMPlexSans_400Regular, IBMPlexSans_500Medium, IBMPlexSans_600SemiBold } from "@expo-google-fonts/ibm-plex-sans";
import { Sora_600SemiBold, Sora_700Bold, useFonts } from "@expo-google-fonts/sora";
import { ActivityIndicator, View } from "react-native";
import { useEffect, useState } from "react";

import { AuthScreen } from "./screens/AuthScreen";
import { AppTabs } from "./navigation/AppTabs";
import { OnboardingScreen } from "./screens/OnboardingScreen";
import { AuthResponse, Capability, UserSummary } from "./services/api/types";
import { registerForPushNotifications } from "./services/pushNotifications";
import { clearSession, loadRole, loadSession, loadStarted, saveRole, saveSession, saveStarted } from "./services/sessionStorage";
import { theme } from "./theme/theme";

export type UserRole = "client" | "talent";
export type AuthMode = "login" | "register";

export function roleToCapability(role: UserRole): Capability {
  return role === "client" ? "organizer" : "talent";
}

export function capabilityToRole(capability: Capability): UserRole {
  return capability === "organizer" ? "client" : "talent";
}

export function AppShell() {
  const [fontsLoaded] = useFonts({
    Sora_600SemiBold,
    Sora_700Bold,
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
  });
  const [hasStarted, setHasStarted] = useState(false);
  const [role, setRole] = useState<UserRole | null>(null);
  const [session, setSession] = useState<AuthResponse | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const sessionCapabilities = session?.user.capabilities?.length
    ? session.user.capabilities
    : session?.user.role === "client" || session?.user.role === "talent"
      ? [roleToCapability(session.user.role)]
      : [];
  const effectiveRole = session
    ? role && sessionCapabilities.includes(roleToCapability(role))
      ? role
      : sessionCapabilities.length > 0
        ? capabilityToRole(sessionCapabilities[0])
        : null
    : role;

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
    if (!bootstrapped || !role) return;
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

  useEffect(() => {
    if (!session) return;
    void registerForPushNotifications(session.token).catch(() => {
      // Push is optional; the in-app inbox and WebSocket notifications remain available.
    });
  }, [session]);

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
        onContinue={() => {
          setHasStarted(true);
        }}
      />
    );
  }

  if (!session) {
    return (
      <AuthScreen
        initialMode={authMode}
        onAuthenticated={(nextSession) => {
          setSession(nextSession);
          const capabilities = nextSession.user.capabilities || [];
          setRole(
            capabilities.includes("organizer")
              ? "client"
              : capabilities.includes("talent")
                ? "talent"
                : null,
          );
        }}
        onBack={() => {
          setHasStarted(false);
          setAuthMode("login");
        }}
        onSwitchMode={setAuthMode}
      />
    );
  }

  return (
      <AppTabs
        role={effectiveRole}
        capabilities={sessionCapabilities}
        currentUser={session.user as UserSummary}
        token={session.token}
        onRoleChange={setRole}
        onCapabilityAdded={(nextUser) => {
          setSession((current) => (current ? { ...current, user: nextUser } : current));
          setRole(nextUser.capabilities.includes("organizer") ? "client" : "talent");
        }}
      onExit={() => {
        setSession(null);
        setRole(null);
        setHasStarted(false);
        setAuthMode("login");
      }}
      onSignOut={() => {
        setSession(null);
        setRole(null);
        setAuthMode("login");
      }}
    />
  );
}
