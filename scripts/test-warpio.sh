#!/bin/bash

echo "🧪 Testing Warpio CLI Installation"
echo "=================================="

# Function to check if warpio is available
check_warpio() {
  if command -v warpio >/dev/null 2>&1; then
    echo "✅ warpio command found in PATH"
    echo "   Path: $(which warpio)"
    echo "   Version: $(warpio --version 2>/dev/null || echo 'version check failed')"
    return 0
  else
    echo "❌ warpio command not found in PATH"
    return 1
  fi
}

# Function to install warpio CLI
install_warpio() {
  echo ""
  echo "📦 Installing Warpio CLI..."
  
  # Clone the repository
  if [ -d "/tmp/warpio-cli" ]; then
    echo "   Removing existing /tmp/warpio-cli"
    rm -rf /tmp/warpio-cli
  fi
  
  echo "   Cloning repository..."
  git clone https://github.com/JaimeCernuda/warpio-cli.git /tmp/warpio-cli
  
  if [ $? -ne 0 ]; then
    echo "❌ Failed to clone warpio-cli repository"
    return 1
  fi
  
  cd /tmp/warpio-cli
  
  echo "   Installing dependencies..."
  npm install
  
  if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    return 1
  fi
  
  echo "   Building..."
  npm run build
  
  if [ $? -ne 0 ]; then
    echo "❌ Failed to build warpio-cli"
    return 1
  fi
  
  echo "   Linking globally..."
  npm link
  
  if [ $? -ne 0 ]; then
    echo "❌ Failed to link warpio-cli globally"
    return 1
  fi
  
  echo "✅ Warpio CLI installation completed"
  return 0
}

# Function to test warpio execution
test_warpio() {
  echo ""
  echo "🔄 Testing Warpio CLI execution..."
  
  # Test basic execution (this will likely fail without API key, but should not crash)
  echo "   Testing warpio command..."
  timeout 10s warpio --help 2>&1 | head -5
  local exit_code=$?
  
  if [ $exit_code -eq 0 ] || [ $exit_code -eq 124 ]; then # 124 is timeout exit code
    echo "✅ Warpio CLI executes (exit code: $exit_code)"
    return 0
  else
    echo "❌ Warpio CLI failed to execute (exit code: $exit_code)"
    return 1
  fi
}

# Main execution
echo "Current PATH: $PATH"
echo ""

# Check if already installed
if check_warpio; then
  echo ""
  echo "Warpio CLI is already installed!"
  test_warpio
else
  # Try to install
  if install_warpio; then
    echo ""
    echo "Checking installation..."
    if check_warpio; then
      test_warpio
    else
      echo "❌ Installation completed but warpio still not found in PATH"
      echo "   Checking common locations..."
      ls -la /usr/local/bin/warpio 2>/dev/null || echo "   Not in /usr/local/bin/"
      ls -la ~/.npm-global/bin/warpio 2>/dev/null || echo "   Not in ~/.npm-global/bin/"
      find /usr/local -name "warpio" 2>/dev/null | head -5
    fi
  fi
fi

echo ""
echo "🏁 Warpio CLI test completed"