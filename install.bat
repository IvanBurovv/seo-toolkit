@echo off
title SEO Toolkit - Install
color 0A
echo.
echo    ==========================================
echo         SEO Toolkit - Installation
echo    ==========================================
echo.
echo    Downloading...

powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -Uri 'https://github.com/IvanBurovv/seo-toolkit/releases/latest/download/seo-toolkit.zip' -OutFile '%TEMP%\seo-toolkit.zip'"

if not exist "%TEMP%\seo-toolkit.zip" (
    echo    ERROR: Download failed
    pause
    exit /b
)

echo    Extracting to Desktop...

if exist "%USERPROFILE%\Desktop\SEO-Toolkit" rmdir /s /q "%USERPROFILE%\Desktop\SEO-Toolkit" 2>nul
powershell -Command "Expand-Archive -Path '%TEMP%\seo-toolkit.zip' -DestinationPath '%USERPROFILE%\Desktop\SEO-Toolkit' -Force"

if not exist "%USERPROFILE%\Desktop\SEO-Toolkit\manifest.json" (
    echo    ERROR: Install failed
    pause
    exit /b
)

del "%TEMP%\seo-toolkit.zip" 2>nul

echo    Opening website with instructions...
start "" https://instrumenty-marketologa.ru

echo.
echo    ==========================================
echo         DONE!
echo    ==========================================
echo.
echo    Folder "SEO-Toolkit" is on your Desktop.
echo    Website opened with install guide.
echo.
pause