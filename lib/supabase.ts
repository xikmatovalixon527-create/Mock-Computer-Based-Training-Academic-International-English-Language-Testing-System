import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn(
    '[Supabase Config] Missing environment variables. Using build-time fallback placeholders.'
  );
}

const finalUrl = supabaseUrl || 'https://placeholder.supabase.co';
const finalKey = supabaseServiceKey || 'placeholder-service-key-for-compilation';

export const supabaseAdmin = createClient(finalUrl, finalKey, {
  auth: { persistSession: false }
});