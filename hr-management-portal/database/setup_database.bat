@echo off
setlocal
echo ==========================================================
echo    TalentPulse HR Portal - MySQL Database Setup
echo ==========================================================
echo.
set MYSQL_BIN="C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"

if not exist %MYSQL_BIN% (
    echo Error: mysql.exe not found at %MYSQL_BIN%
    pause
    exit /b 1
)

set /p MYSQL_PWD="Enter your MySQL root password: "

echo.
echo [1/4] Creating database hr_portal_db...
%MYSQL_BIN% -u root -p%MYSQL_PWD% -e "CREATE DATABASE IF NOT EXISTS hr_portal_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
if %errorlevel% neq 0 (
    echo [ERROR] Connection failed. Please check your MySQL password.
    pause
    exit /b 1
)

echo [2/9] Running V1 Schema Migration...
%MYSQL_BIN% -u root -p%MYSQL_PWD% hr_portal_db < "%~dp0migrations\V1__init_schema.sql"

echo [3/9] Running V2 Seed Data Migration...
%MYSQL_BIN% -u root -p%MYSQL_PWD% hr_portal_db < "%~dp0migrations\V2__seed_initial_data.sql"

echo [4/9] Running V3 Views Migration...
%MYSQL_BIN% -u root -p%MYSQL_PWD% hr_portal_db < "%~dp0migrations\V3__audit_and_views.sql"

echo [5/9] Running V4 Access Policies and Workflow Migration...
%MYSQL_BIN% -u root -p%MYSQL_PWD% hr_portal_db < "%~dp0migrations\V4__access_policies_and_workflow.sql"

echo [6/9] Running V5 Interview Modes Migration...
%MYSQL_BIN% -u root -p%MYSQL_PWD% hr_portal_db < "%~dp0migrations\V5__add_interview_mode.sql"

echo [7/9] Running V6 Offers and Onboarding Migration...
%MYSQL_BIN% -u root -p%MYSQL_PWD% hr_portal_db < "%~dp0migrations\V6__offers_and_onboarding.sql"

echo [8/9] Running V7 Approvals Inbox Migration...
%MYSQL_BIN% -u root -p%MYSQL_PWD% hr_portal_db < "%~dp0migrations\V7__approvals_inbox.sql"

echo [9/10] Running V8 Employee Lifecycle Migration...
%MYSQL_BIN% -u root -p%MYSQL_PWD% hr_portal_db < "%~dp0migrations\V8__employee_lifecycle.sql"

echo [10/10] Running V9 HR Task Assignments Migration...
%MYSQL_BIN% -u root -p%MYSQL_PWD% hr_portal_db < "%~dp0migrations\V9__hr_task_assignments.sql"

echo.
echo Verifying tables in hr_portal_db:
%MYSQL_BIN% -u root -p%MYSQL_PWD% hr_portal_db -e "SHOW TABLES;"

echo.
echo ==========================================================
echo Database setup completed successfully!
echo ==========================================================
pause

