@echo off
chcp 65001 >nul
title FortEra - ИИ для сайта
echo Перезапускаю Ollama с разрешением для https://fortera-16k9.onrender.com ...
taskkill /IM "ollama app.exe" /F >nul 2>&1
taskkill /IM ollama.exe /F >nul 2>&1
timeout /t 2 /nobreak >nul
set OLLAMA_ORIGINS=https://fortera-16k9.onrender.com
echo.
echo  Готово. Откройте https://fortera-16k9.onrender.com
echo  Если браузер спросит доступ к устройствам в локальной сети - разрешите.
echo  Не закрывайте это окно, пока пользуетесь ИИ на сайте.
echo.
ollama serve
