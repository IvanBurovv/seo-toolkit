@echo off
title SEO Toolkit — Установка расширения
color 0A
echo.
echo    ╔══════════════════════════════════════════╗
echo    ║     🔧 SEO Toolkit — Установка          ║
echo    ║     Профессиональный SEO-инструмент      ║
echo    ╚══════════════════════════════════════════╝
echo.
echo    [1/3] Скачивание последней версии...

:: Скачиваем расширение
powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/IvanBurovv/seo-toolkit/releases/latest/download/seo-toolkit.zip' -OutFile '%TEMP%\seo-toolkit.zip'}" 2>nul

if not exist "%TEMP%\seo-toolkit.zip" (
    echo    ❌ Ошибка скачивания. Проверьте интернет.
    pause
    exit /b
)

echo    [2/3] Распаковка в %USERPROFILE%\seo-toolkit...

:: Удаляем старую версию если есть
if exist "%USERPROFILE%\seo-toolkit" (
    rmdir /s /q "%USERPROFILE%\seo-toolkit" 2>nul
)

:: Распаковываем
powershell -Command "Expand-Archive -Path '%TEMP%\seo-toolkit.zip' -DestinationPath '%USERPROFILE%\seo-toolkit' -Force" 2>nul

if not exist "%USERPROFILE%\seo-toolkit\manifest.json" (
    echo    ❌ Ошибка распаковки.
    pause
    exit /b
)

echo    [3/3] Регистрация расширения в Chrome...

:: Добавляем в реестр для автоустановки
reg add "HKCU\Software\Google\Chrome\Extensions\cnpbdfmknbdnidnniigkechacbokepha" /v "update_url" /t REG_SZ /d "https://raw.githubusercontent.com/IvanBurovv/seo-toolkit/main/updates.xml" /f >nul 2>&1
reg add "HKCU\Software\Google\Chrome\Extensions\cnpbdfmknbdnidnniigkechacbokepha" /v "version" /t REG_SZ /d "2.4.0" /f >nul 2>&1

:: Удаляем временный файл
del "%TEMP%\seo-toolkit.zip" 2>nul

echo.
echo    ╔══════════════════════════════════════════╗
echo    ║     ✅ Установка завершена!              ║
echo    ╚══════════════════════════════════════════╝
echo.
echo    📌 Перезапустите Chrome (закройте и откройте)
echo    📌 Расширение появится в правом верхнем углу
echo    📌 При запросе нажмите "Включить расширение"
echo.
echo    🔄 Обновления будут приходить автоматически!
echo.
pause