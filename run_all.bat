@echo off
title TalentPulse HR Management Portal - Full Stack Runner
echo ========================================================
echo  Starting TalentPulse ATS HR Management Portal
echo ========================================================
start "TalentPulse Backend (Port 8080)" cmd /c "cd /d %~dp0hr-management-portal\backend && run_backend.bat"
start "TalentPulse Frontend (Port 5173)" cmd /c "cd /d %~dp0hr-management-portal\frontend && npm.cmd run dev"
echo Waiting 3 seconds for servers to initialize...
timeout /t 3 >nul
start http://localhost:5173/
echo All servers launched!

