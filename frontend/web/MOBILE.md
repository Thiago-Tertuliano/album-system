# Album — Mobile Android (Capacitor)

App Android reutiliza o build web (`dist/`) via Capacitor. Pacote: `com.axellion.album`.

## Pré-requisitos

- Node 20+
- Android Studio + SDK (API 34+ recomendado)
- JDK 17
- Backend acessível na **mesma rede** do celular (não use `localhost` no APK)

## Configurar API no app

1. Copie `.env.example` para `.env.production` (ou `.env` local antes do build):

```env
VITE_API_BASE_URL=http://SEU_IP_LAN:3333
VITE_APP_MODE=collector
```

2. No backend, exponha `0.0.0.0` (já é o default do Fastify) e libere firewall na porta `3333`.

3. Teste no navegador do celular: `http://SEU_IP:3333/health`

## Build debug (instalação rápida)

```powershell
cd frontend/web
npm install
npm run build:mobile
npm run android:apk:debug
```

APK gerado em:

`android/app/build/outputs/apk/debug/app-debug.apk`

Instale via USB (`adb install`) ou compartilhando o arquivo.

## Build release assinado

### 1. Gerar keystore (uma vez, fora do repo)

```powershell
keytool -genkey -v -keystore album-release.keystore -alias album -keyalg RSA -keysize 2048 -validity 10000
```

### 2. Configurar assinatura

```powershell
cd frontend/web/android
copy keystore.properties.example keystore.properties
# Edite storeFile, senhas e alias
```

### 3. Build

```powershell
cd frontend/web
npm run build:mobile
npm run android:apk:release
```

APK: `android/app/build/outputs/apk/release/app-release.apk`

Sem `keystore.properties`, o release compila **sem assinatura de release** (não instalável em produção).

## Abrir no Android Studio

```powershell
npm run android:open
```

## Checklist antes de testar no celular

- [ ] `npm run db:migrate` no backend
- [ ] Edições `published` (2014, 2018)
- [ ] `npm run db:set-covers` (capas em `/static/covers/`)
- [ ] `JWT_SECRET` com 32+ caracteres no `.env` do backend
- [ ] Conta de teste: `npm run collector:create -- --email voce@test.com --password "senha12345"`
- [ ] `VITE_API_BASE_URL` aponta para IP da máquina que roda o backend
- [ ] Celular e PC na mesma rede Wi‑Fi

## Fluxo de sync

1. Cadastro/login no app → `POST /v1/auth/register` ou `/v1/auth/collector/login`
2. Token em Preferences (nativo) + localStorage
3. Figurinhas carregam progresso via `GET /v1/editions/:slug/stickers` com `Authorization`
4. Marcação → `PATCH /v1/me/editions/:slug/progress`

## Troubleshooting

| Problema | Solução |
|----------|---------|
| Tela branca | `npm run build:mobile` e reinstalar APK |
| API offline | Conferir IP/porta em `VITE_API_BASE_URL` |
| Login falha | Backend rodando; `JWT_SECRET` definido |
| Imagens não carregam | URLs `/static/...` devem usar mesmo host da API (`assetUrl` no front) |

## iOS (futuro)

```bash
npx cap add ios
```

Mesmo código web; build via Xcode.
