import AsyncStorage from "@react-native-async-storage/async-storage";

import { AuthResponse } from "./api/types";

const SESSION_KEY = "musicians_arena_session";
const ROLE_KEY = "musicians_arena_role";
const STARTED_KEY = "musicians_arena_started";

export async function saveSession(session: AuthResponse) {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function loadSession() {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  return raw ? (JSON.parse(raw) as AuthResponse) : null;
}

export async function clearSession() {
  await AsyncStorage.removeItem(SESSION_KEY);
}

export async function saveRole(role: string) {
  await AsyncStorage.setItem(ROLE_KEY, role);
}

export async function loadRole() {
  return AsyncStorage.getItem(ROLE_KEY);
}

export async function saveStarted(value: boolean) {
  await AsyncStorage.setItem(STARTED_KEY, value ? "true" : "false");
}

export async function loadStarted() {
  const raw = await AsyncStorage.getItem(STARTED_KEY);
  return raw === "true";
}
