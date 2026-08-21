# señal

Canal privado de dos personas. Next.js + Vercel KV. Se despliega y vive todo en Vercel.

## Flujo

1. `/` — clave de entrada compartida (`ENTRY_KEY`), la que le das a la otra persona.
2. `/welcome` — el mensaje se decodifica letra por letra. Botones **Sí** / **No**, los dos funcionan de verdad:
   - **Sí** → guarda la elección y la hora en la base de datos (así ves de tu lado si respondió), y muestra "las instrucciones llegan pronto" con acceso al login.
   - **No** → guarda igual la elección (para que sepas que vio el mensaje), pero no fuerza nada ni intenta que cambie de opinión.
3. `/login` — clave personal (`KEY_A` o `KEY_B`) para identificarse como una de las dos personas.
4. `/chat` — conversación real. Polling cada 3s, marca de "visto", y cada mensaje se autodestruye pasado `MESSAGE_TTL_SECONDS`.

## Desplegar

1. Sube esta carpeta a un repo de GitHub (privado, idealmente).
2. En [vercel.com](https://vercel.com) → **Add New Project** → importa el repo.
3. Antes del primer deploy, ve a **Storage**:
   - **Create Database** → **KV** (Upstash) y conéctala. Agrega solas `KV_REST_API_URL` y `KV_REST_API_TOKEN`.
   - **Create Database** → **Blob** y conéctala también. Agrega sola `BLOB_READ_WRITE_TOKEN`. Esto es lo que permite mandar fotos y videos.
4. En **Settings → Environment Variables**, agrega:
   - `AUTH_SECRET` — cadena aleatoria larga (ej. `openssl rand -base64 48` en tu terminal).
   - `ENTRY_KEY` — la clave que le compartes a la otra persona para la pantalla de bienvenida.
   - `KEY_A` y `KEY_B` — las claves personales de cada uno para el login.
   - `MESSAGE_TTL_SECONDS` — opcional, por defecto 86400 (24h).
   - `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID` — opcional, pero es como te llega la notificación instantánea de "sí" fuera de la app. Ver instrucciones abajo.
5. Deploy.

## Mientras están probando (antes de ir en serio)

Agrega `DEV_MODE=true` en las variables de entorno. Esto habilita `/dev`: una página con un botón **[ REINICIAR TODO ]** que borra la respuesta de bienvenida, todos los mensajes (con sus fotos/videos), y cierra la sesión de tu navegador — así puedes probar el flujo completo desde cero (bienvenida → sí/no → login → chat) sin tener que hacer un deploy nuevo cada vez.

**El día que esto quede en vivo de verdad entre ustedes dos**, cambia `DEV_MODE` a `false` (o bórralo) en Vercel y redeploy. Con eso, `/dev` deja de funcionar — nadie puede resetear la conversación por accidente ni a propósito.

## Si algo no envía (mensajes o fotos/video)

Ahora los errores reales se muestran en rojo debajo del cuadro de texto en vez de un mensaje genérico. Las causas más comunes:

- **Fotos/video fallan pero el texto funciona:** casi siempre es que falta conectar **Storage → Create Database → Blob** en Vercel (o falta la variable `BLOB_READ_WRITE_TOKEN`).
- **Nada se envía, ni texto:** revisa que **Storage → KV** esté conectado y que `KV_REST_API_URL` / `KV_REST_API_TOKEN` existan en Environment Variables.
- Cualquier cambio en variables de entorno necesita un **Redeploy** para tomar efecto (no basta con guardarlas).

## Configurar la notificación de "sí" (Telegram)

Sin esto, la respuesta igual queda guardada y visible en el chat, pero no llega ningún aviso fuera de la app. Con esto, te llega al instante a tu Telegram apenas la otra persona toque "Sí" (o "No").

1. En Telegram, busca **@BotFather** y mándale `/newbot`. Sigue las instrucciones (nombre del bot, username). Te da un token tipo `123456:ABC-...` — ese es tu `TELEGRAM_BOT_TOKEN`.
2. Busca a tu bot nuevo por su username y mándale cualquier mensaje (ej: "hola").
3. Abre en el navegador: `https://api.telegram.org/bot<TU_TOKEN>/getUpdates` (reemplaza `<TU_TOKEN>` por el token real).
4. Busca en el JSON el número dentro de `"chat": { "id": ... }` — ese es tu `TELEGRAM_CHAT_ID`.
5. Agrega ambos valores en Vercel → Settings → Environment Variables, y redeploy.

## Qué tan privado es esto en realidad

Para que lo uses con expectativas correctas, no por desconfianza:

- **Nadie puede entrar sin las claves.** Sin `ENTRY_KEY` no se llega ni a la pantalla de bienvenida; sin `KEY_A`/`KEY_B` no se llega al chat.
- **Los mensajes se autodestruyen solos** pasado el tiempo que definas (TTL en Redis), sin que nadie tenga que borrarlos a mano.
- **"Bloqueado a solo copiar" tiene un límite real:** deshabilité el menú de clic derecho y el evento de copiar en la interfaz, lo cual detiene a alguien casual. Pero cualquiera con las herramientas de desarrollador del navegador (F12) puede ver el texto igual — eso es cierto en *cualquier* página web, no hay forma de evitarlo del todo en un navegador. Si de verdad necesitas que el contenido no pueda salir de ahí bajo ningún escenario, la única vía real es no mostrarlo en un navegador normal, y eso ya es otro tipo de proyecto.
- **No se registra IP ni ubicación de nadie.** Solo se guarda: quién eligió qué en la bienvenida, y a qué hora, exactamente lo que la persona sabe que está pasando cuando hace clic.
- **Fotos y videos también se autodestruyen** junto con el mensaje al que pertenecen — no quedan huérfanos en el almacenamiento.

## Estructura

```
app/
  page.js              → puerta de entrada (clave compartida)
  welcome/              → mensaje + confirmación sí/no
  login/                → clave personal (A o B)
  chat/                 → el chat real
  api/
    entry/               → valida ENTRY_KEY
    welcome-response/    → guarda y consulta la elección sí/no
    auth/                → login personal → sesión
    messages/            → enviar/leer mensajes (texto, foto, video; TTL y "visto")
    upload/               → autoriza subidas directas a Vercel Blob
    logout/
lib/
  auth.js               → sesiones firmadas (JWT en cookie httpOnly)
  kv.js                 → cliente de Vercel KV
```
