# Pendientes

Ideas y mejoras que surgen durante el desarrollo. No tienen fecha. Se atacan cuando duele o cuando hay tiempo.

## Hecho (refleja lo entregado a 2026-05-27)

Para no perder memoria de lo que ya se construyo:

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

## UI: items diferidos del audit

Los fixes de impacto alto del audit P0/P1 ya estan aplicados (em-dashes, contraste, tap targets, voseo a tuteo, formato de miles, save toast, focus rings en inputs, semantica). Lo que quedo abierto:

- **Modal custom para confirmaciones.** Hoy usa `window.confirm()`. Se ve distinto en cada OS y no respeta el tono. Modal propio en espanol con botones grandes claramente diferenciados (rojo para borrar). Aplica a: borrar mes en finanzas, borrar medicamento, borrar cita, settle de cuentas pendientes.
- **Lista antes que el formulario** en medicamentos y citas. Hoy el form ocupa la parte alta y empuja la lista. Si la cuidadora abre solo para consultar, scrollea. Alternativas: form colapsado en acordeon, o lista arriba y form como boton sticky al final.
- **Manejo de errores de red en mutaciones.** Si Convex falla un `await upsert/create/update`, el catch silencioso (o vacio) deja a la cuidadora creyendo que se guardo. Mostrar banner rojo "No se pudo guardar. Revisa tu conexion e intenta de nuevo." El auto-save de finanzas ya tiene `saveStatus: "error"` pero el toast solo aparece brevemente; mejorar.
- **Focus-visible rings en botones.** Faltan rings consistentes en los botones (pills, FAB, bottom nav). Inputs ya tienen.

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
