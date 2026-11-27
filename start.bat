@echo off
setlocal
title MedFinder launcher
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install it from https://nodejs.org and run this file again.
  pause
  exit /b 1
)

rem First run: create server\.env with a random secret
if not exist "server\.env" (
  node -e "const fs=require('fs');const s=require('crypto').randomBytes(24).toString('hex');fs.writeFileSync('server/.env',fs.readFileSync('server/.env.example','utf8').replace('JWT_SECRET=change_me','JWT_SECRET='+s))"
  echo Created server\.env. If your MySQL has a password, put it in DB_PASS and run this file again.
)

rem MySQL must be running (XAMPP control panel, MySQL, Start)
netstat -ano | findstr ":3306" >nul
if errorlevel 1 (
  echo.
  echo WARNING: MySQL does not seem to be running. Start it in the XAMPP control panel.
  echo.
)

echo Installing server packages...
pushd server
call npm install --no-audit --no-fund
if errorlevel 1 (
  echo npm install failed in the server folder.
  popd
  pause
  exit /b 1
)
popd

echo Installing website packages...
pushd client
call npm install --no-audit --no-fund
if errorlevel 1 (
  echo npm install failed in the client folder.
  popd
  pause
  exit /b 1
)
popd

start "MedFinder server" /d "%~dp0server" cmd /k npm start
start "MedFinder website" /d "%~dp0client" cmd /k npm run dev

timeout /t 8 >nul
start http://localhost:5173/status

echo.
echo Two windows opened: the server and the website. Keep both open.
echo The browser shows the status page. When all three lines are green, open http://localhost:5173
pause
