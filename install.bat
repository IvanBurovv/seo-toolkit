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

echo    Installing...

if exist "%USERPROFILE%\seo-toolkit" rmdir /s /q "%USERPROFILE%\seo-toolkit" 2>nul

powershell -Command "Expand-Archive -Path '%TEMP%\seo-toolkit.zip' -DestinationPath '%USERPROFILE%\seo-toolkit' -Force"

if not exist "%USERPROFILE%\seo-toolkit\manifest.json" (
    echo    ERROR: Install failed
    pause
    exit /b
)

echo    Registering...

reg add "HKCU\Software\Google\Chrome\Extensions\cnpbdfmknbdnidnniigkechacbokepha" /v "update_url" /t REG_SZ /d "https://raw.githubusercontent.com/IvanBurovv/seo-toolkit/main/updates.xml" /f >nul 2>&1

del "%TEMP%\seo-toolkit.zip" 2>nul

echo.
echo    ==========================================
echo         DONE! Restart Chrome.
echo    ==========================================
echo.
pause