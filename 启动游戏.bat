@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo   九宫牌局 — 启动开发服务器
echo ========================================
echo.
start "" http://127.0.0.1:5173
call npm run dev
pause
