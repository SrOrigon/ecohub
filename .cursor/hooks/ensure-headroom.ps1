# sessionStart hook: keep Headroom proxy healthy and inject a short reminder.
# Reads hook JSON on stdin (unused) and prints JSON on stdout.

[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$ErrorActionPreference = "Continue"
$null = [Console]::In.ReadToEnd()

$proxyUrl = "http://127.0.0.1:8787"
$healthy = $false
try {
    $health = Invoke-RestMethod -Uri "$proxyUrl/health" -TimeoutSec 3
    $healthy = ($health.status -eq "healthy" -and $health.ready -eq $true)
} catch {
    $healthy = $false
}

if (-not $healthy) {
    $root = $env:CURSOR_PROJECT_DIR
    if (-not $root) {
        $root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
    }
    $starter = Join-Path $root "scripts\start-headroom-proxy.ps1"
    if (Test-Path $starter) {
        Start-Process -FilePath "powershell.exe" -ArgumentList @(
            "-NoProfile", "-WindowStyle", "Hidden", "-ExecutionPolicy", "Bypass",
            "-File", $starter
        ) -WindowStyle Hidden | Out-Null
    } else {
        $exe = "C:\Users\DeadW\AppData\Local\Python\pythoncore-3.14-64\Scripts\headroom.exe"
        if (Test-Path $exe) {
            Start-Process -FilePath $exe -ArgumentList @("proxy", "--port", "8787", "--host", "127.0.0.1") -WindowStyle Hidden | Out-Null
        }
    }
}

$payload = [ordered]@{
    env = [ordered]@{
        OPENAI_BASE_URL        = "$proxyUrl/v1"
        ANTHROPIC_BASE_URL     = $proxyUrl
        HEADROOM_PROXY         = $proxyUrl
        HEADROOM_BUDGET        = "10"
        HEADROOM_BUDGET_PERIOD = "daily"
    }
    additional_context = "Headroom BYOK ativo: use modelo com chave propria (OpenAI/Anthropic) para trafego LLM passar pelo proxy $proxyUrl. MCP user-headroom sempre disponivel. Composer nativo Cursor (assinatura) NAO usa proxy — so MCP. Budget: USD 10/dia. Valide com .\scripts\validate-headroom.ps1"
}

$payload | ConvertTo-Json -Compress -Depth 5
exit 0
