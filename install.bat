@echo off
title SEO Toolkit - Install
color 0A
echo.
echo    ==========================================
echo         SEO Toolkit - Installation
echo         Professional SEO Tool for Chrome
echo    ==========================================
echo.
echo    [1/3] Downloading latest version...

powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/IvanBurovv/seo-toolkit/releases/latest/download/seo-toolkit.zip' -OutFile '%TEMP%\seo-toolkit.zip'}" 2>nul

if not exist "%TEMP%\seo-toolkit.zip" (
    echo    ERROR: Download failed. Check internet connection.
    pause
    exit /b
)

echo    [2/3] Extracting to %USERPROFILE%\seo-toolkit...

if exist "%USERPROFILE%\seo-toolkit" rmdir /s /q "%USERPROFILE%\seo-toolkit" 2>nul
powershell -Command "Expand-Archive -Path '%TEMP%\seo-toolkit.zip' -DestinationPath '%USERPROFILE%\seo-toolkit' -Force" 2>nul

if not exist "%USERPROFILE%\seo-toolkit\manifest.json" (
    echo    ERROR: Extraction failed.
    pause
    exit /b
)

echo    [3/3] Registering extension in Chrome...

reg add "HKCU\Software\Google\Chrome\Extensions\cnpbdfmknbdnidnniigkechacbokepha" /v "update_url" /t REG_SZ /d "https://raw.githubusercontent.com/IvanBurovv/seo-toolkit/main/updates.xml" /f >nul 2>&1
reg add "HKCU\Software\Google\Chrome\Extensions\cnpbdfmknbdnidnniigkechacbokepha" /v "version" /t REG_SZ /d "2.5.0" /f >nul 2>&1

del "%TEMP%\seo-toolkit.zip" 2>nul

echo.
echo    ==========================================
echo         INSTALLATION COMPLETE!
echo    ==========================================
echo.
echo    Restart Chrome (close and reopen)
echo    Extension will appear in top-right corner
echo    Click "Enable extension" when prompted
echo.
echo    Updates will install automatically!
echo.
pause