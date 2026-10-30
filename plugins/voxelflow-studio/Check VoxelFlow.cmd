@echo off
setlocal
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 22 or newer, then reopen this launcher.
  pause
  exit /b 1
)
node -e "if(Number(process.versions.node.split('.')[0]) < 22) process.exit(1)"
if errorlevel 1 (
  echo VoxelFlow needs Node.js 22 or newer.
  pause
  exit /b 1
)
node "%~dp0server\doctor.mjs"
set "VOXELFLOW_CHECK_EXIT=%ERRORLEVEL%"
echo.
pause
exit /b %VOXELFLOW_CHECK_EXIT%
