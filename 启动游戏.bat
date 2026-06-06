@echo off
chcp 65001 >nul
title 深入地牢 - Into the Dungeon
echo.
echo   ╔══════════════════════════════╗
echo   ║     深入地牢 启动中...      ║
echo   ╚══════════════════════════════╝
echo.
cd /d "%~dp0"
start http://localhost:5173
npx vite --host 127.0.0.1 --open
pause
