# User Management System

The Warpio web interface now supports per-user configuration with individual home directories and API keys.

## Features

Each user can have:
- **Username & Password**: Basic authentication
- **Home Directory**: Isolated working directory for terminal and file access  
- **Gemini API Key**: Personal API key for warpio CLI (optional, falls back to server default)

## User Management

### Creating Users

#### Using the CLI script:
```bash
# Basic user (uses default home directory)
node scripts/manage-users.cjs create alice alice123

# User with custom home directory
node scripts/manage-users.cjs create bob bob123 /path/to/bob/workspace

# User with custom home directory and API key
node scripts/manage-users.cjs create charlie charlie123 /home/charlie AIzaSyC_YOUR_API_KEY
```

#### Using the API directly:
```bash
# Login as admin first
TOKEN=$(curl -s -X POST http://localhost:3003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"warpio","password":"warpio123"}' | jq -r '.token')

# Create new user
curl -X POST http://localhost:3003/api/auth/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "password": "password123",
    "workingDirectory": "/home/newuser",
    "geminiApiKey": "AIzaSyC_YOUR_GEMINI_API_KEY"
  }'
```

### Listing Users

```bash
node scripts/manage-users.cjs list
```

### Testing Login

```bash
node scripts/manage-users.cjs login username password
```

## How It Works

1. **Authentication**: Users log in with their username/password
2. **Session**: JWT tokens include user-specific settings (home directory, API key)
3. **Terminal**: Each user gets warpio CLI with their personal API key
4. **File Access**: Users can only access files within their designated home directory
5. **Security**: Path traversal protection prevents access outside working directory

## Default Admin User

- **Username**: `warpio`
- **Password**: `warpio123`
- **Home Directory**: `/home/jcernuda` (configurable in users.json)

## API Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout  
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/users` - Create new user (admin only)
- `GET /api/auth/users` - List all users (admin only)

## Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Tokens**: 24-hour expiration
- **Path Validation**: Users cannot access files outside their home directory
- **API Key Isolation**: Each user's terminal uses their personal API key
- **Admin Protection**: User creation requires admin authentication

## Configuration

User data is stored in: `~/.warpio/web-server/users.json`

Each user entry contains:
```json
{
  "id": "unique-user-id",
  "username": "username",
  "passwordHash": "bcrypt-hash",
  "workingDirectory": "/path/to/user/home",
  "geminiApiKey": "optional-api-key",
  "createdAt": "timestamp",
  "lastLogin": "timestamp"
}
```

## Web Interface

Users can now:
1. **Login** with their personal credentials at `http://localhost:3003`
2. **Access Terminal** - Runs warpio with their API key in their home directory
3. **Browse Files** - Limited to their designated home directory
4. **Edit Files** - Full text editor with save functionality

Each user sees only their own workspace and uses their own API quota.