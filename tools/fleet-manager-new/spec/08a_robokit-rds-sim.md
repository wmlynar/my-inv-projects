# robokit-rds-sim — Specyfikacja komponentu (v0.1)

## 1. Rola w systemie (MUST)
`robokit-rds-sim` udaje serwer RDS/Roboshop po HTTP. Służy do lokalnych testów połączenia Roboshopa z „RDS-em” i porównania zachowania z prawdziwym RDS.

## 2. Zakres (MUST)
- Dostarcza podstawowe endpointy HTTP używane przez Roboshop (login, statusy, mapy/scene).
- Implementuje lekką odpowiedź RoboCore TCP dla zachowania RDSCore (porty: `19204`, `19207`, `19208`).

## 3. Uruchomienie (INFORMATIVE)
```
npm --prefix /home/inovatica/seal/fleet-manager-new/apps/robokit-rds-sim start
```

## 4. Konfiguracja (MUST)
- `HTTP_PORTS` (domyślnie `8088`)
- `HTTP_HOST` (domyślnie `127.0.0.1`)
- `HTTP_MAX_BODY`
- `HTTP_SCENE_ZIP_PATH`
- `HTTP_CORE_PARAMS_PATH`
- `STATE_PORT` (domyślnie `19204`)
- `CONFIG_PORT` (domyślnie `19207`)
- `KERNEL_PORT` (domyślnie `19208`)
- `BIND_HOST` (domyślnie `0.0.0.0`)

## 5. Odpowiedzialności niefunkcjonalne (SHOULD)
- Stabilna odpowiedź na żądania Roboshopa.
- Powtarzalne wyniki (deterministyczne) dla testów porównawczych.
