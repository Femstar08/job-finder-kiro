#!/usr/bin/env node

require('dotenv').config({ path: './packages/backend/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables. Please check your .env file.');
  process.exit(1);
}

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
