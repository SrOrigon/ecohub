# Valida Headroom MCP + proxy + override BYOK do Cursor para este projeto.
# Usage: .\scripts\validate-headroom.ps1

$ErrorActionPreference = "Continue"
$Port = 8787
$ProxyUrl = "http://127.0.0.1:$Port"
$HeadroomExe = "C:\Users\DeadW\AppData\Local\Python\pythoncore-3.14-64\Scripts\headroom.exe"
$Root = Split-Path $PSScriptRoot -Parent
$ProjectSettings = Join-Path $Root ".cursor\settings.json"
$UserSettings = Join-Path $env:APPDATA "Cursor\User\settings.json"
$McpSettings = Join-Path $env:USERPROFILE ".cursor\mcp.json"

function Pass($msg) { Write-Host "[OK] $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "[!!] $msg" -ForegroundColor Yellow }
function Fail($msg) { Write-Host "[XX] $msg" -ForegroundColor Red }

Write-Host "`n=== Headroom validation ===`n"

$failures = 0
$warnings = 0

if (Test-Path $HeadroomExe) {
    Pass "headroom.exe encontrado ($(& $HeadroomExe --version 2>&1))"
} else {
    Fail "headroom.exe ausente em $HeadroomExe"
    $failures++
}

try {
    $health = Invoke-RestMethod -Uri "$ProxyUrl/health" -TimeoutSec 5
    if ($health.status -eq "healthy" -and $health.ready) {
        Pass "Proxy healthy (v$($health.version), uptime $([math]::Round($health.uptime_seconds / 3600, 1))h)"
    } else {
        Fail "Proxy degradado: status=$($health.status) ready=$($health.ready)"
        $failures++
    }
} catch {
    Fail "Proxy inacessivel em $ProxyUrl/health"
    $failures++
}

if (Test-Path $McpSettings) {
    $mcp = Get-Content $McpSettings -Raw | ConvertFrom-Json
    if ($mcp.mcpServers.headroom) {
        Pass "MCP headroom configurado em ~/.cursor/mcp.json"
    } else {
        Fail "MCP headroom ausente em ~/.cursor/mcp.json"
        $failures++
    }
} else {
    Fail "Arquivo ~/.cursor/mcp.json nao encontrado"
    $failures++
}

foreach ($label in @(@{ Path = $ProjectSettings; Name = "projeto" }, @{ Path = $UserSettings; Name = "global" })) {
    if (-not (Test-Path $label.Path)) {
        Warn "settings.json $($label.Name) ausente: $($label.Path)"
        $warnings++
        continue
    }
    $json = Get-Content $label.Path -Raw | ConvertFrom-Json
    $openai = [string]$json.'openai.baseUrl'
    $anthropic = [string]$json.'anthropic.baseUrl'
    if ($openai -like "*127.0.0.1:8787*") {
        Pass "openai.baseUrl ($($label.Name)) -> $openai"
    } else {
        Warn "openai.baseUrl ($($label.Name)) nao aponta para Headroom: '$openai'"
        $warnings++
    }
    if ($anthropic -like "*127.0.0.1:8787*") {
        Pass "anthropic.baseUrl ($($label.Name)) -> $anthropic"
    } else {
        Warn "anthropic.baseUrl ($($label.Name)) nao aponta para Headroom: '$anthropic'"
        $warnings++
    }
}

$userBudget = [Environment]::GetEnvironmentVariable("HEADROOM_BUDGET", "User")
$userPeriod = [Environment]::GetEnvironmentVariable("HEADROOM_BUDGET_PERIOD", "User")
if ($userBudget) {
    Pass "HEADROOM_BUDGET (User) = `$$userBudget / $userPeriod"
} else {
    Warn "HEADROOM_BUDGET (User) nao definido — rode .\scripts\start-headroom-proxy.ps1 -Restart"
    $warnings++
}

$task = Get-ScheduledTask -TaskName "HeadroomProxy8787" -ErrorAction SilentlyContinue
if ($task) {
    Pass "Autostart agendado: HeadroomProxy8787 ($($task.State))"
} else {
    Warn "Tarefa HeadroomProxy8787 nao encontrada — rode .\scripts\start-headroom-proxy.ps1 -RegisterAutostart"
    $warnings++
}

Write-Host "`n--- BYOK (maxima compressao no Agent) ---"
Write-Host "1. Cursor Settings -> Models -> adicione sua chave OpenAI ou Anthropic (BYOK)"
Write-Host "2. Use modelo BYOK (Claude/GPT), nao Composer 2.5 nativo da assinatura"
Write-Host "3. Confirme override ativo: Ctrl+Shift+0 ou painel Models"
Write-Host "4. Apos um prompt BYOK, headroom_stats deve mostrar API requests > 0"
Write-Host ""

if ($failures -eq 0 -and $warnings -eq 0) {
    Write-Host "Resultado: TOTALMENTE FUNCIONAL" -ForegroundColor Green
    exit 0
}
if ($failures -eq 0) {
    Write-Host "Resultado: FUNCIONAL com $warnings aviso(s)" -ForegroundColor Yellow
    exit 0
}
Write-Host "Resultado: $failures falha(s), $warnings aviso(s)" -ForegroundColor Red
exit 1
