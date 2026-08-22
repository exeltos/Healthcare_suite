@echo off
setlocal
cd /d "%~dp0"

echo Healthcare Suite - Reproducible Release Verification
echo.

if not exist package-lock.json (
  echo BLOCKER: package-lock.json is missing.
  echo Run npm install --package-lock-only once with npm registry access, commit the lockfile, then rerun this verifier.
  goto :fail
)

echo [1/4] Installing exact locked dependencies with npm ci...
call npm ci --no-audit --no-fund
if errorlevel 1 goto :fail

echo [2/4] Running release preflight...
call npm run release:preflight
if errorlevel 1 goto :fail

echo [3/4] Running full release audit suite...
call npm run release:static
if errorlevel 1 goto :fail

echo [4/4] Running syntax verification and production build...
call npm run check:syntax
if errorlevel 1 goto :fail
call npm run build
if errorlevel 1 goto :fail

echo.
echo ============================================================
echo REPRODUCIBLE RELEASE VERIFICATION PASSED
echo Exact dependencies were installed from package-lock.json.
echo Production bundle is available in the dist folder.
echo ============================================================
exit /b 0

:fail
echo.
echo ============================================================
echo RELEASE VERIFICATION FAILED
echo No release should be promoted until every blocker above is resolved.
echo ============================================================
exit /b 1
