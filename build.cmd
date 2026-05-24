@echo off
cd /d "%~dp0"
npm run build
echo.
echo Done! Reload the extension in edge://extensions/
pause
