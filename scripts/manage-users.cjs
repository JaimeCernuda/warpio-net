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

async function loginAsAdmin() {
  try {
    const response = await makeRequest('POST', '/api/auth/login', {
      username: 'warpio',
      password: 'warpio123'
    });
    return response.token;
  } catch (error) {
    console.error('Failed to login as admin:', error.message);
    process.exit(1);
  }
}

async function createUser(username, password, homeDir, apiKey) {
  const token = await loginAsAdmin();
  
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

async function listUsers() {
  const token = await loginAsAdmin();
  
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
  case 'create':
    if (args.length < 2) {
      console.error('Usage: node manage-users.js create <username> <password> [homeDir] [apiKey]');
      process.exit(1);
    }
    createUser(args[0], args[1], args[2], args[3]);
    break;
    
  case 'list':
    listUsers();
    break;
    
  case 'login':
    if (args.length < 2) {
      console.error('Usage: node manage-users.js login <username> <password>');
      process.exit(1);
    }
    testLogin(args[0], args[1]);
    break;
    
  default:
    console.log('Warpio User Management CLI');
    console.log('==========================');
    console.log('');
    console.log('Commands:');
    console.log('  create <username> <password> [homeDir] [apiKey]  - Create new user');
    console.log('  list                                              - List all users');
    console.log('  login <username> <password>                      - Test user login');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/manage-users.js create alice alice123');
    console.log('  node scripts/manage-users.js create bob bob123 /home/bob AIzaSyC_YOUR_API_KEY');
    console.log('  node scripts/manage-users.js list');
    console.log('  node scripts/manage-users.js login alice alice123');
    break;
}