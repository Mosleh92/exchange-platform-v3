import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qimzwedwkxhhemmxgciv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbXp3ZWR3a3hoaGVtbXhnY2l2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1OTk1MjYsImV4cCI6MjA2NjE3NTUyNn0.VhoRtF1BXlrOPT929_fwN__UUwCSpGPM7G-Lk73X1_I';
export const supabase = createClient(supabaseUrl, supabaseKey); 
