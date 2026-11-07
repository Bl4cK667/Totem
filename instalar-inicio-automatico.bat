@echo off
REM Faz o totem abrir sozinho sempre que o computador ligar (atalho na pasta Inicializar).
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$s=(New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Startup')+'\Totem Canaa.lnk'); $s.TargetPath='%~dp0iniciar-totem.bat'; $s.WorkingDirectory='%~dp0'; $s.WindowStyle=7; $s.Save()"
if errorlevel 1 (
  echo Nao consegui criar o atalho. Veja o LEIA-ME.md.
) else (
  echo Pronto! O totem vai abrir sozinho quando o computador ligar.
)
pause
