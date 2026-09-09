type SupabaseAuthSuccess = {
  access_token?: string;
  refresh_token?: string;
  user?: {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  };
};

const fallbackSupabaseUrl = "https://ynfmqjmdibnnlcuospdo.supabase.co";
const fallbackSupabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluZm1xam1kaWJubmxjdW9zcGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NDI3MzcsImV4cCI6MjEwNDUxODczN30.tvsydEBYA8vZVxMKKC2ng1KonjU-AibdfgKiC9rGK6U";
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || fallbackSupabaseUrl)
  .trim()
  .replace(/\/+$/, "");
const supabaseAnonKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY || fallbackSupabaseAnonKey
).trim();

const getConfigError = (): string | null => {
  if (!supabaseUrl) {
    return "Missing VITE_SUPABASE_URL in frontend environment.";
  }
  if (!supabaseAnonKey) {
    return "Missing VITE_SUPABASE_ANON_KEY in frontend environment.";
  }
  return null;
};

const callSupabaseAuth = async <T>(
  path: string,
  payload: Record<string, unknown>,
): Promise<T> => {
  const configError = getConfigError();
  if (configError) {
    throw new Error(configError);
  }

  const response = await fetch(`${supabaseUrl}${path}`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (!response.ok) {
    const message =
      (typeof data.msg === "string" && data.msg) ||
      (typeof data.error_description === "string" && data.error_description) ||
      (typeof data.error === "string" && data.error) ||
      "Supabase authentication failed";
    throw new Error(message);
  }

  return data as T;
};

export const signInWithPassword = async (
  email: string,
  password: string,
): Promise<SupabaseAuthSuccess> =>
  callSupabaseAuth<SupabaseAuthSuccess>("/auth/v1/token?grant_type=password", {
    email,
    password,
  });

export const signUpWithPassword = async (
  email: string,
  password: string,
  metadata: Record<string, unknown>,
): Promise<SupabaseAuthSuccess> =>
  callSupabaseAuth<SupabaseAuthSuccess>("/auth/v1/signup", {
    email,
    password,
    data: metadata,
  });

export const sendPasswordResetEmail = async (email: string): Promise<void> => {
  await callSupabaseAuth<Record<string, unknown>>("/auth/v1/recover", {
    email,
  });
};
