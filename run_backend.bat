@echo off
title TalentPulse Backend Server
echo Starting TalentPulse Backend on http://localhost:8080...
cd /d "%~dp0hr-management-portal\backend"
call run_backend.bat
pause

