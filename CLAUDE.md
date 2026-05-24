# CLAUDE.md

Contexto para que cualquier sesion de Claude Code arranque oriented en menos de 30 segundos.

## Que es esto

**LosNuestros** es un organizador familiar para dos cuidadoras (Ingrid Perez y Sandra Perez) que cuidan a Ana Maria Ortega Salcedo, la abuela de Mauricio (varelaperezmauricio@gmail.com / GitHub `maovarela`). Ana Maria tiene Alzheimer.

El problema central: las dos cuidadoras **no se comunican mucho entre ellas**. La app cierra ese gap con datos compartidos en tiempo real. Cuando una marca un pago, registra una cita o actualiza un refill, la otra lo ve sin tener que llamarla.

Mauricio **no es usuario final**. Es admin: setupea, genera links de invitacion, deploya. Las usuarias son su mama y su tia, ambas no-tecnicas.

Spec funcional original: `spec/panel-original.html` (HTML vanilla con localStorage que Mauricio y su mama trabajaron). La spec se respeto en data y semantica, no en codigo.

## Stack

- Next.js 16 (App Router, Turbopack) + TypeScript + React 19
- Tailwind v4 con design tokens CSS-first en `app/globals.css` (no `tailwind.config.ts`)
- Convex (DB + realtime + functions) en `convex/`
- Vercel hosting (free tier hobby, uso familiar no comercial)
- Auth custom: link de invitacion + cookie HttpOnly firmada con HMAC-SHA256 (Web Crypto). Dura 1 ano.

**Heads up Next.js 16**: si necesitas chequear convenciones nuevas (cookies en RSC vs Route Handler, etc.), `AGENTS.md` apunta a `node_modules/next/dist/docs/`. Ya nos mordio una vez (cookies set en Server Component lanzaba runtime error).

**Heads up Convex**: leer `convex/_generated/ai/guidelines.md` primero al tocar `convex/`. Esas reglas overridean lo que sepas de training. Skills de Convex se instalan con `npx convex ai-files install`.

## Estructura del repo

```
app/
  page.tsx                  landing publica (oculta nombre patient pre-auth)
  layout.tsx                root, metadata, html lang=es
  globals.css               paleta del HTML como @theme tokens (light + dark auto)
  entrar/[token]/route.ts   GET handler que consume invitation, setea cookie, redirige
  app/
    layout.tsx              guard de sesion + header con avatar AO + Tabs + providers
    _components/tabs.tsx    barra horizontal de tabs (active via usePathname)
    page.tsx                redirect a /app/resumen (no contenido)
    resumen/page.tsx        Lo que viene esta semana + Lo que paso esta semana
    medicamentos/page.tsx   alertas + form + lista + ?edit=<id> deep link
    citas/page.tsx          banner proxima cita + form + historial + ?edit=<id>
    referencias/page.tsx    read-only por servicio + hogar
    finanzas/page.tsx       form mensual + reconciliacion banco vs teorico + historial

convex/
  schema.ts                 patients, caregivers, invitations, medications,
                            appointments, payment_references, finance_months
  patients.ts               getDefault
  caregivers.ts             getById, listByPatient, rename
  invitations.ts            create, consume (one-time tokens, 30 dias TTL)
  medications.ts            CRUD + markRefilled (last=hoy, next=hoy+intervalo previo)
  appointments.ts           CRUD
  paymentReferences.ts      CRUD (ordenadas por sort_order)
  financeMonths.ts          CRUD + getByMonth + upsert + markServicePaid (crea mes
                            si no existe con defaults del HTML)
  seed.ts                   mutation idempotente: patient + caregivers + invitations
                            + 9 medicamentos + 1 cita + 10 referencias

lib/
  session.ts                sign/verify cookie HMAC (Web Crypto)
  session-server.ts         getSession server-only (cookies().get)
  convex-server.ts          singleton ConvexHttpClient para Server Components
  convex-client.tsx         ConvexProvider para Client Components
  app-context.tsx           inyecta patientId/caregiverId/nombres via React context

spec/panel-original.html    HTML original como referencia funcional
PENDIENTES.md               backlog vivo
```

## Estado al cierre (2026-05-24, commit `03ac06a`)

Las **6 fases planeadas estan en produccion**:

- F0 scaffold, F1 auth + schema base, F2 medicamentos, F3 citas, F4 referencias, F5 finanzas, F6 home con alertas.

Mejoras post-fases ya aplicadas:
- Auditoria UI (P0/P1 del audit del Product Manager subagente): em-dashes fuera, contraste WCAG AA, tap targets min-h-11, voseo a tuteo neutro colombiano, save toast, focus-visible rings, semantica main/nav/section.
- Separador de miles en inputs de pesos ($1.080.000) con `tabular-nums`.
- CTAs en cada alerta: "Hice el refill", "Marcar pagado", "Ver cita". Las dos primeras son mutations de un solo toque; la tercera es deep link `?edit=<id>` al form.
- Estructura visual del HTML original restaurada (post-feedback): tabs horizontales en lugar de cards de navegacion, nueva tab "Resumen" como default con "Lo que viene" + "Lo que paso esta semana", alertas viven dentro de cada tab (no consolidadas en home).
- Atribucion siempre visible en historiales: "Ingrid actualizo X" / "Sandra actualizo Y" en medicamentos, citas, finanzas y resumen reciente. Antes estaba filtrado solo cuando era la otra cuidadora, ahora siempre aparece.

Backlog vivo: **`PENDIENTES.md`** en root. Items abiertos: notificaciones externas (email Resend + Convex cron), modal custom vs `window.confirm`, lista antes que form, manejo de errores de red, focus rings en botones, tercer "usuario" abuela (3 caminos posibles, decidir).

## Reglas de colaboracion (hard)

Mauricio fue explicito al inicio. Estas son las reglas que cortan cuando hay duda:

- **Spanish first**, sin i18n
- **Mobile first**, uso real desde celular
- **Sin emojis** en UI ni codigo salvo pedido explicito
- **Sin em-dashes (—) en copy del usuario** (en comentarios de codigo si)
- **Sin features que no se pidieron**. Tres lineas similares es mejor que una abstraccion prematura.
- **Sin docs auto-inventados** salvo `PENDIENTES.md` y `CLAUDE.md` (este). README.md, ADRs, etc. solo si Mauricio los pide.
- **Sin backwards-compat hacks**. Quitar limpio, sin re-exports ni `_unused`.
- **Cambios destructivos avisados** antes de force push, reset hard, delete data.
- **Restraint editorial** en visual. Paleta del HTML (verde/ambar/azul/rojo sutiles), system fonts, dark mode auto. Sin gradientes, sin drop shadows agresivos, sin animaciones decorativas.
- **Privacidad**: datos medicos y financieros reales. Auth estricto, nada de subir a servicios externos sin aprobar.
- **Decisiones subjetivas → AskUserQuestion** con 3-4 opciones y previews cuando ayuden (color, copy, naming, layout). Una pregunta cuesta un mensaje, un commit rechazado cuesta una sesion.
- **Verifica visualmente** antes de declarar terminado. UI tocada → abrirla en navegador, probar golden path + edge cases. Si no se puede testear en vivo, decirlo explicito.

## Comandos clave

```powershell
# Dev local
npm run dev

# Build (TypeScript + Turbopack)
npm run build

# Convex prod deploy (cambia env primero)
$env:CONVEX_DEPLOYMENT = 'prod:little-moose-778'
npx convex deploy

# Correr una mutation o query contra prod
npx convex run --prod <module>:<function>
# JSON args con --% para que PowerShell no se coma las comillas:
npx convex run --prod invitations:create --% "{\"caregiverId\": \"<id>\"}"

# Seed (idempotente, no rompe nada al re-correrlo)
npx convex run --prod seed:initial
```

Vercel auto-deploya al pushear `main`. Cambios en `convex/*.ts` requieren `npx convex deploy` aparte (manual).

## URLs e IDs operativos

- App prod: <https://losnuestros.vercel.app>
- Repo: <https://github.com/maovarela/Losnuestros>
- Convex dashboard: <https://dashboard.convex.dev>
- Convex prod backend: `https://little-moose-778.convex.cloud`
- Notion: <https://www.notion.so/maovarela/LosNuestros-36a238c747f280428db3c9a858d1988a>

Caregivers en prod:
- Ingrid Perez: `j576a4m9y129c2z6r6nj4y647587arhv`
- Sandra Perez: `j57b27txvxnqqrs7xrz8n34wdh87btgq`

Para generar links de invitacion nuevos cuando pierdan sesion:

```powershell
$env:CONVEX_DEPLOYMENT = 'prod:little-moose-778'
npx convex run invitations:create --% "{\"caregiverId\": \"<id>\"}"
# La URL final es https://losnuestros.vercel.app/entrar/<token>
# Compartir por WhatsApp.
```

## Auth model en 30 segundos

1. Mauricio corre `invitations:create` para una caregiver → recibe un token random base64url.
2. Comparte por WhatsApp el link `losnuestros.vercel.app/entrar/<token>`.
3. La caregiver toca el link → `GET /entrar/[token]` (route handler, no page) consume el token (lo marca `consumed_at`), genera un payload firmado con HMAC-SHA256 sobre `SESSION_SECRET`, setea cookie `ln_session` (HttpOnly, SameSite=Lax, 1 ano), redirige a `/app`.
4. `/app/layout.tsx` es Server Component que llama `getSession()` (verify HMAC). Si no hay sesion → redirige a `/`. Si si → fetchea patient + caregiver, los inyecta via `AppProvider` (React Context) a los Client Components hijos.
5. Convex Functions confian en el `caregiverId` pasado como arg porque solo se llaman desde nuestro server (cookie verificada arriba). Es un trust model de scope familiar, no enterprise.

## Errores conocidos / gotchas

- `npx convex deploy` con `.env.local` apuntando a deployment local pide confirmacion interactiva. Workaround: setear `$env:CONVEX_DEPLOYMENT = 'prod:little-moose-778'` antes de la llamada.
- Convex rechaza non-ASCII en field names de objetos retornados por mutations. Usar `caregiver: "Mamá"` dentro de un valor, no como key del objeto.
- Node en Windows muestra `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)` al exit. No afecta resultado, ignorar.
- `Remove-Item` en PowerShell con `[token]` en el path falla. Usar `-LiteralPath`.
- TypeScript 5.7+ trata `Uint8Array<ArrayBufferLike>` incompatible con `crypto.subtle.verify`. Tipar explicito como `Uint8Array<ArrayBuffer>` (ver `lib/session.ts`).
- Tailwind v4 usa CSS-first (`@theme inline` en `globals.css`), no hay `tailwind.config.ts`. Para agregar un color nuevo, lo defines como `--color-x` ahi.

## Cuando duden, lean

- `PENDIENTES.md` para backlog y decisiones pendientes
- `spec/panel-original.html` para entender que esperaba la spec
- `convex/_generated/ai/guidelines.md` antes de tocar Convex
- Memoria persistente en `~/.claude/projects/c--Users-varel-LosNuestros/memory/`: `user_role.md`, `project_context.md`, `feedback_rules.md`
