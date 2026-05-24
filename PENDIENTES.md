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

Los fixes de impacto alto ya se aplicaron (em-dashes, contraste WCAG, tap targets, voseo a tuteo, agrupación de finanzas, atribución filtrada al otro cuidador, banner de "Cambios guardados"). Lo que quedó pendiente:

- **Modal custom para confirmaciones y validaciones.** Hoy usa `window.confirm()` y mensaje inline. El modal nativo se ve distinto en cada OS y no respeta el tono de la app. Modal propio en español con botones grandes claramente diferenciados (rojo para borrar).
- **Formato de miles en los inputs de pesos.** El usuario escribe `4299866` y ve un número sin separadores, difícil de verificar. Solución: input `type="text"` controlado con `inputMode="numeric"` que formatea al perder foco (`4.299.866`).
- **Lista antes que el formulario en medicamentos y citas.** Hoy el form ocupa la parte alta y empuja la lista. Si la cuidadora abre solo para consultar, tiene que scrollear. Alternativas: form colapsado en acordeón, o lista arriba y form como botón sticky al final.
- **Manejo de errores de red en mutaciones.** Si Convex falla un `await upsert/create/update`, el catch silencioso deja a la cuidadora creyendo que se guardó. Mostrar banner rojo "No se pudo guardar. Revisa tu conexión e intenta de nuevo."
- **Focus-visible rings consistentes en todos los controles.** Ya están en inputs, falta agregar a los botones para teclado/lectores de pantalla.
