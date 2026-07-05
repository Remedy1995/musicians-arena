const { withAndroidManifest } = require("@expo/config-plugins");

function isEnabled(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").toLowerCase());
}

module.exports = function withAndroidCleartextTraffic(config) {
  return withAndroidManifest(config, (updatedConfig) => {
    const application = updatedConfig.modResults.manifest.application?.[0];

    if (application?.$) {
      const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || "";
      const wsBaseUrl = process.env.EXPO_PUBLIC_WS_BASE_URL || "";
      const usesPlainHttp = apiBaseUrl.startsWith("http://") || wsBaseUrl.startsWith("ws://");
      const shouldAllowCleartext = isEnabled(process.env.ALLOW_INSECURE_HTTP) || usesPlainHttp;

      if (shouldAllowCleartext) {
        application.$["android:usesCleartextTraffic"] = "true";
      }
    }

    return updatedConfig;
  });
};
