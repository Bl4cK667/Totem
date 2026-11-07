@echo off
REM Desfaz o instalar-inicio-automatico.bat: o totem deixa de abrir sozinho.
powershell -NoProfile -Command "Remove-Item -ErrorAction SilentlyContinue ([Environment]::GetFolderPath('Startup')+'\Totem Canaa.lnk')"
echo Pronto. O totem nao abre mais sozinho quando o computador liga.
pause
