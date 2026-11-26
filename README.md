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

## Punto de partida y código reutilizado

Este frontend es la **evolución de un proyecto existente**: la plataforma SmartTrip, desarrollada el semestre anterior (2026-1) por un equipo de 5 integrantes. En la asignatura Ingeniería de Software la retoman 3 integrantes.

**Estado inicial:** tag [`v0-estado-inicial`](https://github.com/lRicardol/Front_WEB_PLAG/tree/v0-estado-inicial) (commit `8accadb`, 11 de noviembre de 2026). Para ver todo lo que cambió desde entonces: [comparar v0-estado-inicial con main](https://github.com/lRicardol/Front_WEB_PLAG/compare/v0-estado-inicial...main).

**Qué se heredó (ya existía al iniciar la asignatura):**
- Aplicación React + Vite con registro e inicio de sesión, planes de viaje, actividades, calendario, módulo social y chat.
- Pruebas automatizadas con Vitest y Testing Library.

**Qué se agregó o cambió en la asignatura:**
- Análisis estático con SonarCloud en GitHub Actions, con cobertura de pruebas (`.github/workflows/sonarqube-analysis.yml`).
- Análisis de dependencias con OWASP Dependency-Check en GitHub Actions, con reporte HTML y alertas en Security (`.github/workflows/dependency-check.yml`).
- Alertas y actualizaciones de seguridad de Dependabot.
- Corrección de dependencias vulnerables: actualización de axios y migración a vite 8, vitest 5, @vitejs/plugin-react 6 y react-router-dom 7 (`npm audit`: 0 vulnerabilidades).
- Corrección de una prueba con fecha fija vencida (CalendarPage).
- Corrección de un defecto en el inicio de sesión: el usuario quedaba vacío y la pantalla Comunidad no cargaba.

## Librerías de terceros y licencias

Principales dependencias directas. Todas tienen licencias de código abierto que permiten su uso en este proyecto.

**Dependencias de la aplicación**
- react 18.3 y react-dom 18.3 — MIT
- react-router-dom 7.18 — MIT
- axios 1.21 — MIT
- @stomp/stompjs 7.3 — Apache-2.0
- lucide-react 0.279 — ISC

**Dependencias de desarrollo y pruebas**
- vite 8.3 y @vitejs/plugin-react 6.3 — MIT
- vitest 5.1 y @vitest/coverage-v8 5.1 — MIT
- @testing-library/react 16.3 — MIT
- jsdom 25.0 — MIT
- eslint 8.57 — MIT

La lista completa de dependencias (incluidas las transitivas) está en `package-lock.json`.


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


