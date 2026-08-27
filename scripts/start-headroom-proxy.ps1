# Starts the local Headroom proxy (port 8787) in the background if not already healthy.
# Usage:
#   .\scripts\start-headroom-proxy.ps1
#   .\scripts\start-headroom-proxy.ps1 -RegisterAutostart
# Keep the process running while using Cursor (MCP + proxy).

param(
    [switch]$RegisterAutostart,
    [switch]$Foreground
)

$ErrorActionPreference = "Stop"
$Port = 8787
$HeadroomExe = "C:\Users\DeadW\AppData\Local\Python\pythoncore-3.14-64\Scripts\headroom.exe"
$LogDir = Join-Path $env:USERPROFILE ".headroom"
$LogFile = Join-Path $LogDir "proxy.out.log"
$ErrFile = Join-Path $LogDir "proxy.err.log"
$TaskName = "HeadroomProxy8787"

if (-not (Test-Path $HeadroomExe)) {
    Write-Error "headroom.exe not found at $HeadroomExe. Install with: pip install `"headroom-ai[all]`""
}

function Test-HeadroomHealthy {
    try {
        $health = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/health" -TimeoutSec 3
        return ($health.status -eq "healthy" -and $health.ready -eq $true)
    } catch {
        return $false
    }
}

function Get-HeadroomHealth {
    Invoke-RestMethod -Uri "http://127.0.0.1:$Port/health" -TimeoutSec 3
}

if ($RegisterAutostart) {
    $scriptPath = $PSCommandPath
    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$scriptPath`""
    $trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -StartWhenAvailable
    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -RunLevel Limited -Force | Out-Null
    Write-Host "Autostart registered: scheduled task '$TaskName' at logon."
}

if (Test-HeadroomHealthy) {
    $health = Get-HeadroomHealth
    Write-Host "Headroom proxy already running at http://127.0.0.1:$Port (v$($health.version), uptime $($health.uptime_seconds)s)"
    exit 0
}

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

if ($Foreground) {
    Write-Host "Starting headroom proxy --port $Port (foreground)..."
    & $HeadroomExe proxy --port $Port --host 127.0.0.1
    exit $LASTEXITCODE
}

Write-Host "Proxy not detected. Starting headroom proxy --port $Port in background..."
$proc = Start-Process -FilePath $HeadroomExe -ArgumentList @("proxy", "--port", "$Port", "--host", "127.0.0.1") -WindowStyle Hidden -RedirectStandardOutput $LogFile -RedirectStandardError $ErrFile -PassThru

$deadline = (Get-Date).AddSeconds(20)
while ((Get-Date) -lt $deadline) {
    Start-Sleep -Milliseconds 500
    if (Test-HeadroomHealthy) {
        $health = Get-HeadroomHealth
        Write-Host "Headroom proxy healthy at http://127.0.0.1:$Port (v$($health.version), pid $($proc.Id))"
        exit 0
    }
    if ($proc.HasExited) {
        Write-Error "Proxy process exited with code $($proc.ExitCode). See $LogFile / $ErrFile"
    }
}

Write-Error "Proxy started (pid $($proc.Id)) but /health did not become healthy within 20s. See $LogFile / $ErrFile"
