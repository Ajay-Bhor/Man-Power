@echo off
title TalentPulse HR Management Portal Server
echo ==========================================================
echo Starting TalentPulse HR Portal Web Server...
echo ==========================================================
powershell -ExecutionPolicy Bypass -File "%~dp0run_portal.ps1"
pause
