import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ndohikigbabqzpybjzdv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kb2hpa2lnYmFicXpweWJqemR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1ODY1NjUsImV4cCI6MjA5MDE2MjU2NX0.iDcQ794XTJhEpsT3RlXezOman61msdxMZ1XnHCAwauI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
