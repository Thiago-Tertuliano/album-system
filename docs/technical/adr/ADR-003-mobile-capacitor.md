# ADR-003: Mobile Android via Capacitor

## Status

Aceita.

## Contexto

O Album já possui cliente web em React + Vite ([frontend/web](../../../frontend/web)). O produto exige canal **mobile** com APK instalável e sincronização de progresso com a web via API autenticada.

Alternativas avaliadas: React Native (UI duplicada), Flutter (rewrite), PWA pura (sem APK na loja/distribuição interna trivial).

## Decisão

- **Capacitor 6+** embutindo o build estático do Vite (`dist/`) em WebView Android.
- **Android primeiro**; iOS adiado (`cap add ios` no mesmo código quando necessário).
- API em produção/dev mobile via `VITE_API_BASE_URL` (URL absoluta — celular não usa `localhost` do PC).
- Token de colecionador em `@capacitor/preferences` (web continua com `localStorage`).
- Modo app colecionador: `VITE_APP_MODE=collector` oculta rotas `/admin/*` no APK.

## Consequências

- Entrega rápida de APK reutilizando UI web.
- Performance da grade (~840 cards) deve ser monitorada; virtualização se necessário.
- `base: './'` no Vite obrigatório para assets no WebView.
- API e imagens `/static` devem estar na mesma origem configurada ou CORS + URL absoluta de assets.
- Cleartext HTTP só em build debug (LAN); produção exige HTTPS ou IP com network security config documentado.

## Referências

- [04-stack-e-repositorios.md](../04-stack-e-repositorios.md)
- [frontend/web/MOBILE.md](../../../frontend/web/MOBILE.md)
