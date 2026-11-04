# ==============================================================================
# TalentPulse HR Portal - Spring Boot Backend Runner
# Starts the Java 21+ Spring Boot server with Maven
# ==============================================================================
$env:JAVA_HOME = "C:\Program Files\Java\jdk-25.0.5.0.3"
$backendDir = $PSScriptRoot
$mvnCmd = Join-Path (Split-Path -Parent (Split-Path -Parent $backendDir)) "tools\apache-maven-3.9.6\bin\mvn.cmd"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Starting TalentPulse Spring Boot 3 Backend on :8080      " -ForegroundColor Green
Write-Host " Using Java JDK: $env:JAVA_HOME                           " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

Set-Location -Path $backendDir
& $mvnCmd spring-boot:run
