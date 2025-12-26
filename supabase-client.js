// Supabase Configuration
// Replace these with your actual values from the Supabase Dashboard
const SUPABASE_URL = '';
const SUPABASE_ANON_KEY = '';

let supabaseClient = null;

if (typeof window.supabase !== 'undefined') {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
    console.error('Supabase library not loaded. Make sure to include the CDN script tag: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>');
}

// Expose to window for global access
window.supabaseClient = supabaseClient;
