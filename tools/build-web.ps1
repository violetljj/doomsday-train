param([string]$Creator = 'D:\cocos\Creator\3.8.8\CocosCreator.exe')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path -LiteralPath $Creator)) {
    throw "Cocos Creator 3.8.8 was not found at $Creator. Pass -Creator with its executable path."
}
$logDirectory = Join-Path $projectRoot 'logs'
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
$config = Join-Path $PSScriptRoot 'build-web-mobile.json'
$process = Start-Process -FilePath $Creator -ArgumentList @('--project', ('"' + $projectRoot + '"'), '--build', ('"configPath=' + $config + '"')) -WindowStyle Hidden -PassThru -Wait -RedirectStandardOutput (Join-Path $logDirectory 'build-web.log') -RedirectStandardError (Join-Path $logDirectory 'build-web-error.log')
# Creator documents exit code 36 as build success, unlike conventional CLI tools.
if ($process.ExitCode -notin @(0, 36)) {
    Get-Content -LiteralPath (Join-Path $logDirectory 'build-web.log') -Tail 60
    Get-Content -LiteralPath (Join-Path $logDirectory 'build-web-error.log') -Tail 30
    throw "Cocos build failed with exit code $($process.ExitCode). Full logs are in $logDirectory."
}
$index = Join-Path $projectRoot 'build\web-mobile\index.html'
if (-not (Test-Path -LiteralPath $index)) { throw "Creator exited but did not produce $index." }
Write-Host "Web build ready: $index"
