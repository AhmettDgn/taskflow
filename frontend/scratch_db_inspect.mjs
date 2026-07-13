import path from 'node:path';
import { loadEnvFile } from 'node:process';
import { createClient } from '@supabase/supabase-js';

loadEnvFile(path.resolve(process.cwd(), '.env.local'));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkTable(tableName) {
  try {
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log(`❌ Table ${tableName}: ERROR - ${error.message} (${error.code})`);
      return false;
    } else {
      console.log(`✅ Table ${tableName}: EXISTS (Row count: ${count})`);
      return true;
    }
  } catch (err) {
    console.log(`❌ Table ${tableName}: EXCEPTION - ${err.message}`);
    return false;
  }
}

console.log('Inspecting Supabase database tables...');
const tables = [
  'profiles',
  'teams',
  'team_members',
  'tasks',
  'task_assignees',
  'comments',
  'notifications',
  'boards',
  'board_items',
  'app_telegram_settings'
];

for (const table of tables) {
  await checkTable(table);
}
