@echo off
cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo   Node.js is not installed.
    echo   Download it from https://nodejs.org (version 18 or later).
    echo.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo.
    echo   Installing dependencies (first run only)...
    echo.
    call npm install
)

echo.
echo   Starting PlotMate Storyboards...
echo   Open http://localhost:9107 in your browser.
echo.
echo   Press Ctrl+C to stop.
echo.

call npm run dev
pause
