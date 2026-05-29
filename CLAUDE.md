# CLAUDE.md

Contexto para que cualquier sesion de Claude Code arranque oriented en menos de 30 segundos.

## Quien usa este archivo

Tres audiencias pueden abrir este repo y empezar una sesion de Claude Code:

1. **Mauricio (admin/developer).** Conoce el codigo, deploya, gestiona Convex/Vercel.
2. **Ingrid Perez (mama de Mauricio).** Cuidadora principal. Quiere ajustar la app para que su uso diario sea mas comodo: cambios de copy, ajustar colores, mover algo de lugar, agregar features chicas. No es developer.
3. **Sandra Perez (tia).** Misma situacion que Ingrid pero menos involucrada con la app.

Si abriste Claude aca y nunca tocaste codigo, lee la seccion **"Para empezar"** abajo. Si sos developer, salta directo a "Stack" y "Estructura del repo".

## Para empezar (especialmente si nunca tocaste codigo)

Claude Code es como tener un programador al lado escuchando tus pedidos. Decile en espanol lo que querias cambiar y el lo hace por vos. Reglas que ayudan:

**Como pedir cosas:**
- Se concreta: "cambia el color del boton Guardar a verde" mejor que "haz la app mas linda".
- Si no sabes que palabra usar, describi: "el cuadro grande que aparece arriba con el saldo".
- Mandale screenshots cuando puedas. Claude los entiende.

**Como probar antes de pushear (recomendado para cambios chicos):**
1. Abri una terminal aca y corre `npm run dev`.
2. Abri <http://localhost:3000> en el navegador.
3. Pedile a Claude el cambio. La pagina se recarga sola con cada edit.
4. Cuando te guste, decile a Claude "commitea y pushea". Vercel publica solo en 1-2 minutos.

**Reglas de seguridad (importantes):**
- Si Claude propone borrar algo (filas en la base, archivos importantes), preguntale "que pasa si lo hago" antes de aceptar.
- Pedile que te muestre los cambios (`git diff`) antes de commitear si tenes dudas.
- Si rompiste algo despues de un push, decile a Claude "deshace el ultimo cambio" (es un `git revert`). Vercel vuelve atras solo.
- **Nunca** corras `git reset --hard`, `git push --force`, `git clean -f` sin entender. Si Claude lo sugiere, pregunta dos veces.
- La base de datos en produccion tiene tu info real. Antes de tocar Convex (mutations, schema), decile a Claude que te explique que va a cambiar.

**Cosas que Claude puede hacer por vos sin riesgo:**
- Cambiar textos, copy, traducciones.
- Mover componentes, cambiar colores, ajustar espaciado.
- Agregar campos a un formulario.
- Cambiar lo que dice un email.
- Renombrar cosas para que sean mas claras.

**Cosas que pide pensar bien antes:**
- Cambiar el modelo de datos (tablas, campos en la DB).
- Borrar features que ya funcionan.
- Cambiar la forma en que los usuarios entran (auth).
- Tocar el cron de los emails.

**Workflow tipico de una sesion contigo:**
```
1. Abris Claude Code aca: "claude" en la terminal
2. Le decis: "quiero cambiar X"
3. Te pregunta cosas, te muestra opciones
4. Aceptas la que te gusta
5. Hace el cambio, te muestra el resultado en localhost
6. Si te gusta: "commitea y pushea con un mensaje claro"
7. En 2 minutos esta vivo en losnuestros.vercel.app
```

Si te perdiste o algo no funciona, dejale el problema escrito a Mauricio y el lo retoma.

## Que es esto

**LosNuestros** es un organizador familiar para dos cuidadoras (Ingrid Perez y Sandra Perez) que cuidan a Ana Maria Ortega Salcedo, la abuela de Mauricio (varelaperezmauricio@gmail.com / GitHub `maovarela`). Ana Maria tiene Alzheimer.

El problema central: las dos cuidadoras **no se comunican mucho entre ellas**. La app cierra ese gap con datos compartidos en tiempo real. Cuando una marca un pago, registra una cita o actualiza un refill, la otra lo ve sin tener que llamarla.

Mauricio **no es usuario final**. Es admin: setupea, genera links de invitacion, deploya. Las usuarias son su mama y su tia, ambas no-tecnicas. Tambien hay un tercer usuario solo-lectura: la propia Ana Maria, con ruta dedicada `/abuela`.

Spec funcional original: `spec/panel-original.html` (HTML vanilla con localStorage que Mauricio y su mama trabajaron). La spec se respeto en data y semantica, no en codigo.

## Stack

- Next.js 16 (App Router, Turbopack) + TypeScript + React 19
- Tailwind v4 con design tokens CSS-first en `app/globals.css` (no `tailwind.config.ts`)
- Convex (DB + realtime + functions + crons + scheduler) en `convex/`
- Resend para emails (digest semanal + alertas en tiempo real). `RESEND_API_KEY` en Convex env vars
- Gemini Flash via Google AI Studio para vision/ingestion (`GEMINI_API_KEY` en Vercel env)
- Vercel hosting (free tier hobby, uso familiar no comercial)
- Auth custom: link de invitacion + cookie HttpOnly firmada con HMAC-SHA256 (Web Crypto). Dura 1 ano. Tokens reutilizables (no se queman).
- Atkinson Hyperlegible Next via `next/font/google` (accesibilidad baja-vision)
- Material Symbols Outlined via Google Fonts link (iconos por toda la UI)

**Heads up Next.js 16**: si necesitas chequear convenciones nuevas (cookies en RSC vs Route Handler, etc.), `AGENTS.md` apunta a `node_modules/next/dist/docs/`. Ya nos mordio una vez (cookies set en Server Component lanzaba runtime error).

**Heads up Convex**: leer `convex/_generated/ai/guidelines.md` primero al tocar `convex/`. Esas reglas overridean lo que sepas de training. Skills de Convex se instalan con `npx convex ai-files install`.

## Estructura del repo

```
app/
  layout.tsx                root: Atkinson + Material Symbols + colorScheme: light
  globals.css               tokens M3 (Stitch palette light-only), .glass-card, material-symbols CSS
  page.tsx                  landing publica (oculta nombre patient pre-auth)
  entrar/[token]/route.ts   GET handler que consume invitation, setea cookie, redirige
  abuela/
    layout.tsx              guard de sesion para role=patient
    page.tsx                vista solo-lectura: saldo grande + lista de medicamentos
  api/ingest/route.ts       POST handler que llama Gemini Flash con vision schema
  app/
    layout.tsx              guard de sesion + header + bottom nav fija + FAB + providers
    _components/
      tabs.tsx              bottom nav fija (Inicio/Medicinas/Citas/Finanzas/Referencias de pago)
      fab.tsx               FAB azul navy flotante hacia /app/ingestar (se oculta alli)
      icon.tsx              wrapper Material Symbols con filled prop
      pill.tsx              Pill component variantes success/warn/danger/info/tertiary/neutral
      who-did-it.tsx        selector pagador con 3 botones (Ana Maria + Yo + Sandra)
      drag-drop-overlay.tsx overlay global para drag files a /app/ingestar
    page.tsx                redirect a /app/resumen
    resumen/page.tsx        UpcomingCard con iconos+borde-l + Lo que paso (atribucion)
    medicamentos/page.tsx   alertas + lista con edit inline por card + form Agregar colapsable
    citas/page.tsx          banner proxima cita purple + cards con edit inline + Agregar colapsable
    referencias/page.tsx    cards compactas con edit inline por card + status dinamico
    finanzas/page.tsx       selector mes con arrows + auto-save + PaidServiceRow (checkbox+pills+fecha+tinte)
    ingestar/page.tsx       upload foto/texto + Gemini parsing + revisar propuestas
manifest.ts                 PWA manifest: start_url=/abuela, display=standalone, theme #2a5c82
apple-icon.tsx              iOS 'Add to Home Screen' icon 180x180 via ImageResponse

convex/
  schema.ts                 patients, caregivers (con role+email), invitations,
                            medications, appointments, payment_references,
                            finance_months (con _paid_by per servicio), settlements,
                            finance_audit (append-only, snapshot on delete)
  patients.ts               getDefault
  caregivers.ts             getById, listByPatient, getPatientCaregiver, rename,
                            setEmail, setRole, createPatientView
  invitations.ts            create, consume (tokens reutilizables, 30 dias TTL)
  medications.ts            CRUD + markRefilled (dispara sendChangeAlert)
  appointments.ts           CRUD (dispara sendChangeAlert al crear)
  paymentReferences.ts      listByPatient (ordenadas por sort_order)
  financeMonths.ts          upsert + remove + markServicePaid + setServicePayer
                            + settle + getByMonth + listByPatient + getBalances
                            + listSettlements + listAuditByPatient + backfillPaidBy
  email.ts                  Resend integration: sendWeeklyDigest (cron domingo 13 UTC)
                            + sendChangeAlert (refill/payment/appointment) via scheduler
                            + sendDigestNow (action publica para testing)
  crons.ts                  weekly digest sunday 13:00 UTC
  seed.ts                   mutation idempotente: patient + caregivers + invitations
                            + 9 medicamentos + 1 cita + 10 referencias

lib/
  session.ts                sign/verify cookie HMAC (Web Crypto)
  session-server.ts         getSession server-only (cookies().get)
  convex-server.ts          singleton ConvexHttpClient para Server Components
  convex-client.tsx         ConvexProvider para Client Components
  app-context.tsx           inyecta patientId/caregiverId/nombres/patientCaregiver
  drop-context.tsx          useRef-based context para pending file en drag-drop

spec/panel-original.html    HTML original como referencia funcional
PENDIENTES.md               backlog vivo
```

## Estado al cierre (2026-05-29, commit `81be8c1`)

Todo lo de las 6 fases originales esta en produccion, mas un set grande de mejoras de esta sesion:

**Modelo de datos (financiero):**
- Per-service payer (`compensar_paid_by`, `enel_paid_by`, etc.) en lugar del booleano `_paid` viejo + month-level `responsible_for`. Migrado con `backfillPaidBy`.
- Tabla `settlements` para registrar devoluciones (Ana Maria paga a Ingrid/Sandra lo que ellas adelantaron). Modelo Splitwise-style.
- Tabla `finance_audit` append-only con snapshot al borrar. Eventos: created, updated, paid, unpaid, payer_changed, deleted, settled.
- Cuando Ingrid/Sandra paga un servicio de su bolsillo, se crea deuda; cuando Ana Maria les devuelve, baja el saldo del banco y la deuda vuelve a 0.

**Email digest + alertas en tiempo real:**
- Cron domingo 13:00 UTC dispara `sendWeeklyDigest` (resumen "lo que viene" + "lo que paso").
- Mutations criticas (markRefilled, markServicePaid/setServicePayer, appointments.create, medications.create) disparan `sendChangeAlert` via scheduler.runAfter(0, ...).
- FROM address: `onboarding@resend.dev` (sandbox, sin domain verification). Para mejor deliverability eventualmente verificar dominio en Resend.

**Vista de la abuela en `/abuela`:**
- Login con su propio token (caregiver record con `role: "patient"`).
- Ruta dedicada, solo-lectura, super simple: saldo del mes en grande + lista de medicamentos.
- El handler `/entrar/[token]` revisa el role y redirige a `/abuela` o `/app` segun corresponda.

**Ingestion via Gemini Flash:**
- Drag-and-drop global activo en cualquier `/app/*` (DragDropOverlay).
- Page `/app/ingestar` con upload de foto / pegar texto.
- `POST /api/ingest` llama Gemini Flash con `responseSchema` para JSON estructurado.
- Devuelve propuestas (med / cita / pago) que la cuidadora revisa antes de guardar.
- Fallback manual si Gemini falla.

**Design system (Stitch-style):**
- Paleta Material 3 light-only: primary `#2a5c82` navy claro, secondary `#438e79` teal, tertiary `#6d5da1` lavanda, error `#ba1a1a`, body bg `#f8fafc`.
- Atkinson Hyperlegible Next como font principal (accesibilidad).
- Material Symbols Outlined por toda la UI (iconos en alertas, cards, navegacion, FAB).
- Bottom nav fija reemplaza tabs horizontales (5 items con iconos, pill verde para activo).
- FAB azul navy bottom-right hacia `/app/ingestar` en todas las paginas de `/app/*`.
- Glass-card + headline grande (48px bold) para saldo en finanzas.
- Cards con icon container + borde-l-4 coloreado por categoria (meds blue, citas purple, refs amber).
- Pills coloridas para estados (Vencido rojo, En N dias ambar, Pagado verde, etc.).
- Section headers a 20px semibold reemplazan los `text-xs uppercase tracking-wider`.
- `prefers-color-scheme: dark` removido (forzado a light siempre, el spec no incluye dark).

**UX finanzas (auto-save):**
- Cero boton "Guardar". Cada cambio (pill de pagador, monto, saldo, nota) auto-guarda a 800ms de debounce via upsert.
- Toast flotante "Guardado" verde aparece en el medio inferior por 2.5s tras cada save.
- Indicador chico arriba del form: "Guardando..." / "Cambios guardados".
- Mental model unico: la app se acuerda sola, no hay que apretar nada.
- Sigue existiendo `setServicePayer` para CTAs externos (resumen, ingestar) pero la pagina de finanzas no la usa directamente.

**Otras mejoras (hasta a161aa8):**
- Tercer boton "Ana Maria" en WhoDidIt (selector pagador) en todas las pantallas. Default en finanzas para meses nuevos.
- Card "Estado del mes anterior" en finanzas (oculta cuando no hay data del prev).
- Valor dinamico en Pagos: monto desde `finance_months` (current + last) en lugar del `amount_reference` fijo. Status compacto en una linea: "✓ $X pagados en mayo por Ana Maria".

## Round post-cierre (2026-05-29, hasta `81be8c1`)

Set de mejoras de UX post-feedback directo de Ingrid usando la app:

**Edit inline por card** (medicamentos + citas + referencias-de-pago):
- Antes: tocar "Editar" desde la lista al fondo te scrolleaba al form al top. Confuso porque perdias contexto.
- Ahora: cada card tiene su propio modo edit. Toca "Editar" y la card se expande con el form ahi mismo. Cero scroll.
- Form de "Agregar" colapsado por default. Boton "+ Agregar" arriba a la derecha del titulo lo abre.
- Deep link `?edit=<id>` (de CTAs en resumen / ingestar) hace scrollIntoView smooth a la card especifica y la abre.

**Referencias de pago: cards compactas + editables** (`/app/referencias`):
- Cards mas compactos (icon 11x11, padding 3, text-sm). Cabe mas en pantalla.
- Boton de lapiz arriba a la derecha en cada card → form inline para editar frecuencia, dia de vencimiento, datos de pago (N° cliente, etc.) y notas.
- Mutation `paymentReferences.update` ya existia.
- Renombrado en bottom nav de "Pagos" a "Referencias de pago" (Pagos confundia con la accion de pagar, que vive en Finanzas).
- Tambien renombrado "Meds" a "Medicinas" (sin jerga gringa).

**Finanzas: checkbox-first per service** (`/app/finanzas`):
- Schema: 7 nuevos campos `_paid_at: string` (YYYY-MM-DD) por servicio. Migracion no-breaking (todos optional).
- UI: `PaidServiceRow` reemplaza a `PayerRow`. Checkbox "Pagado" + amount. Cuando marcado, abajo se muestra pills [Ana Maria][Yo][Sandra] + date picker.
- Default al marcar el checkbox: paid_by = Ana Maria, paid_at = hoy. Un toque y queda registrado el caso comun.
- Tinte de fondo segun pagador: verde subtle si Ana Maria (normal, saldo bajo), ambar subtle si Ingrid/Sandra (deuda pendiente). Permite scanear quien pago sin leer.
- `setServicePayer` mutation actualizada para aceptar `paidAt` opcional. CTAs externos (resumen/ingestar) usan default = hoy.
- Card "Estado del mes anterior" oculta cuando no hay data del prev (antes mostraba un mensaje vacio "No hay registro..." confuso).

**Selector de mes simplificado:**
- Antes: 3 controles para la misma cosa (botones "Mes actual" + "Mes pasado" + dropdown). Confundia.
- Ahora: `[<] [dropdown grande Abril 2026 ▾] [>]`. Patron familiar de cualquier calendario. Si estas en mes actual/pasado, texto chico abajo confirma.

**PWA + iconos para tablet kiosk-style** (camino 1: app instalable):
- `app/manifest.ts`: name='LosNuestros - Ana Maria', start_url='/abuela', display='standalone', theme color #2a5c82.
- `public/icon.svg` + `public/icon-maskable.svg`: AO navy sobre rounded square.
- `app/apple-icon.tsx`: genera PNG 180x180 para iOS via ImageResponse.
- Pendiente para Echo Show feel completo: Wake Lock API (mantener pantalla prendida) + layout grande horizontal + reloj + clima.

Backlog vivo: **`PENDIENTES.md`** en root. Lo grande pendiente: dark mode acompasado, modal custom vs `window.confirm`, manejo de errores de red en mutaciones, deliverability emails (verificar dominio en Resend), Wake Lock + layout kiosk grande para tablet de la abuela.

## Reglas de colaboracion (hard)

Mauricio fue explicito al inicio. Estas son las reglas que cortan cuando hay duda:

- **Spanish first**, sin i18n
- **Mobile first**, uso real desde celular
- **No-tech users**: Ingrid y Sandra son los usuarios reales. Mental models simples, una sola regla por feature. Cero jerga.
- **Sin emojis** en UI ni codigo salvo pedido explicito
- **Sin em-dashes (—) en copy del usuario** (en comentarios de codigo si)
- **Sin features que no se pidieron**. Tres lineas similares es mejor que una abstraccion prematura.
- **Sin docs auto-inventados** salvo `PENDIENTES.md` y `CLAUDE.md` (este). README.md, ADRs, etc. solo si Mauricio los pide.
- **Sin backwards-compat hacks**. Quitar limpio, sin re-exports ni `_unused`.
- **Cambios destructivos avisados** antes de force push, reset hard, delete data.
- **Light mode only** por ahora. El design system Stitch no tiene valores dark. Si se quiere dark, hay que armarlo desde cero.
- **Privacidad**: datos medicos y financieros reales. Auth estricto, nada de subir a servicios externos sin aprobar (Gemini y Resend ya estan aprobados).
- **Decisiones subjetivas → AskUserQuestion** con 3-4 opciones y previews cuando ayuden (color, copy, naming, layout). Una pregunta cuesta un mensaje, un commit rechazado cuesta una sesion.
- **Verifica visualmente** antes de declarar terminado. UI tocada → abrirla en navegador, probar golden path + edge cases. Si no se puede testear en vivo, decirlo explicito.
- **Cambios grandes en branch + preview deploy de Vercel** antes de mergear a main. Si el riesgo es bajo (1-2 archivos), merge directo y `git revert` si no gusta. Vercel auto-deploya `main` en 1-2 min.

## Comandos clave

```powershell
# Dev local
npm run dev

# Build (TypeScript + Turbopack)
npm run build

# Convex prod deploy (cambia env primero)
$env:CONVEX_DEPLOYMENT = 'prod:little-moose-778'
npx convex deploy

# Correr una mutation o query contra prod (PowerShell)
npx convex run --prod <module>:<function>
# JSON args con --% para que PowerShell no se coma las comillas
# Para JSON con IDs largos, mejor usar bash si lo tenes:
CONVEX_DEPLOYMENT='prod:little-moose-778' npx convex run --prod financeMonths:backfillPaidBy '{"patientId": "..."}'

# Seed (idempotente, no rompe nada al re-correrlo)
npx convex run --prod seed:initial

# Probar email digest sin esperar al cron
npx convex run --prod email:sendDigestNow

# Setear email de una caregiver
npx convex run --prod caregivers:setEmail '{"id": "...", "email": "x@y.com"}'

# Crear caregiver-patient view (Ana Maria como caregiver con role=patient)
npx convex run --prod caregivers:createPatientView
```

Vercel auto-deploya al pushear `main`. Cambios en `convex/*.ts` requieren `npx convex deploy` aparte (manual).

## URLs e IDs operativos

- App prod: <https://losnuestros.vercel.app>
- Vista abuela: <https://losnuestros.vercel.app/abuela>
- Repo: <https://github.com/maovarela/Losnuestros>
- Convex dashboard: <https://dashboard.convex.dev>
- Convex prod backend: `https://little-moose-778.convex.cloud`
- Notion: <https://www.notion.so/maovarela/LosNuestros-36a238c747f280428db3c9a858d1988a>
- Resend dashboard: <https://resend.com/emails>

Caregivers en prod:
- Ingrid Perez: `j576a4m9y129c2z6r6nj4y647587arhv` (email: iyi1125@gmail.com)
- Sandra Perez: `j57b27txvxnqqrs7xrz8n34wdh87btgq` (email: pendiente)
- Ana Maria (role=patient): generada via `caregivers:createPatientView`

Patient default:
- Ana Maria Ortega Salcedo: `jd7aef8495580bhm2sst1ty13587bwcw`

Para generar links de invitacion nuevos:

```powershell
$env:CONVEX_DEPLOYMENT = 'prod:little-moose-778'
npx convex run invitations:create --% "{\"caregiverId\": \"<id>\"}"
# Token reutilizable: comparti losnuestros.vercel.app/entrar/<token> por WhatsApp.
```

## Auth model en 30 segundos

1. Mauricio corre `invitations:create` para una caregiver → recibe un token random base64url.
2. Comparte por WhatsApp el link `losnuestros.vercel.app/entrar/<token>`.
3. La caregiver toca el link → `GET /entrar/[token]` (route handler) consume el token, genera payload firmado con HMAC-SHA256 sobre `SESSION_SECRET`, setea cookie `ln_session` (HttpOnly, SameSite=Lax, 1 ano), redirige a `/app` (o `/abuela` si role=patient).
4. `/app/layout.tsx` (Server Component) llama `getSession()`. Si no hay sesion → redirige a `/`. Si si → fetchea patient + caregiver + listByPatient + getPatientCaregiver, los inyecta via `AppProvider` a Client Components.
5. Convex Functions confian en el `caregiverId` pasado como arg porque solo se llaman desde nuestro server. Trust model de scope familiar, no enterprise.

## Errores conocidos / gotchas

- `npx convex deploy` con `.env.local` apuntando a deployment local pide confirmacion interactiva. Workaround: setear `$env:CONVEX_DEPLOYMENT = 'prod:little-moose-778'` antes.
- Convex rechaza non-ASCII en field names de objetos retornados por mutations. Usar `caregiver: "Mamá"` dentro de un valor, no como key del objeto.
- Node en Windows muestra `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)` al exit. No afecta resultado, ignorar.
- `Remove-Item` en PowerShell con `[token]` en el path falla. Usar `-LiteralPath`.
- TypeScript 5.7+ trata `Uint8Array<ArrayBufferLike>` incompatible con `crypto.subtle.verify`. Tipar explicito como `Uint8Array<ArrayBuffer>` (ver `lib/session.ts`).
- Tailwind v4 usa CSS-first (`@theme inline` en `globals.css`), no hay `tailwind.config.ts`. Para agregar un color nuevo, lo defines como `--color-x` ahi y como `--x` en `:root`.
- Convex schema con campos opcionales: para "migrar" haz el campo viejo `v.optional()` primero, mutation que backfill al nuevo, luego (opcional) cleanup. Asi no rompes la validacion al deployar.
- PowerShell se come las comillas en JSON args de `convex run`. Mejor pasar JSON via bash si esta disponible.
- Auto-save en finanzas con debounce 800ms: si la cuidadora cambia el mes seleccionado en menos de 800ms despues de tipear, podria perder el ultimo cambio. En la practica casi nunca pasa.
- Email FROM `onboarding@resend.dev` puede caer a spam. Para mejor deliverability hay que verificar un dominio propio en Resend.

## Cuando duden, lean

- `PENDIENTES.md` para backlog y decisiones pendientes
- `spec/panel-original.html` para entender que esperaba la spec original
- `convex/_generated/ai/guidelines.md` antes de tocar Convex
- Memoria persistente en `~/.claude/projects/c--Users-varel-LosNuestros/memory/`: `user_role.md`, `project_context.md`, `feedback_rules.md`
