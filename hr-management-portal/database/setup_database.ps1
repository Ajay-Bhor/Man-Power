# ==============================================================================
# TalentPulse HR Portal - Automated Database Setup Script
# ==============================================================================
param (
    [string]$RootPassword = "",
    [string]$Port = "3306"
)

$mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
if (-not (Test-Path $mysqlPath)) {
    $found = Get-ChildItem "C:\Program Files\MySQL" -Recurse -Filter "mysql.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) {
        $mysqlPath = $found.FullName
    } else {
        Write-Error "MySQL client (mysql.exe) not found under Program Files. Please ensure MySQL Server 8.0 is installed."
        exit 1
    }
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   TalentPulse HR Portal - MySQL 8.x Database Initializer " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Found MySQL at: $mysqlPath" -ForegroundColor Green

if ([string]::IsNullOrWhiteSpace($RootPassword)) {
    $RootPassword = Read-Host -Prompt "Enter MySQL root password" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($RootPassword)
    $PlainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
} else {
    $PlainPassword = $RootPassword
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1. Create Database
Write-Host "`n[1/4] Creating database 'hr_portal_db'..." -ForegroundColor Yellow
$createDbSql = "CREATE DATABASE IF NOT EXISTS hr_portal_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
& "$mysqlPath" -u root -p"$PlainPassword" -P $Port -e "$createDbSql" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to connect to MySQL or create database. Please verify the root password." -ForegroundColor Red
    exit 1
}
Write-Host "Database 'hr_portal_db' created successfully!" -ForegroundColor Green

# 2. Run V1 Migration (Schema)
Write-Host "`n[2/4] Executing V1 Schema Migration (17 relational tables)..." -ForegroundColor Yellow
$v1Path = Join-Path $scriptDir "migrations\V1__init_schema.sql"
& "$mysqlPath" -u root -p"$PlainPassword" -P $Port hr_portal_db -e "source $v1Path" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error executing V1 schema migration." -ForegroundColor Red
    exit 1
}
Write-Host "V1 Schema created successfully!" -ForegroundColor Green

# 3. Run V2 Migration (Seed Data)
Write-Host "`n[3/4] Executing V2 Seed Data Migration (8 roles, departments, employees, requisitions)..." -ForegroundColor Yellow
$v2Path = Join-Path $scriptDir "migrations\V2__seed_initial_data.sql"
& "$mysqlPath" -u root -p"$PlainPassword" -P $Port hr_portal_db -e "source $v2Path" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error executing V2 seed data migration." -ForegroundColor Red
    exit 1
}
Write-Host "V2 Seed data loaded successfully!" -ForegroundColor Green

# 4. Run V3 Migration (Analytical Views)
Write-Host "`n[4/4] Executing V3 Analytical Views Migration (v_requisition_tat_summary, v_recruiter_workload)..." -ForegroundColor Yellow
$v3Path = Join-Path $scriptDir "migrations\V3__audit_and_views.sql"
& "$mysqlPath" -u root -p"$PlainPassword" -P $Port hr_portal_db -e "source $v3Path" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error executing V3 views migration." -ForegroundColor Red
    exit 1
}
Write-Host "V3 Analytical views created successfully!" -ForegroundColor Green

# 5. Verify Tables Count
Write-Host "`nVerification:" -ForegroundColor Cyan
& "$mysqlPath" -u root -p"$PlainPassword" -P $Port hr_portal_db -e "SHOW TABLES;" 

Write-Host "`nDatabase setup completed successfully! Ready for Spring Boot backend." -ForegroundColor Green
