@echo off
chcp 65001 >nul
echo ========================================================
echo   EKSEKUSI LAPORAN SEPTEMBER 2026 - DASHBOARD ^& WEB DB
echo ========================================================
echo.

node execute_september_pipeline.js "laporan_september fixx.xls"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Eksekusi pipeline gagal.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ========================================================
echo   SELESAI!
echo ========================================================
pause
