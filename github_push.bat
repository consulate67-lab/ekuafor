@echo off
echo ===========================================
echo   SALOON CEBINDE - GITHUB GONDERIM ARACI
echo ===========================================
echo.
cd /d "d:\Saloon"

echo [1/3] Degisiklikler hazirlaniyor (git add)...
git add -A

echo [2/3] Kaydediliyor (git commit)...
git commit -m "feat: Terminal Mode - Çevrimdışı Randevu/Masraf Senkronizasyonu ve Android Java Düzeltmeleri"

echo [3/3] GitHub'a gonderiliyor (git push)...
git push origin HEAD

echo.
echo ===========================================
echo   ISLEM TAMAMLANDI!
echo   GitHub Actions sayfasini kontrol et:
echo   https://github.com/consulate67-lab/ekuafor/actions
echo ===========================================
pause
