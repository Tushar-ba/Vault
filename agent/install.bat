@echo off
REM Blockscout MCP Agent Installation Script for Windows

echo 🚀 Installing Blockscout MCP Agent...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

echo ✅ Node.js version: 
node --version

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo ✅ npm version: 
npm --version

REM Install dependencies
echo 📦 Installing dependencies...
npm install

if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo ✅ Dependencies installed successfully

REM Create .env file if it doesn't exist
if not exist .env (
    echo 📝 Creating .env file...
    copy .env.example .env
    echo ✅ .env file created. Please edit it with your API keys.
) else (
    echo ✅ .env file already exists
)

REM Create logs directory
echo 📁 Creating logs directory...
if not exist logs mkdir logs

REM Build the project
echo 🔨 Building the project...
npm run build

if %errorlevel% neq 0 (
    echo ❌ Build failed
    pause
    exit /b 1
)

echo ✅ Build completed successfully

REM Run tests
echo 🧪 Running tests...
npm test

if %errorlevel% neq 0 (
    echo ⚠️  Some tests failed, but installation continues...
) else (
    echo ✅ All tests passed
)

echo.
echo 🎉 Installation completed successfully!
echo.
echo Next steps:
echo 1. Edit .env file with your API keys
echo 2. Start the application: npm start
echo 3. Or start individual services:
echo    - npm run telegram-bot
echo    - npm run dashboard
echo.
echo For more information, see README.md
pause

