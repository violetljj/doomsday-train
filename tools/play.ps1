$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$indexPath = Join-Path $projectRoot 'build\web-mobile\index.html'
if (-not (Test-Path -LiteralPath $indexPath)) {
    Write-Host 'Building the game for the first launch...'
    & (Join-Path $PSScriptRoot 'build-web.ps1')
}
Write-Host 'Starting Doomsday Train. Keep this window open while playing.'
Write-Host 'Press Ctrl+C here to stop the preview server.'
Push-Location $projectRoot
try { & node (Join-Path $PSScriptRoot 'serve.mjs') --open }
finally { Pop-Location }
