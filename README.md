# señal

Canal privado de dos personas. Next.js + Vercel KV. Se despliega y vive todo en Vercel.

## Flujo

1. `/` — clave de entrada compartida (`ENTRY_KEY`), la que le das a la otra persona.
2. `/welcome` — el mensaje se decodifica letra por letra. Botones **Sí** / **No**, los dos funcionan de verdad:
   - **Sí** → guarda la elección y la hora, dispara la notificación de Telegram, y **muestra en pantalla la clave personal de acceso (`KEY_B`)** con un botón para copiarla, lista para usarse en el login.
   - **No** → guarda igual la elección (para que sepas que vio el mensaje), pero no fuerza nada ni intenta que cambie de opinión.
3. `/login` — clave personal (`KEY_A` o `KEY_B`) para identificarse como una de las dos personas.
4. `/chat` — conversación real, cifrada de extremo a extremo. Polling cada 3s, marca de "visto", mensajes de una vista, y cada mensaje se autodestruye pasado `MESSAGE_TTL_SECONDS`.

**Nota sobre el paso 2:** la clave que se revela siempre es `KEY_B` — se asume que quien construye y despliega esto es la persona A (que ya tiene ambas claves de antemano), y quien responde la bienvenida por primera vez es la persona B, que todavía no tiene ninguna clave hasta ese momento. La revelación solo ocurre después de que la respuesta guardada en el servidor sea "sí" — no se puede obtener saltándose el flujo.

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

- **El texto viaja y se guarda cifrado de extremo a extremo, sin que tengan que ponerse de acuerdo en nada por fuera.** Cada persona genera su propia llave privada en su navegador (nunca sale de ahí); solo la llave pública sube al servidor. Cuando ambas llaves públicas están disponibles, cada navegador combina su propia llave privada con la pública de la otra persona (intercambio Diffie-Hellman sobre curva elíptica — la misma técnica detrás de Signal) y las dos llegan, por separado, a la misma llave de cifrado. El servidor y la base de datos (Vercel KV) solo almacenan el bloque ya cifrado — nunca ven el texto ni la llave que lo descifra.
- **Mensajes de una sola vista.** Con el interruptor 👁 activado, en cuanto la otra persona lo recibe, el contenido se destruye del servidor y queda un rastro "🔥 autodestruido" — no se puede volver a leer ni recuperar.
- **Nadie entra sin las claves.** `ENTRY_KEY` para la bienvenida, `KEY_A`/`KEY_B` para el chat.
- **Todo se autodestruye solo** pasado el tiempo que definas (TTL), sin que nadie tenga que borrar nada a mano.
- **Fotos y videos se borran** junto con su mensaje (aunque ver el punto de abajo sobre estos).

### Lo que NO puedo prometer (para que no haya sorpresas)

- **Fotos y video NO están cifradas.** Viven en Vercel Blob como archivos accesibles por su URL (una URL larga y aleatoria, difícil de adivinar, pero no cifrada). Si alguien consigue esa URL exacta antes de que se borre, puede verla. El texto sí está cifrado; las imágenes/videos, por ahora, dependen de que la URL sea difícil de adivinar, no de cifrado real.
- **"No se puede copiar" tiene un límite real.** Bloqueamos clic derecho y el evento de copiar, pero cualquiera con las herramientas de desarrollador del navegador puede ver el contenido igual — cierto en cualquier página web, no hay forma de evitarlo del todo desde un navegador.
- **Si borran los datos del navegador (o cambian de dispositivo), pierden su llave privada.** No hay "recuperar llave" — es la idea, nadie más la tiene guardada en ningún lado, ni nosotros. Si eso pasa, ese navegador genera una llave nueva automáticamente la próxima vez que entre, pero los mensajes cifrados con la llave anterior quedan ilegibles para siempre (mostrarán "no se pudo descifrar"). Usa `/dev` → reiniciar todo si estás probando y quieres empezar de cero.
- **La primera vez, alguien tiene que esperar a que el otro entre.** Hasta que las dos llaves públicas existan en el servidor, no hay con qué cifrar — verán una pantalla de "armando el cifrado" hasta que ambos hayan entrado al chat al menos una vez.
- **La seguridad de la cuenta de Vercel y GitHub importa.** Cualquiera que entre a tu cuenta de Vercel puede ver las variables de entorno (`KEY_A`, `KEY_B`, `ENTRY_KEY`) y desconectar todo. Activa verificación en dos pasos en Vercel y GitHub, y mantén el repo en **privado**.
- **Rota las claves antes de ir en serio.** Las claves de prueba que generamos en esta conversación de chat quedaron escritas en este historial — trátalas como ya vistas por más de ustedes dos. Antes de considerar esto "en vivo" de verdad, genera un set nuevo de `ENTRY_KEY`, `KEY_A`, `KEY_B` y la frase de cifrado, y no las compartas por el mismo medio donde las generaste.
- **`AUTH_SECRET` no rota solo.** Si algún día sospechan que se filtró, cámbienlo en Vercel — invalida todas las sesiones activas al instante (ambos tendrían que volver a loguearse).

### Antes de considerar esto "en vivo"

1. Genera un set nuevo de claves (no las que usamos para probar).
2. Ve a `/dev` y toca **[ REINICIAR TODO ]** una última vez, para que ambos generen su llave de cifrado definitiva desde cero (no la que usaste mientras probabas).
3. Cambia `DEV_MODE` a `false`.
4. Confirma que el repo de GitHub esté en privado.

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
