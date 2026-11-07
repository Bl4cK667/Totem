# ============================================================================
#  Totem de Canaã dos Carajás: liga o servidor local, abre o navegador em
#  modo quiosque e fica de olho. A cada 30 segundos confere:
#   - o servidor está respondendo?  Se não, liga de novo.
#   - o navegador está aberto?      Se não (fechou ou travou), abre de novo.
#   - a página está viva?           Se ela parou de avisar há mais de 2 minutos
#                                   (travou), fecha e abre o navegador de novo.
#  Quem chama este arquivo é o iniciar-totem.bat. O que acontece fica em logs\monitor.txt
# ============================================================================
param(
  [switch]$Teste,          # só para testar: navegador sem tela (headless), outra porta
  [int]$Porta = 4173,
  [int]$Intervalo = 30
)
$ErrorActionPreference = 'Continue'
$raiz = Split-Path -Parent $PSScriptRoot
Set-Location $raiz
$logs = Join-Path $raiz 'logs'
New-Item -ItemType Directory -Force $logs | Out-Null
$perfil = Join-Path $raiz '.perfil-totem'
if ($Teste) { $perfil = Join-Path $raiz '.perfil-totem-teste' }
$url = "http://localhost:$Porta/?totem"

function Registrar($texto) {
  $linha = "[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $texto
  Add-Content -Path (Join-Path $logs 'monitor.txt') -Value $linha -Encoding UTF8
  Write-Host $linha
}

function Achar-Navegador {
  $opcoes = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
  )
  foreach ($c in $opcoes) { if ($c -and (Test-Path $c)) { return $c } }
  return $null
}

function Estado-Servidor {
  try { return (Invoke-WebRequest -UseBasicParsing "http://localhost:$Porta/api/estado" -TimeoutSec 5).Content | ConvertFrom-Json }
  catch { return $null }
}

function Ligar-Servidor {
  if (-not (Test-Path (Join-Path $raiz 'dist\index.html'))) {
    Registrar 'Primeira vez: preparando os arquivos (npm run build)...'
    & cmd /c "npm run build" | Out-Null
  }
  Registrar "Ligando o servidor na porta $Porta"
  Start-Process -FilePath 'node' -ArgumentList @('scripts/servidor.js', "$Porta") -WorkingDirectory $raiz -WindowStyle Hidden | Out-Null
  for ($i = 0; $i -lt 20; $i++) { Start-Sleep -Milliseconds 500; if (Estado-Servidor) { return } }
  Registrar 'O servidor não respondeu. Tento de novo na próxima volta.'
}

function Processos-Navegador {
  Get-CimInstance Win32_Process -Filter "Name='chrome.exe' OR Name='msedge.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -and $_.CommandLine.Contains($perfil) }
}

function Abrir-Navegador {
  $nav = Achar-Navegador
  if (-not $nav) { Registrar 'Nenhum Chrome ou Edge encontrado. Instale o Google Chrome.'; return }
  $argumentos = @(
    "--user-data-dir=`"$perfil`"", '--no-first-run', '--noerrdialogs', '--disable-infobars',
    '--disable-session-crashed-bubble', '--disable-pinch', '--overscroll-history-navigation=0',
    '--disable-features=TranslateUI', '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling'
  )
  if ($Teste) { $argumentos += @('--headless=new', '--enable-unsafe-swiftshader', $url) }
  else { $argumentos += @('--kiosk', "--app=$url") }
  Registrar "Abrindo o navegador: $(Split-Path -Leaf $nav)"
  Start-Process -FilePath $nav -ArgumentList $argumentos | Out-Null
  $script:abriuEm = Get-Date
}

function Fechar-Navegador {
  Processos-Navegador | ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop } catch {} }
  Start-Sleep -Seconds 2
}

Registrar '--- Totem iniciando ---'
$script:abriuEm = Get-Date
if (-not (Estado-Servidor)) { Ligar-Servidor }
if (-not (Processos-Navegador)) { Abrir-Navegador }

while ($true) {
  Start-Sleep -Seconds $Intervalo
  $estado = Estado-Servidor
  if (-not $estado) { Registrar 'Servidor parado.'; Ligar-Servidor; continue }
  if (-not (Processos-Navegador)) { Registrar 'Navegador fechado.'; Abrir-Navegador; continue }
  # Página travada: sem "batimento" há mais de 2 minutos (e o navegador já teve tempo de abrir)
  $aberto = ((Get-Date) - $script:abriuEm).TotalSeconds
  $semBater = $estado.segundosDesdeBatimento
  if ($aberto -gt 120 -and ($semBater -eq $null -or $semBater -gt 120)) {
    Registrar "A página não responde há $semBater s. Reabrindo o navegador."
    Fechar-Navegador
    Abrir-Navegador
  }
}
