@echo off
chcp 65001 >nul
cd /d "%~dp0"
title FortEra
if not exist node_modules (
  echo Первый запуск: устанавливаю зависимости, нужен интернет...
  call npm install --no-audit --no-fund
)
curl -s -o nul http://127.0.0.1:11434/api/tags
if errorlevel 1 (
  echo Запускаю Ollama для локальных ИИ-моделей...
  start "Ollama" /min ollama serve
)
echo.
echo  FortEra запускается. Браузер откроется сам: http://localhost:5190
echo  Чтобы остановить сайт, закройте это окно.
echo.
call npx vite --port 5190 --open /
