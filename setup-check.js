#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Job Finder Setup Checker\n');

// Check backend .env file
const backendEnvPath = path.join(__dirname, 'packages/backend/.env');
if (fs.existsSync(backendEnvPath)) {
  console.log('✅ Backend .env file exists');
  
  const envContent = fs.readFileSync(backendEnvPath, 'utf8');
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY', 
    'N8N_BASE_URL',
    'N8N_API_TOKEN',
    'N8N_WEBHOOK_SECRET'
  ];
  
  console.log('\n📋 Configuration Status:');
  requiredVars.forEach(varName => {
    const hasVar = envContent.includes(`${varName}=`) && !envContent.includes(`${varName}=your-`);
    console.log(`${hasVar ? '✅' : '❌'} ${varName}: ${hasVar ? 'Configured' : 'Needs setup'}`);
  });
  
  console.log('\n🔧 Next Steps:');
  console.log('1. Set up Supabase project at https://supabase.com');
  console.log('2. Get N8N API token from https://n8n.beaconledger.com/');
  console.log('3. Update packages/backend/.env with your actual values');
  console.log('4. Run: npm run dev in packages/backend/');
  
} else {
  console.log('❌ Backend .env file not found');
}

console.log('\n🌐 Generated Webhook Secret:');
console.log('89e399d6ce3954f3a326836cf87c1c61fffe0c39c7a94b9e7ef2fdecc188b227');
console.log('Use this in your N8N webhook configurations');