@echo off
chcp 65001 >nul
title 卡牌地下城 - 本地开发工具

:menu
cls
echo.
echo   卡牌地下城 - 本地开发工具
echo   ==========================
echo.
echo   [1] 启动本地服务器 (端口 8080)
echo   [2] 运行单元测试
echo   [3] 运行胜率模拟
echo   [4] 退出
echo.
set /p choice="  请选择操作 (1-4): "

if "%choice%"=="1" goto server
if "%choice%"=="2" goto test
if "%choice%"=="3" goto simulate
if "%choice%"=="4" goto end

echo.
echo   无效选项，请重新选择
pause >nul
goto menu

:server
echo.
echo   正在启动服务器，请稍候...
echo   访问地址: http://localhost:8080
echo   按 Ctrl+C 停止服务器
echo.
start "" "http://localhost:8080"
node serve.js
goto end

:test
echo.
echo   正在运行单元测试...
node test_engine.js
echo.
pause
goto menu

:simulate
echo.
echo   正在运行胜率模拟...
node test_simulate.js
echo.
pause
goto menu

:end
