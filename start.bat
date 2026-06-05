@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title 深入地牢 - 一键启动

echo ========================================
echo         深入地牢 - 开发服务器
echo ========================================
echo.
echo [1/2] 正在启动开发服务器...

:: 检测并释放 5173 端口
netstat -ano | findstr ":5173" >nul
if %errorlevel% == 0 (
    echo   检测到端口 5173 被占用，正在释放...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173"') do (
        taskkill /f /pid %%a 2>nul
    )
    timeout /t 1 >nul
)

:: 清理已有的 node 进程（避免重复启动）
taskkill /f /im node.exe 2>nul

:: 在后台启动 Vite 开发服务器，日志写入 server.log
if exist server.log del /q server.log
start /b npm run dev > server.log 2>&1

:: 等待服务器就绪
timeout /t 2 >nul

echo.
echo 服务器已启动！
echo 请访问: http://127.0.0.1:5173/
echo.
echo [2/2] 按任意键关闭服务器并清理...
pause >nul

echo.
echo 正在停止服务器...
taskkill /f /im node.exe 2>nul
echo 已清理完成。
timeout /t 1 >nul
endlocal
