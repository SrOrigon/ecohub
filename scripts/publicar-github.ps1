# Script para publicar o Ecohub no GitHub
# Pré-requisitos: Git instalado (https://git-scm.com/download/win)
#                 GitHub CLI opcional (winget install GitHub.cli)

param(
    [Parameter(Mandatory = $true)]
    [string]$GitHubUsername,

    [string]$RepoName = "ecohub",
    [switch]$Private
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

# Verificar Git
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "Git nao encontrado. Instale em: https://git-scm.com/download/win" -ForegroundColor Red
    exit 1
}

# Inicializar repo se necessario
if (-not (Test-Path ".git")) {
    git init
    git branch -M main
}

git add .
git status

$hasChanges = git diff --cached --quiet 2>$null; $staged = $LASTEXITCODE -ne 0
if ($staged -or (git status --porcelain)) {
    git commit -m "Ecohub: plataforma educacional completa com gamificacao e notificacoes"
}

# Criar repo no GitHub (via gh CLI se disponivel)
$remoteUrl = "https://github.com/$GitHubUsername/$RepoName.git"

if (Get-Command gh -ErrorAction SilentlyContinue) {
    gh auth status 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Faca login no GitHub (abrira o navegador)..." -ForegroundColor Yellow
        gh auth login
    }
    $visibility = if ($Private) { "--private" } else { "--public" }
    gh repo create $RepoName $visibility --source=. --remote=origin --push
    Write-Host "Repositorio criado e enviado: https://github.com/$GitHubUsername/$RepoName" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "GitHub CLI (gh) nao instalado. Siga manualmente:" -ForegroundColor Yellow
    Write-Host "1. Acesse https://github.com/new"
    Write-Host "2. Nome do repositorio: $RepoName"
    Write-Host "3. NAO marque README, .gitignore ou license"
    Write-Host "4. Depois execute:"
    Write-Host "   git remote add origin $remoteUrl"
    Write-Host "   git push -u origin main"
}
