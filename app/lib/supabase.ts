import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use the service role key for server-side operations (full table access).
// Never expose this key to the client.
export const supabase = createClient(supabaseUrl, supabaseServiceKey);
