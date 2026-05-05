import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/web/.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('lectures').select('*').limit(1);
  console.log('Lectures:', Object.keys(data[0] || {}));
  
  const { data: d2, error: e2 } = await supabase.from('lecture_class_access').select('*').limit(1);
  console.log('Access:', Object.keys(d2[0] || {}));
  console.log('Errors:', error, e2);
}
check();
