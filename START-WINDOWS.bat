@echo off
title PDFCraft Pro - Starting...
color 0A

echo.
echo  ╔══════════════════════════════════════╗
echo  ║        PDFCraft Pro v2.0             ║
echo  ║   Free PDF Converter - Node.js       ║
echo  ╚══════════════════════════════════════╝
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js is not installed!
    echo  Please download and install Node.js from: https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo  [OK] Node.js found: 
node --version

:: Check if node_modules exists
if not exist "node_modules" (
    echo.
    echo  [INFO] Installing dependencies (first run only)...
    echo  This may take a minute...
    echo.
    npm install
    if %errorlevel% neq 0 (
        echo  [ERROR] npm install failed. Check your internet connection.
        pause
        exit /b 1
    )
    echo  [OK] Dependencies installed!
)

:: Check for LibreOffice (for Word/PPT conversion)
echo.
where libreoffice >nul 2>&1
if %errorlevel% neq 0 (
    where soffice >nul 2>&1
    if %errorlevel% neq 0 (
        echo  [WARN] LibreOffice not found in PATH.
        echo         Word ^& PowerPoint conversion will not work without it.
        echo         Download from: https://www.libreoffice.org/download/
        echo         Image to PDF ^& PDF tools will still work fine.
        echo.
    ) else (
        echo  [OK] LibreOffice (soffice) found.
    )
) else (
    echo  [OK] LibreOffice found.
)

:: Create required folders
if not exist "uploads" mkdir uploads
if not exist "outputs" mkdir outputs

:: Start the server
echo.
echo  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo  Starting PDFCraft Pro server...
echo  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

:: Open browser after short delay
start /b cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000"

:: Start Node server
node server.js

echo.
echo  Server stopped.
pause
