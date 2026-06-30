import type { ExpoConfig } from "expo/config";

const baseConfig = require("./app.json").expo as ExpoConfig;

function parseInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
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
  const easProjectId = process.env.EAS_PROJECT_ID;
  const appVariant = process.env.APP_VARIANT || "development";

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
    },
    android: {
      ...baseConfig.android,
      package: androidPackage,
      versionCode: androidVersionCode,
    },
    extra: {
      ...(baseConfig.extra || {}),
      appVariant,
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
