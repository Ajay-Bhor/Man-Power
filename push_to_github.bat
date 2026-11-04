@echo off
set "PATH=%~dp0tools\git\cmd;%PATH%"
cd /d "%~dp0"
echo ========================================================
echo Pushing Man-Power project to GitHub:
echo https://github.com/Ajay-Bhor/Man-Power.git
echo ========================================================
git status
git push -u origin main
echo.
pause
