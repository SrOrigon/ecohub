# Execute como Administrador para remover o repositório Headroom clonado em system32.
# Esse código-fonte (~1,6 GB) NÃO é necessário para o MCP no Cursor.
# O servidor MCP usa o pacote Python instalado via pip (headroom-ai[mcp]).

$repoPath = "C:\Windows\system32\headroom"

if (-not (Test-Path $repoPath)) {
    Write-Host "Nada a remover: $repoPath nao existe."
    exit 0
}

Write-Host "Removendo $repoPath ..."
Remove-Item $repoPath -Recurse -Force
Write-Host "Concluido: $(-not (Test-Path $repoPath))"
