#!/usr/bin/env node

const https = require('https');
const http = require('http');

const API_BASE = 'http://localhost:3002';

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testAuth() {
  console.log('🧪 Testing Job Finder Authentication\n');

  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const health = await makeRequest('GET', '/health');
    console.log(`   Status: ${health.status} - ${health.status === 200 ? '✅ OK' : '❌ Failed'}`);

    // Test registration
    console.log('\n2. Testing user registration...');
    const testUser = {
      email: `test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User'
    };

    const register = await makeRequest('POST', '/api/auth/register', testUser);
    console.log(`   Status: ${register.status}`);
    
    if (register.status === 201) {
      console.log('   ✅ Registration successful!');
      console.log(`   User ID: ${register.data.user?.id}`);
      
      // Test login
      console.log('\n3. Testing login...');
      const login = await makeRequest('POST', '/api/auth/login', {
        email: testUser.email,
        password: testUser.password
      });
      
      console.log(`   Status: ${login.status}`);
      if (login.status === 200) {
        console.log('   ✅ Login successful!');
        console.log(`   Token received: ${login.data.token ? 'Yes' : 'No'}`);
      } else {
        console.log('   ❌ Login failed');
        console.log(`   Error: ${JSON.stringify(login.data, null, 2)}`);
      }
    } else {
      console.log('   ❌ Registration failed');
      console.log(`   Error: ${JSON.stringify(register.data, null, 2)}`);
      
      if (register.data.message && register.data.message.includes('first_name')) {
        console.log('\n💡 This error suggests the database tables are not set up yet.');
        console.log('   Please run the SQL script in Supabase first!');
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Backend server is not running on port 3002');
      console.log('   Make sure to start it with: npm run dev (in packages/backend)');
    }
  }
}

testAuth();