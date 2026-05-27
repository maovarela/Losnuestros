# Onboarding

Como empezar a trabajar en este proyecto si nunca lo abriste antes.

## Primera vez (setup)

1. **Instalar Node.js** (version 20 o mas). <https://nodejs.org/>
2. **Instalar Git**. <https://git-scm.com/downloads>
3. **Clonar el repo** (en la terminal):
   ```
   git clone https://github.com/maovarela/Losnuestros.git
   cd Losnuestros
   npm install
   ```
4. **Pedirle a Mauricio el archivo `.env.local`** con las claves de Convex y SESSION_SECRET. Sin esto la app no arranca local.
5. Instalar Claude Code: <https://docs.claude.com/claude-code>
6. Abrir el repo en VS Code o tu editor.

## Cada vez que vas a trabajar

```
cd Losnuestros
git pull            # trae los ultimos cambios
npm run dev         # arranca la app local en http://localhost:3000
claude              # abre Claude Code en la terminal
```

Ahora le pedis a Claude lo que quieras cambiar.

## Comandos utiles

```
npm run dev         arranca la app local
npm run build       prueba que no haya errores
git status          ve que archivos tocaste
git diff            ve exactamente que cambio
git log             historial de commits
```

Para commits, push, rollback, etc. mejor pedirle a Claude que lo haga por vos para evitar errores.

## Si algo se rompe

1. Pedile a Claude: "esto no funciona: [pega el error]"
2. Si despues de un push prod esta roto: pedile "deshace el ultimo commit y pushea"
3. Si nada anda: WhatsApp a Mauricio con el screenshot del error

## Que cosas se pueden tocar

Mira `CLAUDE.md` seccion **"Para empezar"** para la guia completa. Resumen:

- **Sin riesgo:** copy/textos, colores, espaciado, agregar campos a forms
- **Pensar bien:** schema de DB, auth, crons
- **Pedir aprobacion de Mauricio:** borrar features, cambios destructivos

## Datos sensibles

La app maneja info medica y financiera real de Ana Maria. Reglas:

- No compartir screenshots con datos visibles fuera de la familia.
- No subir las claves de `.env.local` a ningun lado.
- No agregar integraciones externas (servicios que reciben datos) sin avisar a Mauricio.
