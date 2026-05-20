import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  VAPID_PUBLIC_KEY: z.string().min(1).optional(),
  VAPID_PRIVATE_KEY: z.string().min(1).optional(),
  VAPID_SUBJECT: z.string().min(1).optional(),
  VERCEL_URL: z.string().min(1).optional(),
  VERCEL_PROJECT_PRODUCTION_URL: z.string().min(1).optional(),
});

const parsedEnv = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
  VAPID_SUBJECT: process.env.VAPID_SUBJECT,
  VERCEL_URL: process.env.VERCEL_URL,
  VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
});

export function isSupabaseConfigured() {
  return Boolean(
    parsedEnv.NEXT_PUBLIC_SUPABASE_URL &&
      parsedEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
      parsedEnv.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function getPersistenceMode() {
  return isSupabaseConfigured() ? "supabase" : "mock";
}

export function getSupabaseServerEnv() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase environment variables are missing. Add them to stats-app/.env.local before using persistence actions.",
    );
  }

  return {
    url: parsedEnv.NEXT_PUBLIC_SUPABASE_URL!,
    publishableKey: parsedEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    serviceRoleKey: parsedEnv.SUPABASE_SERVICE_ROLE_KEY!,
  };
}

export function getConfiguredAppUrl() {
  if (parsedEnv.NEXT_PUBLIC_SITE_URL) {
    return parsedEnv.NEXT_PUBLIC_SITE_URL;
  }

  if (parsedEnv.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${parsedEnv.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  if (parsedEnv.VERCEL_URL) {
    return `https://${parsedEnv.VERCEL_URL}`;
  }

  return "https://app.pikesvillembb.com";
}

export function isPushConfigured() {
  return Boolean(
    parsedEnv.VAPID_PUBLIC_KEY &&
      parsedEnv.VAPID_PRIVATE_KEY &&
      parsedEnv.VAPID_SUBJECT,
  );
}

export function isOpenAIConfigured() {
  return Boolean(parsedEnv.OPENAI_API_KEY);
}

export function getOpenAIEnv() {
  if (!isOpenAIConfigured()) {
    throw new Error("OpenAI API key is missing. Set OPENAI_API_KEY to enable AI evaluation rewrites.");
  }

  return {
    apiKey: parsedEnv.OPENAI_API_KEY!,
  };
}

export function getPushEnv() {
  if (!isPushConfigured()) {
    throw new Error(
      "Push notification environment variables are missing. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT.",
    );
  }

  return {
    publicKey: parsedEnv.VAPID_PUBLIC_KEY!,
    privateKey: parsedEnv.VAPID_PRIVATE_KEY!,
    subject: parsedEnv.VAPID_SUBJECT!,
  };
}
