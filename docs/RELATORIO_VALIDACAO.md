# Relatório de Validação Ecohub

Gerado em: 2026-08-27T21:34:19.407Z

## Resumo

| Métrica | Valor |
|---------|-------|
| Etapas OK | 9 |
| Etapas com falha | 0 |
| Produção | https://eduhub-production-b513.up.railway.app |

## Fases executadas

- [x] Fase 1  -  migrate
- [x] Fase 1  -  build
- [x] Fase 1  -  backup
- [x] Fase 2  -  seed-pilot
- [x] Fase 2  -  smoke-local
- [x] Fase 2  -  health-local
- [x] Fase 2  -  institutional-suite
- [x] Fase 3  -  smoke-prod
- [x] Fase 3  -  health-prod

## Health local

```json
{
  "status": "ok",
  "service": "ecohub",
  "version": "0.1.0",
  "uptime": 168.5221513,
  "checks": {
    "database": "ok",
    "authSecret": "ok",
    "persistence": "ok"
  },
  "persistence": {
    "engine": "sqlite",
    "databasePath": "./dev.db",
    "onPersistentVolume": false,
    "volumeMounted": true,
    "volumeMountPath": "/data",
    "volumeSource": "local",
    "volumeReason": null,
    "volumeWritable": true,
    "accounts": {
      "users": 13,
      "schools": 3,
      "persisted": true,
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
  "uptime": 1459.964507793,
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
      "users": 20,
      "schools": 1,
      "persisted": true,
      "store": "postgresql",
      "goldenBackup": true
    },
    "cache": {
      "entries": 2,
      "hits": 7,
      "misses": 24,
      "hitRate": 22.6,
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
