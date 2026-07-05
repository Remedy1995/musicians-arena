import type { ExpoConfig } from "expo/config";

const baseConfig = require("./app.json").expo as ExpoConfig;

function parseInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export default (): ExpoConfig => {
  const appName = process.env.APP_DISPLAY_NAME || baseConfig.name || "Musician's Arena";
  const appSlug = process.env.APP_SLUG || baseConfig.slug || "musicians-arena";
  const appScheme = process.env.APP_SCHEME || baseConfig.scheme || "musiciansarena";
  const appVersion = process.env.APP_VERSION || baseConfig.version || "1.0.0";
  const iosBundleIdentifier = process.env.IOS_BUNDLE_IDENTIFIER || "com.remedy1995.musiciansarena";
  const iosBuildNumber = process.env.IOS_BUILD_NUMBER || "1";
  const androidPackage = process.env.ANDROID_PACKAGE || "com.remedy1995.musiciansarena";
  const androidVersionCode = parseInteger(process.env.ANDROID_VERSION_CODE, 1);
  const easProjectId = process.env.EAS_PROJECT_ID || "d87d4395-c737-433e-a7b5-00b37877b66b";
  const appVariant = process.env.APP_VARIANT || "development";
  const allowInsecureHttp = parseBoolean(process.env.ALLOW_INSECURE_HTTP, false);
  const androidConfig = {
    ...baseConfig.android,
    package: androidPackage,
    versionCode: androidVersionCode,
    usesCleartextTraffic: allowInsecureHttp,
  } as NonNullable<ExpoConfig["android"]> & { usesCleartextTraffic?: boolean };

  return {
    ...baseConfig,
    name: appName,
    slug: appSlug,
    scheme: appScheme,
    version: appVersion,
    runtimeVersion: {
      policy: "appVersion",
    },
    ios: {
      ...baseConfig.ios,
      bundleIdentifier: iosBundleIdentifier,
      buildNumber: iosBuildNumber,
      infoPlist: {
        ...(baseConfig.ios?.infoPlist || {}),
        ...(allowInsecureHttp
          ? {
              NSAppTransportSecurity: {
                NSAllowsArbitraryLoads: true,
              },
            }
          : {}),
      },
    },
    android: androidConfig,
    extra: {
      ...(baseConfig.extra || {}),
      appVariant,
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || null,
      wsBaseUrl: process.env.EXPO_PUBLIC_WS_BASE_URL || null,
      allowInsecureHttp,
      ...(easProjectId
        ? {
            eas: {
              projectId: easProjectId,
            },
          }
        : {}),
    },
  };
};
