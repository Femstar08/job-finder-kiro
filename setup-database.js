#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🗄️  Database Setup Guide\n');

console.log('Your backend is running but needs the database schema to be created.');
console.log('Here\'s how to set up your Supabase database:\n');

console.log('📋 Steps to set up the database:');
console.log('1. Go to your Supabase project: https://supabase.com/dashboard');
console.log('2. Navigate to the SQL Editor');
console.log('3. Copy and paste the SQL from: packages/backend/src/database/init.sql');
console.log('4. Run the SQL script to create all tables\n');

console.log('🔗 Quick links:');
console.log('- Supabase Dashboard: https://supabase.com/dashboard');
console.log('- Your project URL: https://usjgkdmxwtiuducfshkq.supabase.co');
console.log('- SQL Editor: https://supabase.com/dashboard/project/usjgkdmxwtiuducfshkq/sql\n');

console.log('📄 SQL Script location:');
console.log('packages/backend/src/database/init.sql\n');

// Read and display first few lines of the SQL file
const sqlPath = path.join(__dirname, 'packages/backend/src/database/init.sql');
if (fs.existsSync(sqlPath)) {
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');
  const lines = sqlContent.split('\n').slice(0, 10);
  
  console.log('📝 Preview of SQL script:');
  console.log('```sql');
  lines.forEach(line => console.log(line));
  console.log('... (and more)');
  console.log('```\n');
}

console.log('✅ After running the SQL script, your API will work correctly!');
console.log('🚀 Test with: curl http://localhost:3002/health');