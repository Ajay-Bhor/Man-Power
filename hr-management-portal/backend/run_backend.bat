@echo off
title TalentPulse HR Portal - Spring Boot Backend
set JAVA_HOME=C:\Program Files\Java\jdk-25.0.5.0.3
set MVN_BIN=%~dp0..\..\tools\apache-maven-3.9.6\bin\mvn.cmd

echo ==========================================================
echo Starting Spring Boot 3 Backend on http://localhost:8080...
echo ==========================================================

cd /d "%~dp0"
call "%MVN_BIN%" spring-boot:run
pause
