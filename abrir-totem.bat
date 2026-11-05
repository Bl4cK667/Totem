@echo off
REM ==========================================================
REM  Abre o totem em modo quiosque (tela cheia, sem barras).
REM  Para sair do modo quiosque: Alt + F4
REM  Para abrir junto com o Windows: coloque um atalho deste
REM  arquivo na pasta  shell:startup  (Win + R).
REM ==========================================================
cd /d "%~dp0"

REM Inicia o servidor local (pasta dist/ precisa existir: npm run build)
start "Servidor do totem" /min cmd /c "npx vite preview --port 4173 --strictPort"

REM Espera o servidor subir
timeout /t 4 /nobreak >nul

set CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist %CHROME% set CHROME="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"

start "" %CHROME% --kiosk --app=http://localhost:4173/?totem ^
  --user-data-dir="%~dp0.perfil-totem" ^
  --noerrdialogs --disable-infobars --disable-session-crashed-bubble ^
  --disable-pinch --overscroll-history-navigation=0 ^
  --disable-features=TranslateUI --no-first-run --autoplay-policy=no-user-gesture-required
