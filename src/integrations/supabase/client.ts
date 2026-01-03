// Supabase client configured for local/Docker deployment
// Reads from environment variables (set at container startup)
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Use environment variables - these should be set in .env or injected at container startup
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
