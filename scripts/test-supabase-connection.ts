
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

console.log('Initializing Supabase client...');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testSupabase() {
    console.log('Testing connection...');
    try {
        const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
        if (error) {
            console.error('Error:', error);
        } else {
            console.log('Success! User count:', data); // data is null for head:true with count, count is in 'count' property
        }
    } catch (e) {
        console.error('Exception:', e);
    }
}

testSupabase();
