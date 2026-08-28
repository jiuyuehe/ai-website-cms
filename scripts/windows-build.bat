@echo off
setlocal
call npm ci
if errorlevel 1 exit /b %errorlevel%
call npm run validate
if errorlevel 1 exit /b %errorlevel%
call npm run test
if errorlevel 1 exit /b %errorlevel%
call npm run build
if errorlevel 1 exit /b %errorlevel%
call npm run report
