@echo off
chcp 65001 >nul
title 深入地牢 — 九宫格肉鸽卡牌

cd /d "%~dp0"

echo.
echo   ╔══════════════════════════════════╗
echo   ║     🏰  深 入 地 牢  🏰       ║
echo   ║   九宫格肉鸽卡牌冒险            ║
echo   ╚══════════════════════════════════╝
echo.
echo   [*] 正在启动 Vite 开发服务器...
echo   [*] 游戏地址: http://127.0.0.1:5173
echo.

start "" http://127.0.0.1:5173

call npm run dev

pause
