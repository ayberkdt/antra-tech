@echo off
rem Antra Tech sitesini yerel sunucuyla acar (animasyonlar file:// ile calismaz). Kapatmak icin pencerede Ctrl+C.
setlocal
cd /d "%~dp0"

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0sunucu.ps1" -Port 8790 -OpenPath "/"

if errorlevel 1 (
  echo.
  echo Sunucu beklenmedik sekilde durdu.
  pause
)
