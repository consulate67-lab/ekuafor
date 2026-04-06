@echo off
setlocal enabledelayedexpansion
title Saloon Cebinde Master Deployer (v1.0.4)

echo ============================================================
echo SALOON CEBINDE - MASTER BUILD & DEPLOY (v1.0.4)
echo ============================================================
echo.

:: 1. Build
echo [1/4] Frontend Derleniyor (Build)...
cd client
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Build Hatali!
    pause
    exit /b %errorlevel%
)
cd ..

:: 2. Git
echo [2/4] Veriler Hazirlaniyor...
git add .
set msg=Saloon Sync Update
set /p user_msg="Notunuz (Opsiyonel): "
if not "!user_msg!"=="" set msg=!user_msg!

echo.
echo [3/4] GitHub Bulutuna Yukleniyor (Push)...
git commit -m "!msg! - v1.0.4"
git push origin main
if %errorlevel% neq 0 (
    echo [ERROR] Git Push Hatasi!
)

:: 3. FTP
echo.
echo [4/4] Web Sunucusuna Yukleniyor (89.19.30.85)...
node ftp_upload.js
if %errorlevel% neq 0 (
    echo [ERROR] FTP Yuklemede hata olustu! 
    pause
)

echo.
echo ============================================================
echo ✅ TÜM İŞLEMLER BAŞARIYLA TAMAMLANDI!
echo ============================================================
pause
