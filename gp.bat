@echo off
REM Store the current date and time in a variable
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "TIMESTAMP=%dt:~0,8%-%dt:~8,6%"

REM First, perform the normal git operations
git add .
git commit -m "%~1"

REM Push all changes
git push origin master

echo Done!