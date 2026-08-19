@echo off
setlocal
cd /d "%~dp0"

echo Healthcare Suite - Final Release Verification
echo.

if not exist node_modules (
  echo [1/3] Installing dependencies...
  call npm install
  if errorlevel 1 goto :fail
) else (
  echo [1/3] Dependencies already installed.
)

echo [2/3] Running full audit suite...
call npm run check
if errorlevel 1 goto :fail

echo [3/3] Building production bundle...
call npm run build
if errorlevel 1 goto :fail

echo.
echo ============================================================
echo RELEASE VERIFICATION PASSED
echo Production bundle is available in the dist folder.
echo ============================================================
exit /b 0

:fail
echo.
echo ============================================================
echo RELEASE VERIFICATION FAILED
echo Review the error above before promoting this version to stable.
echo ============================================================
exit /b 1
