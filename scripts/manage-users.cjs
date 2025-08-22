#!/usr/bin/env node

/**
 * User Management CLI for Warpio Web Interface
 * 
 * Usage:
 *   node scripts/manage-users.js create <username> <password> [homeDir] [apiKey]
 *   node scripts/manage-users.js list
 *   node scripts/manage-users.js login <username> <password>
 */

const https = require('https');
const http = require('http');

const BASE_URL = 'http://localhost:3003';

// Helper function to make HTTP requests
function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${parsed.error || responseData}`));
          }
        } catch (e) {
          reject(new Error(`Invalid JSON response: ${responseData}`));
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

async function checkSetupStatus() {
  try {
    const response = await makeRequest('GET', '/api/auth/setup-status');
    return response;
  } catch (error) {
    console.error('Failed to check setup status:', error.message);
    process.exit(1);
  }
}

async function setupFirstUser(username, password, homeDir, apiKey) {
  try {
    const userData = {
      username,
      password,
      workingDirectory: homeDir || `/home/${username}`,
      ...(apiKey && { geminiApiKey: apiKey })
    };
    
    const response = await makeRequest('POST', '/api/auth/setup', userData);
    
    console.log('✅ First user created successfully:');
    console.log(`   Username: ${response.user.username}`);
    console.log(`   Home Directory: ${response.user.workingDirectory}`);
    console.log(`   API Key: ${response.user.geminiApiKey ? '***' + response.user.geminiApiKey.slice(-8) : 'Not set'}`);
    console.log(`   Created: ${response.user.createdAt}`);
    console.log('');
    console.log('🎉 Setup complete! You can now login at http://localhost:3003');
    
    return response.user;
  } catch (error) {
    console.error('❌ Failed to setup first user:', error.message);
    process.exit(1);
  }
}

async function loginAsAdmin(username, password) {
  try {
    const response = await makeRequest('POST', '/api/auth/login', {
      username: username || 'admin',
      password: password || 'admin123'
    });
    return response.token;
  } catch (error) {
    console.error('Failed to login as admin:', error.message);
    console.error('Hint: Use the username/password of an existing user with admin privileges');
    process.exit(1);
  }
}

async function createUser(username, password, homeDir, apiKey, adminUser, adminPass) {
  const token = await loginAsAdmin(adminUser, adminPass);
  
  try {
    const userData = {
      username,
      password,
      workingDirectory: homeDir || `/home/${username}`,
      ...(apiKey && { geminiApiKey: apiKey })
    };
    
    const response = await makeRequest('POST', '/api/auth/users', userData, token);
    
    console.log('✅ User created successfully:');
    console.log(`   Username: ${response.user.username}`);
    console.log(`   Home Directory: ${response.user.workingDirectory}`);
    console.log(`   API Key: ${response.user.geminiApiKey ? '***' + response.user.geminiApiKey.slice(-8) : 'Not set'}`);
    console.log(`   Created: ${response.user.createdAt}`);
  } catch (error) {
    console.error('❌ Failed to create user:', error.message);
    process.exit(1);
  }
}

async function listUsers(adminUser, adminPass) {
  const token = await loginAsAdmin(adminUser, adminPass);
  
  try {
    const response = await makeRequest('GET', '/api/auth/users', null, token);
    
    console.log('📋 Current Users:');
    console.log('================');
    
    response.users.forEach(user => {
      console.log(`👤 ${user.username}`);
      console.log(`   Home: ${user.workingDirectory}`);
      console.log(`   API Key: ${user.geminiApiKey ? '***' + user.geminiApiKey.slice(-8) : 'Not set'}`);
      console.log(`   Last Login: ${user.lastLogin || 'Never'}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Failed to list users:', error.message);
    process.exit(1);
  }
}

async function testLogin(username, password) {
  try {
    const response = await makeRequest('POST', '/api/auth/login', {
      username,
      password
    });
    
    console.log('✅ Login successful:');
    console.log(`   Username: ${response.user.username}`);
    console.log(`   Home Directory: ${response.user.workingDirectory}`);
    console.log(`   Token: ${response.token.slice(0, 20)}...`);
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    process.exit(1);
  }
}

// CLI argument parsing
const [,, command, ...args] = process.argv;

switch (command) {
  case 'setup':
    if (args.length < 2) {
      console.error('Usage: node manage-users.cjs setup <username> <password> [homeDir] [apiKey]');
      process.exit(1);
    }
    setupFirstUser(args[0], args[1], args[2], args[3]);
    break;

  case 'status':
    checkSetupStatus().then(status => {
      console.log('🔍 Setup Status:');
      console.log(`   Has Users: ${status.hasUsers}`);
      console.log(`   Needs Setup: ${status.needsSetup}`);
      if (status.needsSetup) {
        console.log('');
        console.log('💡 Run "node scripts/manage-users.cjs setup <username> <password>" to create the first user');
      }
    });
    break;

  case 'create':
    if (args.length < 4) {
      console.error('Usage: node manage-users.cjs create <username> <password> <adminUser> <adminPass> [homeDir] [apiKey]');
      process.exit(1);
    }
    createUser(args[0], args[1], args[4], args[5], args[2], args[3]);
    break;
    
  case 'list':
    if (args.length < 2) {
      console.error('Usage: node manage-users.cjs list <adminUser> <adminPass>');
      process.exit(1);
    }
    listUsers(args[0], args[1]);
    break;
    
  case 'login':
    if (args.length < 2) {
      console.error('Usage: node manage-users.cjs login <username> <password>');
      process.exit(1);
    }
    testLogin(args[0], args[1]);
    break;
    
  default:
    console.log('Warpio User Management CLI');
    console.log('==========================');
    console.log('');
    console.log('Commands:');
    console.log('  setup <username> <password> [homeDir] [apiKey]           - Setup first user (no auth required)');
    console.log('  status                                                   - Check setup status');
    console.log('  create <user> <pass> <adminUser> <adminPass> [dir] [key] - Create new user (requires admin)');
    console.log('  list <adminUser> <adminPass>                            - List all users (requires admin)');
    console.log('  login <username> <password>                             - Test user login');
    console.log('');
    console.log('Fresh Installation:');
    console.log('  1. node scripts/manage-users.cjs status');
    console.log('  2. node scripts/manage-users.cjs setup admin admin123 /home/admin AIzaSyC_YOUR_KEY');
    console.log('  3. node scripts/manage-users.cjs create alice alice123 admin admin123');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/manage-users.cjs setup admin mypassword');
    console.log('  node scripts/manage-users.cjs create alice alice123 admin mypassword /home/alice AIzaSyC_ALICE_KEY');
    console.log('  node scripts/manage-users.cjs list admin mypassword');
    console.log('  node scripts/manage-users.cjs login alice alice123');
    break;
}