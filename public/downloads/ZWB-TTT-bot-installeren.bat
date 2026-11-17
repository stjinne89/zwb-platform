@echo off
rem Haalt het installatiescript van de TTT-bot van GitHub en draait het.
rem Het script zelf staat in de repo: bot/installeren.ps1.
title TTT-bot installeren
set "ZWB_PS1=%TEMP%\zwb-ttt-bot-installeren.ps1"
powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = 'Tls12'; $ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -UseBasicParsing 'https://raw.githubusercontent.com/stjinne89/zwb-platform/main/bot/installeren.ps1' -OutFile $env:ZWB_PS1"
if errorlevel 1 (
  echo.
  echo Downloaden lukte niet. Controleer je internet en probeer het opnieuw.
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%ZWB_PS1%"
echo.
pause
