# Relatório de Validação Ecohub

Gerado em: 2026-09-21T22:52:40.051Z

## Resumo

| Métrica | Valor |
|---------|-------|
| Etapas OK | 7 |
| Etapas com falha | 2 |
| Produção | https://eduhub-production-b513.up.railway.app |

## Fases executadas

- [x] Fase 1  -  migrate
- [x] Fase 1  -  build
- [ ] Fase 1  -  backup
- [x] Fase 2  -  seed-pilot
- [x] Fase 2  -  smoke-local
- [ ] Fase 2  -  health-local
- [x] Fase 2  -  institutional-suite
- [x] Fase 3  -  smoke-prod
- [x] Fase 3  -  health-prod

## Health local

```json
{
  "status": "degraded",
  "service": "ecohub",
  "version": "1.0.0",
  "uptime": 8.330736689,
  "checks": {
    "database": "ok",
    "authSecret": "ok",
    "persistence": "warning"
  },
  "persistence": {
    "engine": "sqlite",
    "databasePath": "./dev.db",
    "onPersistentVolume": false,
    "volumeMounted": false,
    "volumeMountPath": null,
    "volumeSource": "proc-mounts",
    "volumeReason": "Nenhum volume persistente em /data. No Railway: serviço eduhub → Volumes → Add volume → Mount path /data. Depois redeploy e cadastre de novo.",
    "volumeWritable": true,
    "accounts": {
      "users": 3,
      "schools": 1,
      "students": 1,
      "classGroups": 1,
      "persisted": false,
      "store": "sqlite",
      "goldenBackup": false
    },
    "cache": {
      "entries": 0,
      "hits": 0,
      "misses": 0,
      "hitRate": 0,
      "maxEntries": 800,
      "durable": false,
      "note": "Cache só acelera leitura. Contas ficam no Postgres."
    },
    "lastBackup": null
  },
  "mode": "institutional",
  "responseMs": 5
}
```

## Health produção

```json
{
  "status": "ok",
  "service": "ecohub",
  "version": "0.1.0",
  "uptime": 14147.13249733,
  "checks": {
    "database": "ok",
    "authSecret": "ok",
    "persistence": "ok"
  },
  "persistence": {
    "engine": "postgresql",
    "databasePath": "postgresql",
    "onPersistentVolume": true,
    "volumeMounted": true,
    "volumeMountPath": null,
    "volumeSource": "postgresql",
    "volumeReason": null,
    "volumeWritable": true,
    "accounts": {
      "users": 42,
      "schools": 1,
      "students": 35,
      "classGroups": 16,
      "persisted": true,
      "store": "postgresql",
      "goldenBackup": true
    },
    "cache": {
      "entries": 2,
      "hits": 15,
      "misses": 321,
      "hitRate": 4.5,
      "maxEntries": 800,
      "durable": false,
      "note": "Cache só acelera leitura. Contas ficam no Postgres."
    },
    "lastBackup": null
  },
  "mode": "institutional",
  "responseMs": 4
}
```

## Próximos passos manuais

1. Railway: `ECOHUB_INSTITUTIONAL=1` + `AUTH_SECRET` + volume `/data`
2. Checklist completo: `docs/GUIA_INSTITUICOES.md`
3. Treinamento: `docs/TREINAMENTO_INSTITUICOES.md`
