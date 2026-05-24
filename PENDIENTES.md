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
