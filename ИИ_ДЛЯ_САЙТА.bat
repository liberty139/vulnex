@echo off
chcp 65001 >nul
title VULNEX - ИИ для сайта
echo Перезапускаю Ollama с разрешением для https://vulnex-00v9.onrender.com ...
taskkill /IM "ollama app.exe" /F >nul 2>&1
taskkill /IM ollama.exe /F >nul 2>&1
timeout /t 2 /nobreak >nul
set OLLAMA_ORIGINS=https://vulnex-00v9.onrender.com
echo.
echo  Готово. Откройте https://vulnex-00v9.onrender.com
echo  Если браузер спросит доступ к устройствам в локальной сети - разрешите.
echo  Не закрывайте это окно, пока пользуетесь ИИ на сайте.
echo.
ollama serve
