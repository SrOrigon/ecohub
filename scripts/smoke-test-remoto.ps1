# Equivalente ao npm run test:smoke sem precisar do Node no PATH.
param([string]$BaseUrl = "https://eduhub-production-b513.up.railway.app")

$base = $BaseUrl.TrimEnd("/")
$checks = @(
    @{ name = "Health live"; path = "/api/health/live"; expect = @(200) },
    @{ name = "Health API"; path = "/api/health"; expect = @(200, 503) },
    @{ name = "Página inicial"; path = "/"; expect = @(200) },
    @{ name = "Login escola"; path = "/login/escola"; expect = @(200) },
    @{ name = "Registro escola"; path = "/registro/escola"; expect = @(200) },
    @{ name = "Demo bloqueada"; path = "/demo/director"; expect = @(307, 308) }
)

$failed = 0
Write-Host "[smoke] Testando $base`n"
foreach ($c in $checks) {
    try {
        $r = Invoke-WebRequest -Uri "$base$($c.path)" -UseBasicParsing -MaximumRedirection 0 -ErrorAction SilentlyContinue
        $code = [int]$r.StatusCode
    } catch {
        if ($_.Exception.Response) {
            $code = [int]$_.Exception.Response.StatusCode.value__
        } else {
            Write-Host "✗ $($c.name) — $($_.Exception.Message)"
            $failed++
            continue
        }
    }
    $ok = $c.expect -contains $code
    if (-not $ok) { $failed++ }
    $sym = if ($ok) { "✓" } else { "✗" }
    Write-Host "$sym $($c.name) — $code"
}

if ($failed -eq 0) {
    Write-Host "`n[smoke] Todos os testes passaram."
    exit 0
}
Write-Host "`n[smoke] $failed teste(s) falharam."
exit 1
