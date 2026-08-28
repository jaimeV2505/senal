# señal

Canal privado de dos personas. Next.js + Vercel KV. Se despliega y vive todo en Vercel.

## Flujo

## Dos caminos distintos, para cada uno

**Para la persona B (la invitada, primera vez):**
1. `/` — clave de entrada compartida (`ENTRY_KEY`).
2. `/welcome` — el mensaje, decodificado letra por letra, con **Sí** / **No**.
   - **Sí** → guarda la elección, dispara la notificación de Telegram, y muestra en pantalla su clave de acceso (`KEY_B`) para copiarla.
   - **No** → guarda igual la elección, sin forzar nada.
3. `/login` — pega su clave (`KEY_B`).
4. `/chat` — pone su frase personal de cifrado la primera vez, y ya queda dentro.

**Para la persona A (quien construyó esto, siempre):**
1. Va directo a `/login` — sin pasar por `/` ni por la bienvenida, esa ceremonia es solo para B.
2. Pega su clave (`KEY_A`).
3. `/chat` — pone su frase personal de cifrado la primera vez (o ya la tiene guardada en su navegador), y entra.

`/login` ya no depende de haber pasado por la puerta de entrada — funciona igual para cualquiera de los dos, en cualquier momento. Guárdate `tu-dominio.vercel.app/login` como acceso directo; no hace falta repetir la bienvenida cada vez.

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

## Qué tan blindado queda esto (auditoría honesta)

Para que decidas con información real, no con humo. Esto es lo que SÍ está protegido y lo que NO puedo prometer:

### Lo que sí está cubierto

- **El texto viaja por HTTPS, pero se guarda en la base de datos sin cifrado propio.** Probamos un esquema de cifrado de extremo a extremo con frase personal, pero se quitó para simplificar el flujo. Mientras tanto, quien tenga acceso al dashboard de Vercel KV puede leer el contenido de los mensajes directamente.
- **Límite de intentos en la clave de entrada y en el login personal.** Máximo 8 intentos fallidos cada 15 minutos por dirección IP — pasado eso, el servidor rechaza el intento aunque la clave sea correcta, hasta que pase la ventana de tiempo. Cierra la puerta a intentos automatizados de adivinar las claves.
- **Alerta por Telegram si alguien agota esos intentos.** Si configuraste `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID`, te llega un aviso apenas se agotan los intentos en la puerta de entrada o el login — señal temprana de que alguien está tratando de forzar la entrada.
- **Headers de seguridad del navegador:** HSTS (fuerza HTTPS incluso si alguien escribe `http://` a mano), bloqueo de sniffing de tipo de contenido, política de referrer restrictiva, y bloqueo de acceso a cámara/micrófono/ubicación desde la página.
- **Mensajes de una sola vista.** Con el interruptor 👁 activado, pasados ~20 segundos desde que la otra persona lo recibe, el contenido se destruye del servidor y queda un rastro "🔥 autodestruido" — no se puede volver a leer ni recuperar.
- **Nadie entra sin las claves.** `ENTRY_KEY` para la bienvenida, `KEY_A`/`KEY_B` para el chat.
- **Todo se autodestruye solo** pasado el tiempo que definas (TTL), sin que nadie tenga que borrar nada a mano.
- **Fotos y videos se borran** junto con su mensaje (aunque ver el punto de abajo sobre estos).

### Lo que NO puedo prometer (para que no haya sorpresas)

- **Fotos y video no están cifradas ni requieren sesión para verse.** Viven en Vercel Blob, accesibles directamente por su URL (larga y aleatoria, difícil de adivinar, pero no protegida por login). Si alguien consigue esa URL exacta antes de que se borre, puede verla sin necesidad de las claves.
- **No hay CSP (Content-Security-Policy) estricta todavía.** Agregar una CSP bien hecha reduce el riesgo de inyección de scripts, pero una mal calibrada puede romper la app (fuentes, subida de archivos, etc.) — y no tengo forma de probarla en vivo antes de mandártela. Se puede agregar más adelante iterando con cuidado si quieres ese nivel extra.
- **"No se puede copiar" tiene un límite real.** Bloqueamos clic derecho y el evento de copiar, pero cualquiera con las herramientas de desarrollador del navegador puede ver el contenido igual — cierto en cualquier página web, no hay forma de evitarlo del todo desde un navegador.
- **La seguridad de la cuenta de Vercel y GitHub importa más que cualquier código.** Cualquiera que entre a tu cuenta de Vercel puede ver las variables de entorno (`KEY_A`, `KEY_B`, `ENTRY_KEY`) y desconectar todo. Activa verificación en dos pasos en Vercel y GitHub, y mantén el repo en **privado**.
- **Rota las claves antes de ir en serio.** Las claves de prueba que generamos en esta conversación de chat quedaron escritas en ese historial — trátalas como ya vistas por más de ustedes dos. Antes de considerar esto "en vivo" de verdad, genera un set nuevo de `ENTRY_KEY`, `KEY_A`, `KEY_B`.
- **`AUTH_SECRET` no rota solo.** Si algún día sospechan que se filtró, cámbienlo en Vercel — invalida todas las sesiones activas al instante (ambos tendrían que volver a loguearse).
- **La sesión dura 30 días.** Cómodo para no repetir el login, pero significa que un dispositivo desbloqueado y robado tiene acceso directo sin volver a pedir clave. Si prefieren más seguridad que comodidad, se puede acortar (avísame y lo ajusto).

### Antes de considerar esto "en vivo"

1. Genera un set nuevo de claves de login (no las que usamos para probar).
2. Ve a `/dev` y toca **[ REINICIAR TODO ]** una última vez.
3. Cambia `DEV_MODE` a `false`.
4. Confirma que el repo de GitHub esté en privado.
5. Activa verificación en dos pasos en tu cuenta de Vercel y de GitHub.

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
