# Pendientes

Ideas y mejoras que surgen durante el desarrollo. No tienen fecha. Se atacan cuando duele o cuando hay tiempo.

## Notificaciones fuera de la app

Actualmente las alertas de refill (vencido / próximo) solo se ven cuando Ingrid o Sandra abren la app. Si no entran en una semana, no se enteran.

Ideas para sacar las alertas afuera:

- **Email diario con el resumen pendiente**. Más barato y universal. Convex tiene cron jobs (`convex/crons.ts`) que pueden disparar a una hora fija. Para mandar email: Resend (free 100/día) o Mailgun.
- **Notificación push del navegador (PWA + Web Push)**. Sin app store, instalable en celular. Requiere agregar manifest + service worker + VAPID keys.
- **WhatsApp por la Cloud API de Meta**. El canal natural de ellas. Setup más pesado (necesita aprobación de plantilla de mensaje).
- **SMS via Twilio**. Simple pero $$.

Recomendación a futuro: empezar con email, evaluar adopción.

Cobertura ideal: además de alertas de medicamentos, también citas próximas (≤7 días) y pagos por vencer.

## UI: items diferidos del audit

Los fixes de impacto alto ya se aplicaron (em-dashes, contraste WCAG, tap targets, voseo a tuteo, agrupación de finanzas, banner de "Cambios guardados", formato de miles en pesos, CTAs en alertas, restauración de tabs estilo HTML original con tab Resumen como default, atribución siempre visible en historiales). Lo que quedó pendiente:

- **Modal custom para confirmaciones y validaciones.** Hoy usa `window.confirm()` y mensaje inline. El modal nativo se ve distinto en cada OS y no respeta el tono de la app. Modal propio en español con botones grandes claramente diferenciados (rojo para borrar).
- **Lista antes que el formulario en medicamentos y citas.** Hoy el form ocupa la parte alta y empuja la lista. Si la cuidadora abre solo para consultar, tiene que scrollear. Alternativas: form colapsado en acordeón, o lista arriba y form como botón sticky al final.
- **Manejo de errores de red en mutaciones.** Si Convex falla un `await upsert/create/update`, el catch silencioso deja a la cuidadora creyendo que se guardó. Mostrar banner rojo "No se pudo guardar. Revisa tu conexión e intenta de nuevo."
- **Focus-visible rings consistentes en todos los controles.** Ya están en inputs, falta agregar a los botones para teclado/lectores de pantalla.

## Vista de la abuela (super simple, solo-lectura)

Mauricio quiere darle a Ana María su propia entrada a la app. Por el Alzheimer no puede ser complicado; lo que ella siempre pregunta tiene un foco muy claro:

- **Su saldo en el banco** (siempre se preocupa por eso). Tomar el `saldo_banco` del mes en curso del row de `finance_months`, mostrarlo en grande.
- **Qué medicamentos tiene que tomar hoy**. Lista de los 9 medicamentos con dosis y frecuencia, sin fechas de refill ni próximos pasos. Solo qué y cuándo.
- **Sin acciones**. Cero botones de editar, marcar, agregar, borrar. Solo lectura. Texto grande, jerarquía única.

Tres formas de entregarla:
- **Login propio con vista hiper-simplificada.** Otro link de invitación para ella, ruta tipo `/abuela` que solo muestra estas dos cosas. Si las cuidadoras la ayudan a guardar el link en la pantalla de inicio del celular, queda como un acceso directo.
- **Pantalla pública en su habitación.** Tablet vieja siempre encendida en `losnuestros.vercel.app/abuela` (solo-lectura, sin auth, solo la patient default). Funciona como reloj inteligente para Alzheimer.
- **Registro del día (no es la abuela como usuaria, sino una sección extra para las cuidadoras).** Donde Ingrid y Sandra anotan "le di Atorvastatina 8am", "se quejó del estómago", "durmió bien". Sigue siendo útil aunque la abuela no entre.

Decisión pospuesta. Si se retoma, empezar por el camino 1 (login propio para ella) porque resuelve directamente lo que ella pregunta sin requerir hardware nuevo.

## Agente de ingestion (foto + texto → DB)

Hoy cuando llega un recetario nuevo o una cita por WhatsApp, Mauricio se lo pasa a Claude Code, Claude lo parsea y escribe la mutation a mano. Funciona pero requiere developer-in-the-loop.

Idea: un agente que reciba fotos y texto libre directamente desde la app (o un canal dedicado) y haga la ingesta automatica.

Casos de uso vistos hasta ahora:
- **Recetarios de Compensar** (foto): nombre del medicamento, dosis, intervalo, duracion del tratamiento (175-180 dias), medico que prescribe. Mapear a la tabla `medications` (update si ya existe por nombre, crear si no).
- **Mensajes de WhatsApp con citas** (texto libre): "Reumatologia - Mayo 28 - 11 AM, Sede 98 con 11". Parsear especialidad, fecha, hora, lugar. Mapear a `appointments`.
- **Recibos de pago** (foto): valor, servicio, fecha. Mapear a `finance_months` (marcar `_paid = true`, ajustar el monto si difiere del registrado).

Componentes:
- **OCR + extraccion**: Claude Sonnet con vision via Anthropic SDK, prompt con few-shot examples del HTML spec y de la estructura de las tablas Convex.
- **UI de confirmacion**: agente devuelve "voy a insertar esto, OK?". Cuidadora confirma o corrige antes de escribir.
- **Canal**: upload de foto en `/app` (boton "Cargar receta o cita"), o webhook de WhatsApp si en el futuro hay numero dedicado.
- **Idempotencia**: por nombre + fecha para no duplicar.

Decision pospuesta hasta que la ingesta manual se vuelva fricciosa.
