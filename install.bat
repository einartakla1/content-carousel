@echo off
echo =========================================
echo Carousel Advertorial Editor - Setup
echo =========================================
echo.

REM Check if npm is installed
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: npm is not installed
    echo Please install Node.js and npm from https://nodejs.org/
    pause
    exit /b 1
)

echo ✓ Node.js and npm found
echo.

REM Install dependencies
echo Installing dependencies...
call npm install

if %errorlevel% equ 0 (
    echo.
    echo =========================================
    echo ✓ Installation Complete!
    echo =========================================
    echo.
    echo To start the editor:
    echo   npm run dev
    echo.
    echo The editor will open at http://localhost:3000
    echo.
    echo Documentation:
    echo   - QUICK_START.md - Get started in 5 minutes
    echo   - README.md - Complete documentation
    echo   - SYSTEM_OVERVIEW.md - Technical details
    echo   - DEPLOYMENT_CHECKLIST.md - Deployment guide
    echo.
) else (
    echo.
    echo Installation failed
    echo Please check the error messages above
    pause
    exit /b 1
)

pause
