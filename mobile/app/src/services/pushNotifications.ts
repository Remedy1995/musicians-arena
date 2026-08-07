import Constants from "expo-constants";
import { Platform } from "react-native";

import { api } from "./api";

export async function registerForPushNotifications(token: string) {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return;

  // Development clients intentionally do not include the native push module.
  // Keep the import lazy so ExpoPushTokenManager is never initialized there.
  const nativePushEnabled = Constants.expoConfig?.extra?.nativePushEnabled === true;
  if (!nativePushEnabled) return;

  const Notifications = await import("expo-notifications");
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#D9B553",
    });
  }

  const currentPermissions = await Notifications.getPermissionsAsync();
  let permissionStatus = currentPermissions.status;
  if (permissionStatus !== "granted") {
    permissionStatus = (await Notifications.requestPermissionsAsync()).status;
  }
  if (permissionStatus !== "granted") return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
  if (!projectId) return;

  const pushToken = await Notifications.getExpoPushTokenAsync({ projectId });
  await api.registerPushDevice(token, {
    expo_push_token: pushToken.data,
    platform: Platform.OS,
  });
}
