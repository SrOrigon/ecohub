# Remove artefatos locais regeneráveis (não apaga código-fonte, .env nem banco de produção).
# Uso: .\scripts\limpar-espaco-hd.ps1
#      .\scripts\limpar-espaco-hd.ps1 -IncluirNodeModules

param(
    [switch]$IncluirNodeModules
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Remove-IfExists([string]$rel) {
    $full = Join-Path $root $rel
    if (-not (Test-Path $full)) { return 0.0 }
    $bytes = if (Test-Path $full -PathType Container) {
        (Get-ChildItem $full -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    } else {
        (Get-Item $full).Length
    }
    Remove-Item $full -Recurse -Force -ErrorAction SilentlyContinue
    if ($null -eq $bytes) { $bytes = 0 }
    return [math]::Round($bytes / 1MB, 2)
}

$total = 0.0
$total += Remove-IfExists ".next"
$total += Remove-IfExists "out"
$total += Remove-IfExists "build"
$total += Remove-IfExists "coverage"
$total += Remove-IfExists ".vercel"

Get-ChildItem $root -Filter "*.tsbuildinfo" -File -ErrorAction SilentlyContinue | ForEach-Object {
    $mb = [math]::Round($_.Length / 1MB, 2)
    Remove-Item $_.FullName -Force
    $total += $mb
}

Get-ChildItem $root -Filter "debug-*.log" -File -ErrorAction SilentlyContinue | ForEach-Object {
    $mb = [math]::Round($_.Length / 1MB, 2)
    Remove-Item $_.FullName -Force
    $total += $mb
}

if ($IncluirNodeModules) {
    $total += Remove-IfExists "node_modules"
}

Write-Host ("Espaço liberado (aprox.): {0:N2} MB" -f $total) -ForegroundColor Green
Write-Host "Para desenvolver de novo: npm install  (e depois npm run dev ou npm run build)" -ForegroundColor Cyan
