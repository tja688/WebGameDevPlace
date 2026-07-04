@echo off
setlocal EnableExtensions
cd /d "%~dp0"
chcp 65001 >nul
title Card Dungeon - Local Dev Tool

if not "%~1"=="" (
    set "choice=%~1"
    goto dispatch
)

:menu
cls
echo.
echo   Card Dungeon - Local Dev Tool
echo   =============================
echo.
echo   [1] Start local server (port 9137)
echo   [2] Run tests
echo   [3] Run win-rate simulation
echo   [4] Exit
echo.
set /p choice="  Select an option (1-4): "
if not defined choice goto end

:dispatch
if "%choice%"=="1" goto server
if "%choice%"=="2" goto test
if "%choice%"=="3" goto simulate
if "%choice%"=="4" goto end

echo.
echo   Invalid option, please try again.
pause >nul
goto menu

:check_node
where node >nul 2>nul
if errorlevel 1 (
    echo.
    echo   Node.js was not found. Please install Node.js 16+ first.
    echo   https://nodejs.org/
    echo.
    pause
    goto menu
)
exit /b 0

:server
call :check_node
powershell -NoProfile -ExecutionPolicy Bypass -Command "exit -not (Test-NetConnection -ComputerName localhost -Port 9137 -InformationLevel Quiet)" >nul 2>nul
if not errorlevel 1 (
    echo.
    echo   Port 9137 is already in use. Opening the existing local server...
    start "" "http://localhost:9137"
    echo.
    pause
    goto menu
)

echo.
echo   Starting server...
echo   URL: http://localhost:9137
echo   Press Ctrl+C to stop the server.
echo.
start "" "http://localhost:9137"
node serve.js
echo.
pause
goto menu

:test
call :check_node
echo.
echo   Running tests...
npm test
echo.
pause
goto menu

:simulate
call :check_node
echo.
echo   Running win-rate simulation...
npm run simulate
echo.
pause
goto menu

:end
endlocal
