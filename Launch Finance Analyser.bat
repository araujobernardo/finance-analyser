@echo off
cd /d "%~dp0"
echo Starting Finance Analyser...
start "" "http://localhost:4173"
npm run preview
