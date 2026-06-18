import { Platform } from "react-native";

const defaultApiBaseUrl =
  Platform.OS === "android" ? "http://10.0.2.2:8005/api/v1" : "http://127.0.0.1:8005/api/v1";
const defaultWsBaseUrl = defaultApiBaseUrl.replace("/api/v1", "").replace("http://", "ws://").replace("https://", "wss://");

export const apiConfig = {
  baseUrl: defaultApiBaseUrl,
  wsBaseUrl: defaultWsBaseUrl,
};
