@echo off
title SEO Toolkit - Install
color 0A
echo.
echo    ==========================================
echo         SEO Toolkit - Installation
echo    ==========================================
echo.
echo    Downloading...

:: Способ 1: curl (Windows 10/11)
curl -L -o "%TEMP%\seo-toolkit.zip" "https://github.com/IvanBurovv/seo-toolkit/releases/latest/download/seo-toolkit.zip" 2>nul

:: Если curl не сработал — пробуем PowerShell с TLS
if not exist "%TEMP%\seo-toolkit.zip" (
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; [Net.ServicePointManager]::Expect100Continue = $true; $ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -Uri 'https://github.com/IvanBurovv/seo-toolkit/releases/latest/download/seo-toolkit.zip' -OutFile '%TEMP%\seo-toolkit.zip'" 2>nul
)

:: Способ 3: certutil
if not exist "%TEMP%\seo-toolkit.zip" (
    certutil -urlcache -split -f "https://github.com/IvanBurovv/seo-toolkit/releases/latest/download/seo-toolkit.zip" "%TEMP%\seo-toolkit.zip" >nul 2>&1
)

:: Проверяем
if not exist "%TEMP%\seo-toolkit.zip" (
    echo    ERROR: Download failed.
    echo    Download manually: https://github.com/IvanBurovv/seo-toolkit/releases/latest
    pause
    exit /b
)

echo    OK
echo.
echo    Extracting to Desktop...

if exist "%USERPROFILE%\Desktop\SEO-Toolkit" rmdir /s /q "%USERPROFILE%\Desktop\SEO-Toolkit" 2>nul
powershell -Command "Expand-Archive -Path '%TEMP%\seo-toolkit.zip' -DestinationPath '%USERPROFILE%\Desktop\SEO-Toolkit' -Force" 2>nul

if not exist "%USERPROFILE%\Desktop\SEO-Toolkit\manifest.json" (
    echo    ERROR: Install failed
    pause
    exit /b
)

del "%TEMP%\seo-toolkit.zip" 2>nul

echo    Done
echo.
echo    Opening website...
start "" https://instrumenty-marketologa.ru

echo.
echo    ==========================================
echo         Folder "SEO-Toolkit" on Desktop
echo    ==========================================
echo.
echo    1. Open chrome://extensions/
echo    2. Enable "Developer mode"
echo    3. Click "Load unpacked" and select folder
echo.
pause