param([string]$CreatorRoot = 'D:\cocos\Creator\3.8.8')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'temp\tsconfig.cocos.json'))) {
    throw 'Open the project in Creator or run the web build first to generate engine declarations.'
}
$compiler = Join-Path $CreatorRoot 'resources\app.asar.unpacked\node_modules\typescript\bin\tsc'
if (-not (Test-Path -LiteralPath $compiler)) { throw "TypeScript compiler was not found at $compiler." }
& node $compiler --project (Join-Path $projectRoot 'tsconfig.json') --noEmit --skipLibCheck
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host 'Project TypeScript check passed.'
