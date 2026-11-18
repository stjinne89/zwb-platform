@echo off
rem Haalt het installatiescript van de ZWB stream-hulp van GitHub en draait het.
rem Het script zelf staat in de repo: stream-hulp/installeren.ps1.
title ZWB stream-hulp installeren
set "ZWB_PS1=%TEMP%\zwb-stream-hulp-installeren.ps1"
powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = 'Tls12'; $ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -UseBasicParsing 'https://raw.githubusercontent.com/stjinne89/zwb-platform/main/stream-hulp/installeren.ps1' -OutFile $env:ZWB_PS1"
if errorlevel 1 (
  echo.
  echo Downloaden lukte niet. Controleer je internet en probeer het opnieuw.
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%ZWB_PS1%"
echo.
pause
