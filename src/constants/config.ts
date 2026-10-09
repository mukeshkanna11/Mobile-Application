/**
 * Runtime configuration.
 *
 * The API base URL is read from EXPO_PUBLIC_API_URL (public env var, inlined at
 * build time). Falls back to the production API used by the web dashboard.
 *
 * NOTE: `localhost` only resolves on web / iOS simulator. On a physical device
 * or Android emulator point EXPO_PUBLIC_API_URL at your machine's LAN IP, e.g.
 * EXPO_PUBLIC_API_URL=http://192.168.1.10:5000/api
 */
import { Platform } from "react-native";

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  "https://crmreadytechsolutions.in/api";