@echo off
REM ==========================================================================
REM  TOTEM DE CANAA DOS CARAJAS - dois cliques aqui para ligar o totem.
REM  Abre em tela cheia (modo quiosque), sem barras e sem cursor.
REM  Se o navegador fechar ou travar, ele abre de novo sozinho (a cada 30 s).
REM  Para sair: Alt + F4 e depois feche esta janela preta.
REM  Para abrir sozinho quando o computador ligar: instalar-inicio-automatico.bat
REM ==========================================================================
cd /d "%~dp0"
title Totem - nao feche esta janela
where node >nul 2>nul
if errorlevel 1 (
  echo O Node.js nao esta instalado. Veja o LEIA-ME.md, passo 1.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Primeira vez: instalando o que o totem precisa. Pode levar alguns minutos...
  call npm install
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\totem.ps1"
