import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

/**
 * SecureStore is unavailable on web, where `expo start --web` is only used for
 * quick previews, so fall back to localStorage there.
 */
const isWeb = Platform.OS === "web";

export async function getStored(key: string): Promise<string | null> {
  if (isWeb) {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

export async function setStored(key: string, value: string): Promise<void> {
  if (isWeb) {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // ignore private-mode failures
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function removeStored(key: string): Promise<void> {
  if (isWeb) {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      // ignore
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
