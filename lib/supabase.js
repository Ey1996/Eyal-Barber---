import { createClient } from "@supabase/supabase-js";

// המפתח מסוג Publishable — מיועד להיות פומבי, בטוח לשים בקוד
const FALLBACK_URL = "https://vhpnudoaxadpdsbvlaxn.supabase.co";
const FALLBACK_KEY = "sb_publishable_Xw-r6-rQlpiin6U8gjoNSQ_cFbynHJb";

const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// משתמשים בערך מהסביבה רק אם הוא תקין; אחרת נופלים לקבוע שבקוד
const url = envUrl.startsWith("https://") ? envUrl : FALLBACK_URL;
const validEnvKey = envKey.startsWith("sb_") || envKey.startsWith("eyJ") ? envKey : "";
const anonKey = validEnvKey || (FALLBACK_KEY.startsWith("sb_") ? FALLBACK_KEY : "");

export const isSupabaseConfigured = Boolean(url && anonKey);
export const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null;
