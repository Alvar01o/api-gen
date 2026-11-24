# api-dyn

> Upload a SQL schema. Get a REST API. Instantly.

**api-dyn** provisiona bases de datos y genera APIs REST completamente documentadas a partir de un schema SQL — MySQL o PostgreSQL — en segundos. Sin archivos de configuración. Sin código repetitivo.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| API | Express 5 · TypeScript |
| ORM | MikroORM 6 (PostgreSQL) |
| Queue | BullMQ · Redis |
| Bases de datos destino | MySQL 8 · PostgreSQL 10+ |
| Frontend | React 18 · Vite · React Router v6 |
| Seguridad | JWT · bcryptjs · helmet · express-rate-limit |
| Email | Nodemailer (SMTP / Gmail) |
| i18n | 4 idiomas: en · es · fr · pt |
| Contenedores | Docker · Docker Compose v2 |
| Monitoreo | Prometheus · Grafana · cAdvisor · Node Exporter · Blackbox Exporter |

---

## Servicios

| Container | Puerto | Descripción |
|---|---|---|
| `api-dyn-api` | 3000 | REST API principal + WebSocket |
| `api-dyn-worker` | — | BullMQ worker — procesa jobs de schema |
| `api-dyn-lambda` | 4000 | Router CRUD dinámico (serverless) |
| `api-dyn-frontend` | 5173 | React UI (Vite, hot reload) |
| `api-dyn-app-db` | 5433 | PostgreSQL 17 — base de datos de la aplicación |
| `api-dyn-postgres` | 5432 | PostgreSQL 10 — target para schemas de usuarios |
| `api-dyn-mysql` | 3306 | MySQL 8 — target para schemas de usuarios |
| `api-dyn-redis` | 6379 | Queue + pub/sub |
| `api-dyn-prometheus` | 9090 | Recopilación y almacenamiento de métricas |
| `api-dyn-grafana` | 3001 | Dashboards de monitoreo (UI web) |
| `api-dyn-node-exporter` | 9100 | Métricas del host: CPU, RAM, disco, red |
| `api-dyn-cadvisor` | 8080 | Métricas por contenedor |
| `api-dyn-blackbox` | 9115 | Probe HTTP: uptime y latencia de servicios |

Los servicios arrancan en orden mediante healthchecks: primero las bases de datos y Redis, luego `api` y `worker`.

---

## Quick Start

### 1. Clonar y configurar variables de entorno

```bash
git clone https://github.com/Alvar01o/api-dyn.git
cd api-dyn
cp .env.example .env   # completar con tus valores
```

### 2. Levantar el stack completo

```bash
docker compose up --build
```

### 3. Acceder

| URL | Descripción |
|-----|-------------|
| http://localhost:5173 | Interfaz web (Landing) |
| http://localhost:5173/login | Login |
| http://localhost:5173/app | Dashboard (requiere auth) |
| http://localhost:5173/contact | Formulario de contacto |
| http://localhost:5173/health | Estado de los servicios |
| http://localhost:5173/lambda | Docs del Lambda Service |
| http://localhost:3000/api-docs | Swagger UI de la API |
| http://localhost:4000/docs | Swagger UI del Lambda |
| http://localhost:3001 | Grafana — dashboards de monitoreo |
| http://localhost:9090 | Prometheus — métricas raw y queries |
| http://localhost:8080 | cAdvisor — recursos por contenedor |

---

## Variables de entorno

Crear `.env` a partir de `.env.example`. Variables clave:

```env
# ── Admin inicial (se crea al levantar si no existe) ─────────────────────────
ADMIN_EMAIL=admin@apidyn.dev
ADMIN_PASSWORD=Admin1234!

# ── Autenticación JWT (compartido entre API y Lambda) ────────────────────────
JWT_SECRET=super-secret-change-in-prod

# ── APIs serverless con auth (Lambda) ────────────────────────────────────────
LAMBDA_AUTH_PREFIX=auth-api-dyn          # prefijo del endpoint de login generado
JWT_EXPIRES_IN=8h                        # expiración de tokens emitidos por el Lambda

# ── Anthropic (Claude API) — detección de tabla de usuarios ──────────────────
ANTHROPIC_API_KEY=sk-ant-...

# ── Base de datos de la aplicación (app-db) ──────────────────────────────────
APP_DB_HOST=app-db
APP_DB_PORT=5432
APP_DB_USER=app
APP_DB_PASSWORD=apppass
APP_DB_NAME=appdyn

# ── PostgreSQL target (schemas de usuarios) ───────────────────────────────────
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_USER=dev
POSTGRES_PASSWORD=devpass

# ── MySQL target ──────────────────────────────────────────────────────────────
MYSQL_HOST=mysql
MYSQL_PORT=3306
MYSQL_USER=dev
MYSQL_PASSWORD=devpass

# ── Redis ─────────────────────────────────────────────────────────────────────
REDIS_HOST=redis
REDIS_PORT=6379

# ── SMTP (formulario de contacto) ─────────────────────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
CONTACT_TO_EMAIL=tu@gmail.com

# ── Comportamiento del schema ─────────────────────────────────────────────────
DELETE_SCHEMA_AFTER_APPLY=true
SCHEMA_DROP_DB_ON_FAILURE=true
SCHEMA_FAIL_IF_DB_EXISTS=true
SCHEMA_USE_TRANSACTION=true
SCHEMA_ENABLE_SQL_GUARD=true
SCHEMA_DRY_RUN=false
SCHEMA_ENABLE_IDEMPOTENCY=true
SCHEMA_DEDUPLICATE_BY_HASH=true

# ── Rate limiting ─────────────────────────────────────────────────────────────
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=10

# ── CORS ──────────────────────────────────────────────────────────────────────
CORS_ORIGIN=*

# ── Monitoreo ─────────────────────────────────────────────────────────────────
GRAFANA_PASSWORD=admin
```

---

## Multi-tenancy

Un **usuario** puede tener múltiples **tenants** (proyectos). Todos los recursos — schemas, jobs, APIs generadas — están aislados por tenant.

### Gestión de tenants

```
POST   /tenants                     Crear tenant                  [JWT requerido]
GET    /tenants                     Listar mis tenants            [JWT requerido]
PATCH  /tenants/:tenantId           Renombrar tenant              [JWT + owner]
DELETE /tenants/:tenantId           Eliminar tenant               [JWT + owner]
```

### Rutas anidadas bajo tenant

```
POST /tenants/:tenantId/schema/upload                      Subir y provisionar .sql
GET  /tenants/:tenantId/schema/inspect/:engine/:dbName     Inspeccionar estructura
POST /tenants/:tenantId/schema/generate/:engine/:dbName    Generar rutas CRUD
GET  /tenants/:tenantId/schema/jobs                        Listar jobs del tenant
GET  /tenants/:tenantId/schema/job/:id                     Estado de un job
GET  /tenants/:tenantId/projects                           APIs generadas del tenant
```

**Almacenamiento de archivos** — los schemas temporales se guardan en `{SCHEMA_TMP_PATH}/{tenantId}/` para aislar archivos entre proyectos.

---

## API — Endpoints

### Auth  *(rate limit: 10 req / 15 min)*

```
POST /auth/register   Registrar usuario
POST /auth/login      Iniciar sesión → devuelve JWT
GET  /auth/me         Usuario autenticado   [JWT requerido]
```

### Tenants  *(requiere JWT)*

```
POST   /tenants                    Crear tenant
GET    /tenants                    Listar tenants del usuario
PATCH  /tenants/:tenantId          Actualizar nombre
DELETE /tenants/:tenantId          Eliminar tenant
```

### Schema  *(requiere JWT + acceso al tenant)*

```
POST /tenants/:tenantId/schema/upload                        Subir y provisionar .sql
GET  /tenants/:tenantId/schema/inspect/:engine/:dbName       Inspeccionar estructura de la DB
POST /tenants/:tenantId/schema/generate/:engine/:dbName      Generar rutas CRUD + JWT auth opcional
GET  /tenants/:tenantId/schema/jobs                          Jobs del tenant
GET  /tenants/:tenantId/schema/job/:id                       Estado de un job
GET  /tenants/:tenantId/projects                             APIs generadas del tenant
```

**Body de `/schema/upload` (multipart/form-data):**

| Campo | Descripción |
|---|---|
| `engine` | `mysql` \| `postgres` |
| `name` | Nombre de la base de datos destino |
| `schema` | Archivo `.sql` |

**Body de `/schema/generate` (JSON):**

| Campo | Tipo | Default | Descripción |
|---|---|---|---|
| `requiresAuth` | `boolean` | `false` | Habilitar JWT auth en la API generada |
| `hashAlgorithm` | `string` | `"bcrypt"` | Algoritmo de hash: `bcrypt` · `sha256` · `sha1` · `md5` · `plain` |

### Endpoints públicos  *(requiere JWT + acceso al tenant)*

```
GET   /tenants/:tenantId/projects/:projectId/endpoints            Listar endpoints del proyecto
PATCH /tenants/:tenantId/projects/:projectId/endpoints            Habilitar/deshabilitar todos
PATCH /tenants/:tenantId/projects/:projectId/endpoints/:epId      Togglear un endpoint
```

**Body de PATCH (JSON):**
```json
{ "isPublic": true }
```

### Admin  *(requiere JWT + rol admin)*

```
GET /admin/users      Lista de usuarios
GET /admin/jobs       Todos los jobs
GET /admin/generated  Todas las APIs generadas
```

### Público

```
GET  /health    Estado de los servicios
POST /contact   Formulario de contacto   (rate limit: 5 req / 10 min)
```

---

## Flujo de provisionamiento

```
Usuario sube .sql
     │
     ▼
[upload middleware]   valida extensión, guarda en SCHEMA_TMP_PATH/{tenantId}/
     │
     ▼
[schema.controller]   calcula hash SHA-256 → verifica duplicados (scoped por tenant)
                      → adquiere lock Redis → crea job → encola en BullMQ
     │
     ▼
[schema.worker]       1. Sanitize  — elimina GRANT / REVOKE
                      2. Validate  — sqlGuard (keywords prohibidas)
                      3. Create DB — crea la base de datos
                      4. Apply     — stream del .sql a psql / mysql CLI
                      5. Cleanup   — borra el archivo temporal
     │
     ▼
[Redis pub/sub]       publica progreso en schema:progress:<jobId>
     │
     ▼
[WebSocket]           el frontend recibe updates en tiempo real

Job completado → GeneratedApi guardado en app-db
```

**Stages del job:** `starting` → `sanitizing` → `validating` → `creating-db` → `applying-schema` → `completed`

**Status:** `queued` | `running` | `success` | `failed`

---

## WebSocket

```
ws://localhost:3000/ws
```

Suscribirse a un job:
```json
{ "type": "subscribe", "jobId": "uuid" }
```

Eventos recibidos: `progress` | `done` | `failed`

---

## Lambda Service

El Lambda Service (puerto 4000) es un proceso Express independiente que carga el manifiesto de APIs al iniciar y monta rutas CRUD sin redespliegue.

### Rutas CRUD generadas por tabla

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/:engine/:db/:table` | Listar (paginado, filtrable, ordenable) |
| `GET` | `/:engine/:db/:table/:id` | Obtener por PK |
| `GET` | `/:engine/:db/:table/:id/:relation` | Navegar relación FK |
| `POST` | `/:engine/:db/:table` | Crear registro |
| `PUT` | `/:engine/:db/:table/:id` | Actualizar por PK |
| `DELETE` | `/:engine/:db/:table/:id` | Eliminar por PK |

### Query params — GET listado

| Parámetro | Ejemplo | Descripción |
|---|---|---|
| `limit` | `?limit=20` | Registros por página (default 50, máx 500) |
| `offset` | `?offset=100` | Desplazamiento |
| `sort` | `?sort=name` | Columna de ordenamiento |
| `order` | `?order=desc` | `asc` (default) \| `desc` |
| `filter[col]` | `?filter[country_id]=1` | Filtro por igualdad |
| `include` | `?include=countries,cities` | LEFT JOIN por FK |

### Documentación automática

```
GET /:engine/:db/docs          Swagger UI interactivo
GET /:engine/:db/openapi.json  OpenAPI 3.0 spec
```

### JWT Auth en APIs generadas

Cuando se genera una API con `requiresAuth: true`, el Lambda Service:

1. **Detecta la tabla de usuarios** — busca en `user-table-patterns.json` (patrones de nombre de tabla, campo username y campo password). Si no hay coincidencia, consulta Claude haiku via API; si Claude identifica una tabla candidata, agrega el patrón al archivo para mejorar detecciones futuras.

2. **Monta el endpoint de login:**
   ```
   POST /:engine/:db/{LAMBDA_AUTH_PREFIX}/login
   ```
   Body: `{ "username": "...", "password": "..." }`
   Response: `{ "token": "JWT", "user": { ...campos sin contraseña } }`

3. **Protege todas las rutas CRUD** con un middleware JWT que valida el Bearer token en `Authorization`.

4. **Endpoints públicos** — desde la UI se puede habilitar/deshabilitar rutas individuales para que no requieran token. El manifiesto en Redis se actualiza en tiempo real sin reiniciar el Lambda.

**Algoritmos de hash soportados:** `bcrypt` · `sha256` · `sha1` · `md5` · `plain`

### Ejemplos curl — API sin auth

```bash
# Listar con paginación
curl "http://localhost:4000/postgres/mi_base/users?limit=10"

# Filtrar y ordenar
curl "http://localhost:4000/postgres/mi_base/users?filter[country_id]=1&sort=name&order=desc"

# JOIN con tablas relacionadas
curl "http://localhost:4000/postgres/mi_base/users?include=roles,companies"

# Navegar relación FK
curl "http://localhost:4000/postgres/mi_base/users/1/roles"

# Crear
curl -X POST "http://localhost:4000/postgres/mi_base/users" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Nuevo Usuario", "email": "user@example.com" }'
```

### Ejemplos curl — API con auth habilitado

```bash
# 1. Login
TOKEN=$(curl -s -X POST "http://localhost:4000/postgres/mi_base/auth-api-dyn/login" \
  -H "Content-Type: application/json" \
  -d '{ "username": "user@example.com", "password": "secret" }' | jq -r .token)

# 2. Usar la API con el token
curl "http://localhost:4000/postgres/mi_base/orders" \
  -H "Authorization: Bearer $TOKEN"

# 3. Rutas marcadas como públicas no requieren token
curl "http://localhost:4000/postgres/mi_base/products"
```

---

## Monitoreo

El stack incluye un sistema de observabilidad completo con 5 servicios preconfigurados que arrancan junto al resto de la aplicación.

### Stack de monitoreo

| Herramienta | Puerto | Función |
|---|---|---|
| **Prometheus** | `9090` | Scraping y almacenamiento de métricas. Retención de 15 días. |
| **Grafana** | `3001` | Visualización — dashboards, alertas, exploración de métricas. |
| **Node Exporter** | `9100` | Métricas del sistema host: CPU, RAM, disco, red. |
| **cAdvisor** | `8080` | Métricas por contenedor Docker: CPU, RAM, I/O de red y disco. |
| **Blackbox Exporter** | `9115` | Probe HTTP activo: uptime, latencia y HTTP status de los servicios. |

### Acceso a Grafana

```
http://localhost:3001
Usuario:     admin
Contraseña:  admin   (sobreescribir con GRAFANA_PASSWORD en .env)
```

El datasource de Prometheus y el dashboard principal se aprovisionan automáticamente al levantar el contenedor — no se requiere configuración manual.

### Dashboard incluido — *api-dyn Monitor*

El dashboard se carga como home page de Grafana y cubre cuatro áreas:

#### Sistema (Node Exporter)

| Panel | Métrica |
|---|---|
| CPU Usage (%) | Uso total, user y system — serie temporal |
| Memory Usage | Usado, cache/buffer y disponible en bytes — serie temporal |
| Disk Usage (%) | Gauge con umbrales: verde < 75% · amarillo < 90% · rojo ≥ 90% |
| RAM Usage (%) | Stat con fondo coloreado según umbral |
| Network I/O | RX / TX por interfaz física — serie temporal en bytes/s |

#### Contenedores (cAdvisor)

| Panel | Métrica |
|---|---|
| Container CPU (%) | Uso de CPU por contenedor `api-dyn-*` — serie temporal |
| Container Memory | Memoria por contenedor en bytes — serie temporal |
| Container Network I/O | RX / TX por contenedor — serie temporal |

#### Servicios web (Blackbox Exporter)

Los siguientes endpoints se sondean cada 15 segundos:

| Endpoint | Descripción |
|---|---|
| `http://api:3000/health` | API principal |
| `http://lambda:4000/health` | Lambda Service |
| `http://frontend:5173` | Frontend React |

| Panel | Métrica |
|---|---|
| Probe Status | Stat UP / DOWN por servicio con color verde/rojo |
| HTTP Response Time | Latencia en segundos — serie temporal |
| HTTP Probe Details | Tabla: endpoint · status · response time · HTTP code |

### Configuración de Prometheus

El scrape config vive en `docker/prometheus/prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'node-exporter'   # host: CPU, RAM, disco, red
  - job_name: 'cadvisor'        # contenedores Docker
  - job_name: 'blackbox-http'   # probes HTTP a api, lambda y frontend
  - job_name: 'prometheus'      # métricas de Prometheus mismo
```

Para agregar endpoints al probe HTTP, editar `docker/prometheus/prometheus.yml` → `blackbox-http` → `targets` y recargar:

```bash
curl -X POST http://localhost:9090/-/reload
```

### Archivos de configuración

```
docker/
├── prometheus/
│   └── prometheus.yml                  Scrape config + targets
├── blackbox/
│   └── blackbox.yml                    Módulos http_2xx y tcp_connect
└── grafana/
    ├── provisioning/
    │   ├── datasources/
    │   │   └── prometheus.yml          Datasource Prometheus (auto-provisionado)
    │   └── dashboards/
    │       └── dashboards.yml          Directorio de dashboards (auto-cargado)
    └── dashboards/
        └── api-dyn-monitor.json        Dashboard principal
```

### Dashboards adicionales recomendados (importar desde grafana.com)

| Dashboard | ID | Descripción |
|---|---|---|
| Node Exporter Full | `1860` | Métricas completas del host |
| Docker & System Monitoring | `893` | Contenedores Docker |
| Blackbox Exporter | `7587` | Monitoreo de endpoints HTTP/TCP |

Para importarlos: **Grafana → Dashboards → Import → ID**

---

## Seguridad

| Capa | Medida |
|---|---|
| Headers HTTP | `helmet` (CSP, X-Frame-Options, HSTS, X-Content-Type-Options, etc.) |
| Rate limiting | Auth: 10 req/15 min · Contact: 5 req/10 min · Schema upload: configurable |
| Autenticación | JWT con expiración de 7 días (API principal) · configurable en Lambda |
| Contraseñas app | bcryptjs con cost factor 12 |
| Contraseñas schemas | bcrypt · SHA-256 · SHA-1 · MD5 · plain — detectado automáticamente |
| SQL | sqlGuard — escaneo de keywords prohibidas antes de aplicar schemas |
| Idempotencia | Deduplicación por SHA-256 + cache con TTL de 5 min y cap de 10k entradas |
| Email | Sanitización HTML en el formulario de contacto |
| Body | `express.json({ limit: '1mb' })` para prevenir body bombing |
| Timeouts | Request timeout global de 30s |
| Multi-tenancy | `requireTenantAccess` middleware — valida ownership antes de cada operación |

---

## Frontend

La UI (React + Vite) incluye las siguientes páginas:

| Ruta | Descripción | Auth |
|------|-------------|------|
| `/` | Landing page — hero, features, how it works | Pública |
| `/login` | Iniciar sesión | Pública |
| `/register` | Crear cuenta | Pública |
| `/app` | Dashboard — gestión de proyectos, importar schema, APIs generadas | Requerida |
| `/admin` | Panel admin — usuarios, jobs, APIs | Admin |
| `/health` | Estado en tiempo real de todos los servicios | Pública |
| `/lambda` | Documentación del Lambda Service | Pública |
| `/contact` | Formulario de contacto con envío por email | Pública |

**i18n** — interfaz disponible en 4 idiomas seleccionables desde la barra de navegación: Español · English · Français · Português.

### Flujo en la UI

1. **Crear proyecto (tenant)** — selector en el sidebar.
2. **Import Schema** — subir `.sql`, elegir engine, nombre de DB. Opcionalmente activar *"Requires JWT authentication"* y seleccionar el algoritmo de hash.
3. **Job Status** — progreso en tiempo real via WebSocket.
4. **Graph View** — explorar el schema como grafo interactivo o árbol. Botón *"Generate APIs"* genera las rutas CRUD (y la auth si fue activada).
5. **My Projects** — lista de APIs generadas con links a Swagger UI y OpenAPI JSON. Si la API tiene auth habilitada, aparece el botón **"Manage Endpoints"** para togglear qué rutas son públicas.

---

## Desarrollo local (sin Docker)

```bash
# 1. Instalar dependencias
npm install
cd frontend && npm install && cd ..
cd lambda && npm install && cd ..

# 2. Levantar solo la infraestructura
docker compose up app-db postgres mysql redis -d

# 3. API
npm run dev

# 4. Worker (en otra terminal)
npm run worker

# 5. Lambda (en otra terminal)
cd lambda && npm run dev

# 6. Frontend (en otra terminal)
cd frontend && npm run dev
```

---

## Estructura del proyecto

```
api-dyn/
├── src/
│   ├── app.ts                              Express + helmet + CORS + middlewares globales
│   ├── server.ts                           HTTP server + WebSocket
│   ├── api/
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts          register / login / me
│   │   │   ├── tenants.controller.ts       CRUD de tenants
│   │   │   ├── schema.controller.ts        POST /tenants/:id/schema/upload
│   │   │   ├── schema.inspect.controller   GET  /tenants/:id/schema/inspect/...
│   │   │   ├── schema.generate.controller  POST /tenants/:id/schema/generate/... (+ auth detection)
│   │   │   ├── job.controller.ts           GET jobs (scoped por tenant)
│   │   │   ├── my-projects.controller.ts   GET /tenants/:id/projects
│   │   │   ├── public-endpoints.controller Gestión de rutas públicas/privadas
│   │   │   ├── admin.controller.ts         Endpoints de administración
│   │   │   └── contact.controller.ts       POST /contact (Nodemailer)
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.ts          requireAuth · requireAdmin
│   │   │   ├── tenant.middleware.ts        requireTenantAccess (ownership check)
│   │   │   ├── error.middleware.ts         Handler global de errores
│   │   │   ├── rateLimit.middleware.ts     schemaRateLimiter · authRateLimiter · contactRateLimiter
│   │   │   ├── upload.middleware.ts        Multer — destino {SCHEMA_TMP_PATH}/{tenantId}/
│   │   │   └── idempotency.middleware.ts   TTL cache + cap de entradas
│   │   ├── routes/
│   │   │   ├── auth.routes.ts             Auth + admin + contact
│   │   │   └── tenants.routes.ts          Todas las rutas bajo /tenants/:tenantId/...
│   │   └── ws/ws.server.ts               WebSocket (suscripciones por jobId)
│   ├── core/
│   │   ├── auth-detection/
│   │   │   ├── user-table-detector.ts     Pattern match + fallback Claude haiku
│   │   │   └── user-table-patterns.json   Patrones de tabla/username/password (auto-actualizable)
│   │   ├── connectors/
│   │   │   ├── base.connector.ts          loadCredentials() · getDbConfig() · waitForConnection()
│   │   │   ├── mysql.connector.ts         MySQL 8 — credentials file, apply via CLI
│   │   │   └── postgres.connector.ts      PostgreSQL — PGPASSWORD env, apply via psql CLI
│   │   ├── database/
│   │   │   ├── app.orm.ts                 MikroORM init + admin seed
│   │   │   └── entities/
│   │   │       ├── User.entity.ts
│   │   │       ├── Tenant.entity.ts       Proyectos multi-tenant
│   │   │       ├── SchemaJob.entity.ts
│   │   │       ├── GeneratedApi.entity.ts (+ campos auth: tabla, campos, algoritmo)
│   │   │       ├── InspectResult.entity.ts
│   │   │       └── PublicEndpoint.entity.ts  Rutas habilitadas/deshabilitadas por proyecto
│   │   ├── generator/crud.generator.ts    Genera manifests (+ AuthManifest) y los publica en Redis
│   │   └── queue/                         BullMQ queue · Redis publisher
│   ├── shared/
│   │   ├── jobStore.service.ts            Persistencia de jobs (scoped por tenant)
│   │   ├── sqlGuard.service.ts            sanitizeSchemaFile() · validateSqlContent()
│   │   ├── schema.service.ts
│   │   └── hash.ts                        SHA-256
│   ├── structures/graf.ts                 DatabaseDAG — DFS con detección de ciclos
│   └── worker/
│       ├── index.ts
│       └── schema.worker.ts               Pipeline: sanitize → validate → create DB → apply → cleanup
├── frontend/
│   └── src/
│       ├── pages/                         LandingPage · Dashboard · AdminPanel · ContactPage · HealthPage · LambdaPage
│       ├── components/
│       │   ├── UploadForm.tsx             + checkbox "Requires Auth" + select algoritmo hash
│       │   ├── JobStatus.tsx
│       │   ├── GraphView.tsx              + pasa requiresAuth/hashAlgorithm al generar
│       │   ├── MyProjects.tsx             + botón "Manage Endpoints" (solo si auth habilitado)
│       │   ├── PublicEndpoints.tsx        Modal con toggle por ruta + bulk enable/disable
│       │   ├── TenantSelector.tsx         Sidebar de proyectos (crear/eliminar/seleccionar)
│       │   ├── AllProjects.tsx
│       │   └── AppFooter.tsx
│       ├── context/
│       │   ├── AuthContext.tsx
│       │   └── AppContext.tsx             + requiresAuth · hashAlgorithm state
│       ├── api/client.ts                  + listEndpoints · toggleEndpoint · bulkToggleEndpoints
│       ├── types.ts                       + PublicEndpoint · GenerateAuthInfo · auth fields
│       └── i18n/I18nContext.tsx           Traducciones en en · es · fr · pt (+ endpoints.* + upload.auth*)
├── lambda/
│   └── src/
│       ├── index.ts                       Express en puerto 4000
│       ├── registry.ts                    Carga manifests · monta login · aplica JWT middleware
│       ├── handlers/
│       │   ├── crud.ts                    Handler genérico CRUD (JOIN, filtros, paginación)
│       │   └── auth.ts                    Login handler — verifica hash, firma JWT
│       ├── middleware/
│       │   └── jwt.ts                     JWT middleware — bypass por publicEndpoints
│       └── db/pool.ts                     Pool lazy por engine:dbName
├── docker/
│   ├── mysql/init.sql
│   ├── prometheus/prometheus.yml          Scrape config (node-exporter, cadvisor, blackbox)
│   ├── blackbox/blackbox.yml             Módulos http_2xx y tcp_connect
│   └── grafana/
│       ├── provisioning/
│       │   ├── datasources/               Prometheus datasource (auto-provisionado)
│       │   └── dashboards/                Directorio de dashboards (auto-cargado)
│       └── dashboards/
│           └── api-dyn-monitor.json       Dashboard de monitoreo (home page)
├── docker-compose.yml                     Stack completo con healthchecks y monitoreo
├── Dockerfile.api                         Imagen API + worker
├── .env.example
└── .env                                   (no commitear — agregar a .gitignore)
```

---

## Flujo completo de ejemplo

```bash
# 1. Registrarse o iniciar sesión
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{ "name": "Dev", "email": "dev@example.com", "password": "securepass" }'
# → { "token": "...", "user": { ... } }

TOKEN=<token del paso anterior>

# 2. Crear un tenant (proyecto)
TENANT=$(curl -s -X POST http://localhost:3000/tenants \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Mi E-commerce" }' | jq -r .tenant.id)

# 3. Subir schema
curl -X POST "http://localhost:3000/tenants/$TENANT/schema/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F engine=postgres \
  -F name=ecommerce_db \
  -F schema=@schema.sql

# 4. Consultar estado del job
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/tenants/$TENANT/schema/job/<jobId>"

# 5. Inspeccionar la estructura
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/tenants/$TENANT/schema/inspect/postgres/ecommerce_db"

# 6. Generar rutas CRUD con auth habilitado
curl -X POST "http://localhost:3000/tenants/$TENANT/schema/generate/postgres/ecommerce_db" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "requiresAuth": true, "hashAlgorithm": "bcrypt" }'
# → { "success": true, "auth": { "enabled": true, "loginEndpoint": "POST /postgres/ecommerce_db/auth-api-dyn/login", ... } }

# 7. Ver Swagger generado
open http://localhost:4000/postgres/ecommerce_db/docs

# 8. Login en la API generada
API_TOKEN=$(curl -s -X POST "http://localhost:4000/postgres/ecommerce_db/auth-api-dyn/login" \
  -H "Content-Type: application/json" \
  -d '{ "username": "user@example.com", "password": "secret" }' | jq -r .token)

# 9. Usar la API con el token
curl "http://localhost:4000/postgres/ecommerce_db/orders?limit=10" \
  -H "Authorization: Bearer $API_TOKEN"

# 10. Habilitar una ruta como pública (sin token)
PROJECT_ID=<id del proyecto>
curl -X PATCH "http://localhost:3000/tenants/$TENANT/projects/$PROJECT_ID/endpoints/<epId>" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "isPublic": true }'
```

---

## Pipeline del Worker

1. **Sanitize** — elimina `GRANT` y `REVOKE` del SQL para evitar errores de permisos.
2. **Validate** — escanea el archivo en streaming con el sqlGuard (keywords prohibidas).
3. **Create DB** — crea la base de datos si no existe.
4. **Apply** — stream del archivo `.sql` a `psql` / `mysql` CLI. Soporta archivos de cualquier tamaño sin cargarlos en memoria. Timeout configurable (`SCHEMA_APPLY_TIMEOUT_MS`, default 10 min).
5. **Cleanup** — borra el `.sql` temporal si el apply fue exitoso.

Si cualquier paso falla: el job se marca `failed`, se publica el error por WebSocket y se elimina la DB creada (configurable con `SCHEMA_DROP_DB_ON_FAILURE`).

---

## Schema Graph — DatabaseDAG

Implementado en `src/structures/graf.ts`. Construye un grafo dirigido desde la `DatabaseStructure` de los conectores.

- **Nodo tabla** — columnas, foreign keys, indexes
- **FK edge** — dirigido a la tabla referenciada; marcado `is_cyclic: true` si genera ciclo
- **Index child** — columnas y flag de unicidad
- **Detección de ciclos** — DFS con coloreo WHITE/GRAY/BLACK; los back-edges se marcan in-place

---

## Requisitos

- Node.js 20+
- Docker y Docker Compose v2 (recomendado)
- Redis 7+, MySQL 8+, PostgreSQL 10+ (si se ejecuta sin Docker)
