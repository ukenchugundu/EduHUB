@echo off
REM Start the EduHub development environment (single port via backend)
REM This script ensures Node.js is on PATH for the lifetime of this process.
set "NODE_DIR=C:\Program Files\nodejs"
if not exist "%NODE_DIR%\node.exe" (
  echo ERROR: Node.js not found at %NODE_DIR%.
  echo Please install Node.js and try again.
  exit /b 1
)
set "PATH=%NODE_DIR%;%PATH%"
npm run dev
