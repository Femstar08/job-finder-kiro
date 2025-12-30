#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://usjgkdmxwtiuducfshkq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzamdrZG14d3RpdWR1Y2ZzaGtxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDg2MzMyNSwiZXhwIjoyMDgwNDM5MzI1fQ.RjNeyj1vo7qTVD7sTnrjZfzNEwA8k92oqkgzOIXn7_c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('🔍 Checking Database Schema\n');

  try {
    // Try to get table info using a simple select
    console.log('1. Checking jf_users table structure...');
    
    const { data, error } = await supabase
      .from('jf_users')
      .select('*')
      .limit(0); // Get no rows, just structure

    if (error) {
      console.log('   Error:', error.message);
      console.log('   Code:', error.code);
      
      if (error.code === 'PGRST116') {
        console.log('   ❌ Table jf_users does not exist');
        console.log('\n💡 Solution: Run the SQL script in Supabase');
        console.log('   1. Go to: https://supabase.com/dashboard/project/usjgkdmxwtiuducfshkq/sql');
        console.log('   2. Copy all content from: quick-db-setup.sql');
        console.log('   3. Paste and click "Run"');
      }
      return;
    }

    console.log('   ✅ Table exists and is accessible');

    // Try a simple insert to see what columns are expected
    console.log('2. Testing minimal insert...');
    
    const { data: insertData, error: insertError } = await supabase
      .from('jf_users')
      .insert({
        email: `test-${Date.now()}@example.com`,
        password_hash: 'test'
      })
      .select()
      .single();

    if (insertError) {
      console.log('   Insert error:', insertError.message);
      
      if (insertError.message.includes('first_name')) {
        console.log('\n💡 The table structure might be different than expected');
        console.log('   Try refreshing Supabase schema cache or re-running the SQL script');
      }
    } else {
      console.log('   ✅ Basic insert works!');
      console.log('   User created:', insertData.id);
      
      // Clean up
      await supabase.from('jf_users').delete().eq('id', insertData.id);
      console.log('   🧹 Test user cleaned up');
    }

  } catch (error) {
    console.error('❌ Schema check failed:', error.message);
  }
}

checkSchema();