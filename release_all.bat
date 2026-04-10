@echo off
setlocal enabledelayedexpansion

echo ===========================================
echo   SALOON CEBINDE - KOMPLE YAYIN ARACI
echo   (GitHub + Site + APK Derleme)
echo ===========================================
echo.

cd /d "%~dp0"

:: 1. Kullanicidan mesaj alma
set /p commit_msg="Guncelleme notu girin: "
if "!commit_msg!"=="" set commit_msg="Fix: Genel guncellemeler ve veritabani gecisi"

echo.
echo [1/3] Degisiklikler hazirlaniyor (git add)...
git add -A

echo.
echo [2/3] Kaydediliyor (git commit)...
git commit -m "!commit_msg!"

echo.
echo [3/3] GitHub'a gonderiliyor (git push)...
git push origin HEAD

echo.
echo ===========================================
echo   🚀 ISLEM TAMAMLANDI!
echo.
echo   Takip edebileceginiz baglantilar:
echo.
echo   1. APK Derleme (GitHub Actions):
echo      https://github.com/consulate67-lab/ekuafor/actions
echo.
echo   2. Web Sitesi (Canli):
echo      https://saloncebinde-web.render.com (veya Railway linkiniz)
echo.
echo   3. Sunucu Durumu:
echo      (Railway Dashboard veya Render Dashboard)
echo.
echo ===========================================
pause
