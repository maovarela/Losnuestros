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

## Tercer "usuario": la abuela

Mauricio quiere explorar incluir a Ana María de alguna forma. Tres caminos posibles, ordenados de más a menos viable dado el Alzheimer:

- **Registro del día con la abuela (más realista).** No es la abuela como usuaria. Es una sección nueva donde Ingrid y Sandra anotan "le di Atorvastatina 8am", "se quejó del estómago", "durmió bien". Cierra el gap real: las cuidadoras no se enteran de lo que hizo la otra durante el día. Bajo riesgo, alta utilidad. Probablemente un schema `daily_notes` con fecha, texto, autora, timestamp.
- **Pantalla pública en su habitación.** Tablet vieja siempre encendida en la URL `losnuestros.vercel.app/dia` (solo-lectura, sin auth). Fecha grande, próxima pastilla, próxima cita. No es ella usuaria, es información ambiental. Sirve mejor que pedirle que recuerde abrir una app. Requiere una tablet.
- **Login propio para ella (más dudoso).** Otro link de invitación, vista hiper-simplificada con solo "hoy". Por el Alzheimer es difícil que lo use con consistencia y aprenda a navegar. Bajo retorno por la inversión.

Decisión pospuesta. Si se retoma, empezar por el primero.
