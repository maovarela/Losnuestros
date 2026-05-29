# Pendientes

Ideas y mejoras que surgen durante el desarrollo. No tienen fecha. Se atacan cuando duele o cuando hay tiempo.

## Hecho (refleja lo entregado a 2026-05-29)

Para no perder memoria de lo que ya se construyo:

**Hasta 2026-05-27:**
- **Notificaciones fuera de la app**: email digest semanal (domingo 13 UTC) + alertas en tiempo real (refill, payment, appointment) via Resend + scheduler de Convex. FROM `onboarding@resend.dev`. Ingrid configurada con `iyi1125@gmail.com`. Sandra: pendiente de pasar email.
- **Vista de la abuela** en `/abuela`: caregiver con `role="patient"`, login propio, vista solo-lectura con saldo grande + lista de medicamentos.
- **Agente de ingestion (parcial)**: drag-and-drop global a `/app/ingestar` + foto/texto + Gemini Flash con response schema estructurado + propuestas que la cuidadora confirma antes de guardar. Fallback manual si Gemini falla.
- **Modelo Splitwise en finanzas**: per-service `_paid_by` reemplaza el booleano viejo + tabla `settlements` para devoluciones + `getBalances` query. Si Ingrid paga Enel de su bolsillo, se crea deuda; al devolver, baja saldo y cierra deuda.
- **Bitacora de finanzas**: tabla `finance_audit` append-only con snapshot al borrar. Eventos: created/updated/paid/unpaid/payer_changed/deleted/settled.
- **Design system Stitch-style**: paleta Material 3 light-only (primary navy claro, secondary teal, tertiary lavanda), Atkinson Hyperlegible Next, Material Symbols por toda la UI, bottom nav fija, FAB navy, glass-card en saldo, cards con icon container + borde-l-4 + pills coloridas, section headers a 20px semibold.
- **Auto-save en finanzas**: cero boton "Guardar". Cada cambio dispara upsert con 800ms debounce. Toast "Guardado" verde abajo + indicador chico arriba. Mental model unico para no-tech.
- **Estado del mes anterior** en finanzas: card que muestra los 7 servicios del mes pasado con su status. Se oculta cuando no hay data.
- **Valor dinamico en Pagos**: monto desde `finance_months` (current + last) en lugar del `amount_reference` fijo. Status compacto en una linea.
- **Tercer boton "Ana Maria"** en WhoDidIt (selector pagador). Default para meses nuevos en finanzas.

**Round post-feedback de Ingrid (2026-05-27 a 2026-05-29):**
- **Edit inline por card** en medicamentos, citas, referencias de pago. Antes "Editar" scrolleaba al top y perdias contexto. Ahora la card se expande con form ahi mismo. "Agregar" colapsable arriba a la derecha.
- **Referencias de pago: editables desde la UI**. Cada card tiene boton lapiz → form inline para cambiar frecuencia, dia de vencimiento, datos de pago (N° cliente, etc.), notas. Si Ingrid o Sandra reciben info nueva, no necesitan a Mauricio.
- **Renames en bottom nav**: "Meds" → "Medicinas" (sin jerga gringa). "Pagos" → "Referencias de pago" (Pagos confundia con la accion de pagar que vive en Finanzas).
- **Checkbox-first en finanzas** per servicio. Antes era pill row `[No pagado][Ana Maria][Yo][Sandra]` que confundia a Ingrid. Ahora: checkbox "Pagado" + amount. Cuando marcado, abajo pills + date picker. Default: Ana Maria + hoy. Tinte verde si Ana Maria pago, ambar si alguien le adelanto plata (deuda pendiente).
- **Fecha de pago** (`_paid_at`) por servicio: 7 nuevos campos opcionales en schema. UI con date picker. Auditoria de "cuando se hizo el pago" separada de "cuando se registro en el app".
- **Selector de mes simplificado** en finanzas: `[<] [dropdown grande Abril 2026 ▾] [>]`. Antes habia 3 controles para lo mismo (Mes actual / Mes pasado / dropdown).
- **PWA manifest + iconos**: la app se instala como app standalone en tablet/phone via Chrome "Instalar" o Safari "Agregar a pantalla de inicio". Icono AO navy en home. Camino 1 para tablet kiosk-style de la abuela.

## UI: items diferidos del audit

Los fixes de impacto alto del audit P0/P1 ya estan aplicados (em-dashes, contraste, tap targets, voseo a tuteo, formato de miles, save toast, focus rings en inputs, semantica). Lo que quedo abierto:

- **Modal custom para confirmaciones.** Hoy usa `window.confirm()`. Se ve distinto en cada OS y no respeta el tono. Modal propio en espanol con botones grandes claramente diferenciados (rojo para borrar). Aplica a: borrar mes en finanzas, borrar medicamento, borrar cita, settle de cuentas pendientes.
- **Manejo de errores de red en mutaciones.** Si Convex falla un `await upsert/create/update`, el catch silencioso (o vacio) deja a la cuidadora creyendo que se guardo. Mostrar banner rojo "No se pudo guardar. Revisa tu conexion e intenta de nuevo." El auto-save de finanzas ya tiene `saveStatus: "error"` pero el toast solo aparece brevemente; mejorar.
- **Focus-visible rings en botones.** Faltan rings consistentes en los botones (pills, FAB, bottom nav). Inputs ya tienen.
- ~~**Lista antes que el formulario** en medicamentos y citas.~~ HECHO 2026-05-29: edit inline por card + form Agregar colapsable.

## Tablet kiosk para la abuela (camino 1 elegido, en progreso)

Mauricio quiere una tablet siempre prendida en la habitacion de Ana Maria con `/abuela` como dashboard tipo Echo Show. PWA + iconos ya estan listos. Falta:

- **Wake Lock API en `/abuela`**: JS le pide al sistema "mantene la pantalla prendida" mientras la pagina esta abierta. No depende de settings de la tablet (auto-lock corto, etc.). Compatible Chrome moderno y Safari 16.4+.
- **Layout horizontal grande**: detectar tablet landscape y servir layout especial. Saldo a 80-100px, medicamentos en 2 columnas, sin scroll. Tipo Echo Show.
- **Header de panel**: reloj grande + fecha actual + dia de la semana. Opcional: clima de Bogota via API gratis (OpenWeatherMap free tier, o weatherapi.com).
- **Sugerencia hardware**: Amazon Fire HD 10 (~$150 USD), Samsung Tab A, o reusar tablet vieja. Plug-in 24/7. Fully Kiosk Browser app si se quiere bloquear que toquen otras apps.

## Dark mode

Quitado en la sesion del 2026-05-27 porque el design system Stitch que usamos como referencia es solo-light y nuestra app se veia inconsistente cuando el celular forzaba dark. Hoy `colorScheme: "light"` esta forzado en `app/layout.tsx`.

Si se quiere dark mode mas adelante:
- Armar valores dark acompasados con la paleta clara actual (primary `#2a5c82` → dark `#9ccbf7` o similar).
- Re-introducir el `@media (prefers-color-scheme: dark)` en `globals.css`.
- Probar todos los componentes nuevos (Pill variants, glass-card, icon containers, bottom nav active state).

## Auto-save: edge case de race condition

El debounce en finanzas es 800ms. Si la cuidadora cambia el `selectedMonth` antes de que dispare el save, el cambio se pierde. En la practica casi nunca pasa porque hay que tipear y cambiar de mes en menos de 1 segundo.

Mejora posible: flush del save al detectar `selectedMonth` change si `dirty=true`. O reducir el debounce a 400ms.

## Email deliverability

FROM actual: `onboarding@resend.dev`. Dominio sandbox compartido — puede caer a spam. Para mejorar:
1. Comprar dominio (ej. `losnuestros.app` o usar uno que ya tenga Mauricio).
2. Verificar el dominio en Resend (DNS records).
3. Cambiar `FROM_ADDRESS` en `convex/email.ts`.

Costo: ~$10/ano del dominio. Bastante barato si se quiere que los emails se vean confiables.

## Mas servicios en referencias (escala)

Los 7 servicios actuales (compensar, enel, gas, agua, internet, celular, alarma) estan hardcodeados en `finance_months` como columnas separadas. Si la familia agrega un servicio nuevo (ej. Netflix, jardinero), hay que:
- Agregar columnas al schema.
- Agregar al form.
- Agregar al PreviousMonthStatus.
- Agregar al mapeo en email digest y resumen.

Si esto se vuelve frecuente, considerar:
- Tabla generica `monthly_services` con relacion a `payment_references`.
- Mas flexibilidad pero pierde la rigidez del modelo actual (que es comodo para el caso conocido).

## Ana Maria escribe en el form (no aplica todavia)

Hoy `/abuela` es solo-lectura. Si en algun momento ella puede registrar cosas (con ayuda), pensar:
- Boton "tome mi medicamento" con confirmacion grande.
- Sin opciones de borrar o editar.
- Atribucion clara: "Ana Maria confirmo Atorvastatina 8:15am".

Pospuesto hasta que la familia lo pida.

## Migracion: limpiar campos viejos en finance_months

Despues de la migracion `backfillPaidBy`, los campos `_paid: boolean` viejos siguen existiendo en schema como `v.optional` (para no romper data legacy). Se pueden remover en un commit limpio cuando todos los rows tengan `_paid_by` y `_paid` sea undefined:

```
1. Verificar: query que confirme que ningun row tiene _paid set
2. Editar schema.ts: remover los campos _paid optional
3. Re-deploy convex
4. Eventualmente tambien remover responsible_for de finance_months (ya no se usa)
```

No urgente. Schema con campos extras opcionales no rompe nada.

## setServicePayer mutation: posible cleanup

En la sesion del 2026-05-27 movimos finanzas a un modelo de auto-save donde todo va por `upsert`. La mutation `setServicePayer` (que escribe un solo `_paid_by` + `amount` para un servicio) sigue en `convex/financeMonths.ts` porque la usan los CTAs externos:
- `/app/resumen` (boton "Marcar pagado" en alertas)
- `/app/ingestar` (al confirmar pagos parseados)

Si esos CTAs se rehacen para usar `upsert` con la data completa del mes, `setServicePayer` se puede borrar.
