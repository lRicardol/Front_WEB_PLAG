# Front_WEB_PLAG — Frontend Tourism Intelligent Platform

Aplicación web en **React 18 + Vite** que consume el backend [`Back_Plang`](https://github.com/lRicardol/Front_WEB_PLAG) (Spring Boot) corriendo en local. Este README explica cómo levantar todo el stack en **Windows** sin depender de AWS ni de servicios en la nube.

> Los scripts de `scripts/` (p. ej. `deploy-web-client-manual.sh`) y `nginx.conf` son solo para despliegue en producción y **no se usan en desarrollo local**.

---

## Requisitos previos

| Herramienta | Versión | Notas |
|---|---|---|
| Node.js + npm | 18+ (recomendado 20/22 LTS) | Necesario para Vite |
| Backend `Back_Plang` | — | Debe estar corriendo con el perfil `local` en `http://localhost:8080` |
| Git Bash o PowerShell | — | Comandos en sintaxis Bash |

Si no tienes Node.js instalado globalmente, puedes usar una copia portable (ej. `~/tools/node/node.exe`).

---

## Paso 1 — Encender el Backend primero

El frontend necesita el backend activo. En el repo `Back_Plang`:

```bash
cd "C:\Users\richa\PycharmProjects\Back_Plang"

# Solo si no tienes java/mvn en el PATH:
export JAVA_HOME="/c/Program Files/JetBrains/PyCharm 2026.2.3/jbr"
export PATH="$JAVA_HOME/bin:$HOME/tools/apache-maven-3.9.16/bin:$PATH"

mvn spring-boot:run -Dspring-boot.run.profiles=local
```

Con el perfil `local` el backend:

- Sirve la API en la raíz: `http://localhost:8080` (sin prefijo `/api/v1`).
- Usa **H2 en memoria** (no requiere PostgreSQL).
- Tiene **Amadeus en modo mock** y **CORS + WebSockets habilitados** para `http://localhost:5173`.
- Expone Swagger UI en `http://localhost:8080/swagger-ui/index.html`.

Verifica que responde: `curl http://localhost:8080/actuator/health` → `{"status":"UP"}`.

---

## Paso 2 — Configurar el Frontend

### 2.1 Instalar dependencias

```bash
cd "C:\Users\richa\PycharmProjects\Front_WEB_PLAG"
npm install
```

### 2.2 Archivo `.env`

El proyecto ya incluye un `.env` configurado para el backend local. Si lo recreas, usa:

```env
# Backend local (Back_Plang, perfil `local` — API en la raíz, SIN /api/v1)
VITE_API_BASE_URL=http://localhost:8080

# Chat en tiempo real (STOMP/WebSocket)
VITE_WS_BROKER_URL=ws://localhost:8080/ws-chat

# OPCIONAL: microservicio de IA FastAPI (no incluido en el backend local)
# VITE_AI_SERVICE_BASE_URL=http://localhost:8000/api/v1
```

> **Importante**: `VITE_API_BASE_URL` debe apuntar a `http://localhost:8080` **sin** `/api/v1`, porque el perfil `local` del backend sirve la API en la raíz. El código (`src/services/api.js`) usa esta variable como `baseURL` de Axios.
>
> El asistente de IA (`src/services/aiMicroservice.js`) apunta por defecto a `/api/v1` del propio Vite si no defines `VITE_AI_SERVICE_BASE_URL`; sus funciones mostrarán un error controlado (404) pero **no rompen la app**.

---

## Paso 3 — Arrancar el Frontend

```bash
npm run dev
```

Vite levanta el servidor de desarrollo en **http://localhost:5173** (puerto fijo configurado en `vite.config.js`).

La conexión es **directa** (sin proxy): el navegador llama a `http://localhost:8080` y el backend ya autoriza CORS desde `http://localhost:*`.

---

## Flujo rápido de prueba

1. Backend arriba → `http://localhost:8080/actuator/health` responde `UP`.
2. Frontend arriba → abre http://localhost:5173.
3. **Registra un usuario o inicia sesión** desde la UI (`/login`). Internamente llama a `POST http://localhost:8080/users/register` o `/users/login`.
4. Verifica la integración:
   - DevTools → Network: peticiones a `http://localhost:8080/...` con `Authorization: Bearer <token>` tras el login.
   - Consola H2 del backend (`http://localhost:8080/h2-console`, JDBC `jdbc:h2:mem:tourism_platform`, user `sa`): `SELECT * FROM users;` muestra el usuario creado.
   - Swagger UI (`http://localhost:8080/swagger-ui/index.html`): los endpoints responden 200/201.

---

## Notas

- **Login con Google**: en local el backend no tiene credenciales de Google; el botón existe pero el flujo OAuth no completará. Usa login con usuario/contraseña.
- **Chat en tiempo real**: usa `VITE_WS_BROKER_URL=ws://localhost:8080/ws-chat` (SockJS/STOMP). Si la variable no está definida, el chat funciona solo por REST.
- **Datos**: H2 es en memoria; cada reinicio del backend borra los usuarios. El token JWT se guarda en `localStorage` (`voyager_token`).
- **Scripts de despliegue**: `scripts/deploy-web-client-manual.sh` y `nginx.conf` son solo para producción; no los ejecutes en local.
