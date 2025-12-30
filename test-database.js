#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Use the same credentials from your .env file
const supabaseUrl = 'https://usjgkdmxwtiuducfshkq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzamdrZG14d3RpdWR1Y2ZzaGtxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDg2MzMyNSwiZXhwIjoyMDgwNDM5MzI1fQ.RjNeyj1vo7qTVD7sTnrjZfzNEwA8k92oqkgzOIXn7_c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabase() {
  console.log('🔍 Testing Database Connection and Tables\n');

  try {
    // Test connection
    console.log('1. Testing Supabase connection...');
    
    // Test if jf_users table exists
    console.log('2. Checking if jf_users table exists...');
    const { data: users, error: usersError } = await supabase
      .from('jf_users')
      .select('count')
      .limit(1);

    if (usersError) {
      if (usersError.code === 'PGRST116') {
        console.log('   ❌ jf_users table does not exist');
        console.log('   💡 You need to run the SQL script in Supabase!');
        console.log('   📋 Steps:');
        console.log('      1. Go to: https://supabase.com/dashboard/project/usjgkdmxwtiuducfshkq/sql');
        console.log('      2. Copy content from: quick-db-setup.sql');
        console.log('      3. Paste and run the SQL script');
        return;
      } else {
        throw usersError;
      }
    }

    console.log('   ✅ jf_users table exists!');

    // Test inserting a user
    console.log('3. Testing user creation...');
    const testEmail = `test-${Date.now()}@example.com`;
    
    const { data: newUser, error: insertError } = await supabase
      .from('jf_users')
      .insert({
        email: testEmail,
        password_hash: 'test_hash',
        first_name: 'Test',
        last_name: 'User'
      })
      .select()
      .single();

    if (insertError) {
      console.log('   ❌ Failed to create user:', insertError.message);
      return;
    }

    console.log('   ✅ User created successfully!');
    console.log(`   User ID: ${newUser.id}`);

    // Clean up test user
    await supabase.from('jf_users').delete().eq('id', newUser.id);
    console.log('   🧹 Test user cleaned up');

    console.log('\n🎉 Database is working correctly!');
    console.log('   Your authentication should now work in the frontend.');

  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    
    if (error.message.includes('Invalid API key')) {
      console.log('\n💡 API key issue - check your Supabase credentials');
    }
  }
}

testDatabase();