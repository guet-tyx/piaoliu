import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase 客户端（懒加载单例）
 * 未配置环境变量时返回 null，本地开发不会崩溃；
 * 接入真实后端时把 .env.example 复制为 .env.local 并填入 URL 与 anon key。
 */
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  if (!client) {
    client = createClient(url, anonKey);
  }
  return client;
}
