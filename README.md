# Front_WEB_PLAG — Frontend de SmartTrip

Aplicación web en **React 18 + Vite** que consume el backend [`Back_Plang`](https://github.com/lRicardol/Back_Plang) (Spring Boot). Este README explica cómo ejecutarla **en local**, sin depender de AWS ni de servicios en la nube.

---

## Requisitos

| Herramienta | Versión | Cómo comprobarla |
|---|---|---|
| Node.js + npm | 20 o superior | `node -v` |
| Backend `Back_Plang` | corriendo con el perfil `local` en `http://localhost:8080` | ver Paso 1 |
| Git | cualquiera | `git --version` |

Los comandos funcionan igual en **Windows** (PowerShell o Git Bash), **macOS** y **Linux**.

---

## Paso 1 — Ejecutar el backend primero

El frontend necesita el backend activo. Sigue el README de [`Back_Plang`](https://github.com/lRicardol/Back_Plang); en resumen:

```bash
git clone https://github.com/lRicardol/Back_Plang.git
cd Back_Plang
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

Comprueba que responde: http://localhost:8080/actuator/health → `{"status":"UP"}`.

---

## Paso 2 — Configurar el frontend

```bash
git clone https://github.com/lRicardol/Front_WEB_PLAG.git
cd Front_WEB_PLAG
npm install
```

### Archivo `.env`

El repositorio incluye un [`.env.example`](.env.example) con la configuración para el backend local. Cópialo como `.env`:

```bash
# macOS / Linux / Git Bash
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env
```

Contenido:

```env
# Backend local (perfil local: API en la raíz, sin /api/v1)
VITE_API_BASE_URL=http://localhost:8080

# Chat en tiempo real (STOMP/WebSocket)
VITE_WS_BROKER_URL=ws://localhost:8080/ws-chat
```

El `.env` no se sube al repositorio (está en el `.gitignore`); el `.env.example` sí, porque no contiene secretos.

---

## Paso 3 — Ejecutar el frontend

```bash
npm run dev
```

Vite levanta la aplicación en **http://localhost:5173**.

## Flujo rápido de prueba

1. Backend encendido → http://localhost:8080/actuator/health responde `UP`.
2. Frontend encendido → abre http://localhost:5173.
3. **Regístrate** y luego **inicia sesión con usuario y contraseña**. El inicio de sesión con Google no funciona en local porque requiere credenciales de Google Cloud que no se guardan en el repositorio.
4. Crea un plan de viaje, agrégale actividades y revísalo en "Mis viajes" y en el calendario.

## Ejecutar las pruebas

```bash
npm run test:run
```

> Con Node 25 o superior, ejecuta `NODE_OPTIONS=--no-experimental-webstorage npm run test:run` (en PowerShell: `$env:NODE_OPTIONS="--no-experimental-webstorage"; npm run test:run`). Esas versiones de Node traen un `localStorage` propio que interfiere con el de las pruebas.

## Notas

- `scripts/deploy-web-client-manual.sh` y `nginx.conf` son del despliegue en AWS del semestre anterior y no se usan en local.
- El asistente de IA (`VITE_AI_SERVICE_BASE_URL`) depende de un microservicio que no está incluido en este proyecto; si no se configura, esa sección muestra un error controlado sin afectar el resto de la aplicación.

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


