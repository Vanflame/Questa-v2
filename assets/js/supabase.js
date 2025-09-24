// Supabase Client Configuration
// Note: Add this script tag to your HTML before this module:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

// Supabase configuration
const SUPABASE_URL = 'https://rhfqaebkvxyayzrpmjhl.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoZnFhZWJrdnh5YXl6cnBtamhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NDMwNzgsImV4cCI6MjA3NDIxOTA3OH0.X8nTjGBnUoOB7AJG88cJnvr8oruLrHSqrjrxCfCh4hA'

// Create and export Supabase client
export const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Also make it available globally for non-module scripts
window.supabaseClient = supabaseClient
