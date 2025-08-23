#!/usr/bin/env node

/**
 * Simple user management for Warpio Net
 * Usage: node user-manager.js create <username> <password> <homedir> <apikey>
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_USERS_FILE = '/app/data/users.json';

class UserManager {
  constructor(usersFile = process.env.USERS_FILE || DEFAULT_USERS_FILE) {
    this.usersFile = usersFile;
    this.ensureUsersFile();
  }

  ensureUsersFile() {
    try {
      fs.mkdirSync(path.dirname(this.usersFile), { recursive: true });
      if (!fs.existsSync(this.usersFile)) {
        fs.writeFileSync(this.usersFile, '[]');
      }
    } catch (error) {
      console.error('Failed to ensure users file:', error.message);
    }
  }

  getUsers() {
    try {
      const content = fs.readFileSync(this.usersFile, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to read users file:', error.message);
      return [];
    }
  }

  saveUsers(users) {
    try {
      fs.writeFileSync(this.usersFile, JSON.stringify(users, null, 2));
    } catch (error) {
      console.error('Failed to save users file:', error.message);
      throw error;
    }
  }

  createUser(username, password, homeDir, apiKey) {
    console.log(`Creating user: ${username}`);
    
    const users = this.getUsers();
    
    // Check if user already exists
    if (users.find(u => u.username === username)) {
      console.log(`❌ User ${username} already exists`);
      return false;
    }
    
    // Set up user directory
    const userWorkingDir = homeDir || `/app/data/${username}`;
    
    try {
      console.log(`📁 Creating home directory: ${userWorkingDir}`);
      fs.mkdirSync(userWorkingDir, { recursive: true });
      
      // Copy .gemini config files to user directory
      const geminiTemplatePath = '/usr/local/lib/warpio-cli-src/.gemini';
      const userGeminiPath = path.join(userWorkingDir, '.gemini');
      
      if (fs.existsSync(geminiTemplatePath)) {
        console.log(`📋 Copying .gemini config files to user directory`);
        this.copyDirectory(geminiTemplatePath, userGeminiPath);
      } else {
        console.log(`⚠️  Warning: .gemini template not found at ${geminiTemplatePath}`);
      }
    } catch (error) {
      console.error(`❌ Failed to create directory ${userWorkingDir}:`, error.message);
      return false;
    }
    
    // Create user data
    const userData = {
      username,
      password,
      workingDirectory: userWorkingDir,
      createdAt: new Date().toISOString()
    };
    
    if (apiKey) {
      userData.geminiApiKey = apiKey;
    }
    
    // Add user and save
    users.push(userData);
    
    try {
      this.saveUsers(users);
    } catch (error) {
      console.error(`❌ Failed to save user data:`, error.message);
      return false;
    }
    
    console.log("✅ User created successfully:");
    console.log(`   Username: ${userData.username}`);
    console.log(`   Home Directory: ${userData.workingDirectory}`);
    console.log(`   API Key: ${userData.geminiApiKey ? "***" + userData.geminiApiKey.slice(-8) : "Not set"}`);
    console.log(`   Created: ${userData.createdAt}`);
    
    return true;
  }

  listUsers() {
    const users = this.getUsers();
    console.log(`📋 ${users.length} users found:`);
    users.forEach(user => {
      console.log(`   - ${user.username} (${user.workingDirectory})`);
    });
    return users;
  }

  copyDirectory(src, dest) {
    try {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      
      const items = fs.readdirSync(src);
      for (const item of items) {
        const srcPath = path.join(src, item);
        const destPath = path.join(dest, item);
        
        const stat = fs.statSync(srcPath);
        if (stat.isDirectory()) {
          this.copyDirectory(srcPath, destPath);
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    } catch (error) {
      console.error(`Failed to copy directory from ${src} to ${dest}:`, error.message);
    }
  }
}

// Command line interface
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const manager = new UserManager();
  
  switch (command) {
    case 'create':
      if (args.length !== 5) {
        console.log('Usage: node user-manager.js create <username> <password> <homedir> <apikey>');
        process.exit(1);
      }
      const [, username, password, homeDir, apiKey] = args;
      const success = manager.createUser(username, password, homeDir, apiKey);
      process.exit(success ? 0 : 1);
      
    case 'list':
      manager.listUsers();
      break;
      
    default:
      console.log('Available commands:');
      console.log('  create <username> <password> <homedir> <apikey> - Create a new user');
      console.log('  list - List all users');
      process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { UserManager };