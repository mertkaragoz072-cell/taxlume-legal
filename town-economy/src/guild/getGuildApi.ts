import { createMockGuildApi } from "./mockApi";
import { createSupabaseGuildApi } from "./supabaseApi";
import { GuildApi } from "./types";

/** Which backend this build talks to. With nothing configured there is no
 * guild feature (the card says "coming soon"); EXPO_PUBLIC_GUILD_MOCK=1 turns
 * on the on-device mock for development and screenshots. With EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY set it talks
 * to the real server (see backend/README.md). */
export function getGuildApi(): GuildApi | null {
  if (process.env.EXPO_PUBLIC_GUILD_MOCK === "1") return createMockGuildApi();
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (url && anonKey) return createSupabaseGuildApi({ url, anonKey });
  return null;
}
