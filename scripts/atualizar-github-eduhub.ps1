# Publica alterações no GitHub e valida o Eduhub na Railway (deploy automático no push da branch main).
# Uso: .\scripts\atualizar-github-eduhub.ps1
#      .\scripts\atualizar-github-eduhub.ps1 -Mensagem "feat: minha alteração"

param(
    [string]$Mensagem = "",
    [string]$Producao = "https://eduhub-production-b513.up.railway.app"
)

$ErrorActionPreference = "Stop"
$gitCmd = "C:\Program Files\Git\cmd\git.exe"
if (-not (Test-Path $gitCmd)) {
    Write-Host "Git não encontrado. Instale: https://git-scm.com/download/win" -ForegroundColor Red
    exit 1
}
$env:Path = "C:\Program Files\Git\cmd;" + $env:Path

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$porcelain = & $gitCmd status --porcelain
if ($porcelain) {
    if (-not $Mensagem) {
        $Mensagem = Read-Host "Descreva o commit (ex.: feat: nova tela)"
    }
    if (-not $Mensagem) {
        Write-Host "Commit cancelado: informe -Mensagem ou alterações pendentes." -ForegroundColor Yellow
        exit 1
    }
    & $gitCmd add -A
    & $gitCmd commit -m $Mensagem
}

Write-Host "Enviando main para origin..." -ForegroundColor Cyan
& $gitCmd push origin main

Write-Host "Aguardando deploy (health/live)..." -ForegroundColor Cyan
$deadline = (Get-Date).AddMinutes(8)
$ready = $false
while ((Get-Date) -lt $deadline) {
    try {
        $live = Invoke-RestMethod -Uri "$Producao/api/health/live" -TimeoutSec 20
        if ($live.status -eq "ok" -and $live.uptime -lt 120) {
            $ready = $true
            break
        }
    } catch {
        # build ainda subindo
    }
    Start-Sleep -Seconds 15
}

if (-not $ready) {
    Write-Host "Deploy pode ainda estar em andamento. Confira o painel Railway." -ForegroundColor Yellow
}

& $PSScriptRoot\smoke-test-remoto.ps1 -BaseUrl $Producao
