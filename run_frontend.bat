@echo off
title TalentPulse Frontend Server
echo Starting TalentPulse Frontend on http://localhost:5173...
cd /d "%~dp0hr-management-portal\frontend"
call npm.cmd run dev
pause

