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

echo    Extracting to Desktop\SEO-Toolkit...

:: Распаковываем на рабочий стол
if exist "%USERPROFILE%\Desktop\SEO-Toolkit" rmdir /s /q "%USERPROFILE%\Desktop\SEO-Toolkit" 2>nul
powershell -Command "Expand-Archive -Path '%TEMP%\seo-toolkit.zip' -DestinationPath '%USERPROFILE%\Desktop\SEO-Toolkit' -Force"

if not exist "%USERPROFILE%\Desktop\SEO-Toolkit\manifest.json" (
    echo    ERROR: Install failed
    pause
    exit /b
)

:: Открываем папку с расширением
explorer "%USERPROFILE%\Desktop\SEO-Toolkit"

:: Открываем страницу расширений Chrome
start "" cmd /c "start chrome chrome://extensions/"

del "%TEMP%\seo-toolkit.zip" 2>nul

echo.
echo    ==========================================
echo         ALMOST DONE!
echo    ==========================================
echo.
echo    1. Enable "Developer mode" (top right)
echo    2. Drag the folder "SEO-Toolkit"
echo       from Desktop into Chrome window
echo    3. Or click "Load unpacked" and
echo       select the SEO-Toolkit folder
echo.
echo    The folder is on your Desktop.
echo.
pause