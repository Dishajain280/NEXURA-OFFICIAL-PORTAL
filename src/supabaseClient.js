import { createClient } from "@supabase/supabase-js";

const env = typeof process !== "undefined" ? process.env : {};

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ??
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ??
  env.REACT_APP_SUPABASE_URL ??
  env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  env.REACT_APP_SUPABASE_ANON_KEY ??
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const createNoopSupabase = () => {
  const emptyResult = (data = null) => Promise.resolve({ data, error: null });

  const queryBuilder = {
    select: () => ({
      eq: () => ({
        maybeSingle: () => emptyResult(null),
        single: () => emptyResult(null),
        order: () => emptyResult([]),
      }),
      order: () => emptyResult([]),
      maybeSingle: () => emptyResult(null),
      single: () => emptyResult(null),
    }),
    eq: () => ({
      maybeSingle: () => emptyResult(null),
      single: () => emptyResult(null),
      order: () => emptyResult([]),
    }),
    update: () => ({
      eq: () => emptyResult(null),
    }),
    delete: () => ({
      eq: () => emptyResult(null),
    }),
    insert: () => ({
      select: () => ({
        single: () => emptyResult(null),
      }),
    }),
  };

  return {
    auth: {
      getSession: () =>
        Promise.resolve({ data: { session: null }, error: null }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signInWithPassword: () =>
        Promise.resolve({ data: { user: null }, error: null }),
      signUp: () => Promise.resolve({ data: { user: null }, error: null }),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: () => ({
        data: {
          subscription: { unsubscribe: () => undefined },
        },
      }),
    },
    from: () => queryBuilder,
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ error: null }),
        createSignedUrl: () =>
          Promise.resolve({ data: { signedUrl: "" }, error: null }),
      }),
    },
    channel: () => ({
      on: () => ({
        on: () => ({
          subscribe: () => ({ unsubscribe: () => undefined }),
        }),
      }),
      subscribe: () => ({ unsubscribe: () => undefined }),
      unsubscribe: () => undefined,
    }),
  };
};

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : createNoopSupabase();

// True when a real Supabase backend was configured at build time. When false,
// the app runs the noop client (local demo mode) — auth calls cannot be
// trusted to validate credentials, so callers must treat it as a dev-only
// fallback and never grant privileged roles through it.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export default supabase;
