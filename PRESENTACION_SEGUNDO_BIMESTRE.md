# 🚛 Repuestos Pesados - Sistema de Gestión de Repuestos para Vehículos Comerciales Pesados

## Presentación — Segundo Bimestre
### Arquitectura de Microservicios

---

## 1. Introducción (Planteamiento del Problema)

**Problema:** Las PYME del sector de transporte y mantenimiento de flotas pesadas (camiones, buses) enfrentan dificultades para gestionar su inventario de repuestos, controlar el acceso de empleados (mecánicos, soporte, administradores) y brindar soporte técnico en tiempo real a sus clientes.

**Solución:** Una aplicación web moderna que permite:
- Gestión de catálogo de repuestos con CRUD completo
- Control de acceso basado en roles (RBAC)
- Chat de soporte técnico en tiempo real
- Carrito de compras integrado
- Arquitectura escalable de microservicios

---

## 2. Diagrama de Arquitectura Anterior (Monolítica)

```
┌─────────────────────────────────────────────────────┐
│                 APLICACIÓN MONOLÍTICA                │
│                                                     │
│  ┌─────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │  EJS     │  │ Express  │  │  Socket.IO        │  │
│  │  Views   │  │ Router   │  │  (WebSocket)      │  │
│  └─────────┘  └──────────┘  └───────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │         Controladores (MVC)                  │   │
│  │  Auth │ Product │ Cart │ Chat                │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │         Modelos (Sequelize ORM)              │   │
│  │  User │ Product │ Cart │ CartItem │ Message  │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │         PostgreSQL (BD Única)                │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Características del monolito:**
- Renderizado de vistas HTML desde el servidor (EJS)
- Routing del lado del servidor
- Lógica de negocio, persistencia y presentación en un solo proyecto
- Soporte de WebSocket (Socket.IO) integrado
- Base de datos única para todos los módulos

---

## 3. Diagrama de Arquitectura Nueva (Microservicios)

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENTE (Navegador)                      │
│              React SPA — http://localhost:3001               │
│         (Vite + React Router + Axios + Socket.IO Client)     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │ API GATEWAY │  Puerto 3000
                    │  (Express)  │  http-proxy-middleware
                    │  JWT Auth   │  Prometheus Metrics
                    └──┬───┬───┬──┘
                       │   │   │
              ┌────────┘   │   └──────────┐
              ▼            ▼              ▼
    ┌──────────────┐ ┌────────────┐ ┌──────────────┐
    │ Auth Service │ │Inventory   │ │ Chat Service │
    │  Puerto 4000 │ │ Service    │ │  Puerto 6000 │
    │  JWT + Bcrypt│ │ Puerto 5000│ │  Socket.IO   │
    └──────┬───────┘ └─────┬──────┘ └──────┬───────┘
           │               │               │
           ▼               ▼               ▼
    ┌──────────────┐ ┌────────────┐ ┌──────────────┐
    │  auth_db     │ │inventory_db│ │  chat_db     │
    │  PostgreSQL  │ │ PostgreSQL │ │  PostgreSQL  │
    │  Puerto 5433 │ │ Puerto 5434│ │  Puerto 5436 │
    └──────────────┘ └────────────┘ └──────────────┘

    ┌──────────────┐
    │ Cart Service │
    │  Puerto 7000 │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │  cart_db     │
    │  PostgreSQL  │
    │  Puerto 5435 │
    └──────────────┘

    ┌─────────────────────┐
    │   MONITOREO         │
    │  Prometheus :9090   │
    │  Grafana    :3005   │
    └─────────────────────┘
```

---

## 4. Análisis y Explicación del Refactoring de Base de Datos

### Patrón: Database per Microservice

**Antes (Monolito):** Una sola base de datos PostgreSQL centralizada que almacenaba todos los datos del sistema (usuarios, productos, carritos, mensajes).

```
┌──────────────────────────────┐
│     BD Única (repuestos_db)  │
│  ┌──────┐ ┌──────┐ ┌──────┐ │
│  │users │ │products│ │carts │ │
│  └──────┘ └──────┘ └──────┘ │
│  ┌──────┐ ┌────────┐        │
│  │cart_items│messages│       │
│  └──────┘ └────────┘        │
└──────────────────────────────┘
```

**Después (Microservicios):** Cada microservicio tiene su propia base de datos PostgreSQL aislada.

| Microservicio | Base de Datos | Puerto Host | Tablas |
|--------------|---------------|-------------|--------|
| Auth Service | `auth_db` | 5433 | users |
| Inventory Service | `inventory_db` | 5434 | parts |
| Cart Service | `cart_db` | 5435 | carts, cart_items |
| Chat Service | `chat_db` | 5436 | messages |

**Ventajas:**
- **Desacoplamiento:** Cada servicio puede escalar independientemente
- **Aislamiento:** Un fallo en una BD no afecta a las demás
- **Tecnología flexible:** Cada servicio podría usar diferente motor de BD
- **Seguridad:** Los datos sensibles (usuarios) están aislados

---

## 5. Patrones de Diseño en Microservicios

### Patrón 1: API Gateway Pattern

**Propósito:** Proveer un punto de entrada único para todos los clientes, enrutando las solicitudes al microservicio correspondiente.

```
Cliente ──► API Gateway ──► Auth Service
                │
                ├──► Inventory Service
                │
                ├──► Chat Service
                │
                └──► Cart Service
```

**Implementación:** `api-gateway/server.js` usa `http-proxy-middleware` para redirigir:
- `/auth/*` → Auth Service (puerto 4000)
- `/api/inventory/*` → Inventory Service (puerto 5000)
- `/api/chat/*` → Chat Service (puerto 6000)
- `/api/cart/*` → Cart Service (puerto 7000)

**Beneficios:**
- Centraliza la autenticación JWT
- Simplifica el cliente (solo conoce una URL)
- Permite monitoreo centralizado (Prometheus)

### Patrón 2: Database per Service Pattern

**Propósito:** Cada microservicio posee y gestiona su propia base de datos, garantizando un acoplamiento débil.

**Implementación:** Cada servicio define su propio modelo Sequelize y se conecta a su propia instancia PostgreSQL.

**Beneficios:**
- Los servicios no comparten infraestructura de datos
- Cada equipo puede elegir la tecnología de persistencia óptima
- Escalamiento independiente por servicio

---

## 6. Medidas de Seguridad Implementadas

### JWT (JSON Web Tokens)

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│ Cliente  │────►│ Auth Service │────►│   JWT Token  │
│ (Login)  │     │  (Verifica   │     │  (Firmado)   │
│          │◄────│ credenciales)│◄────│              │
└──────────┘     └──────────────┘     └──────────────┘
       │
       │ (Bearer Token en cada request)
       ▼
┌──────────────┐     ┌──────────────────┐
│ API Gateway  │────►│ Microservicio    │
│ (Valida JWT) │     │ (Procesa request)│
└──────────────┘     └──────────────────┘
```

**Flujo de autenticación:**
1. El cliente envía credenciales a `/auth/login`
2. Auth Service verifica y firma un JWT con `JWT_SECRET`
3. El cliente almacena el token en `localStorage`
4. Cada request incluye `Authorization: Bearer <token>`
5. El API Gateway valida el token antes de enrutar

### Otras medidas de seguridad:

| Medida | Implementación |
|--------|---------------|
| **Contraseñas hasheadas** | bcryptjs con salt de 10 rondas |
| **Rate Limiting** | Límite de 5 intentos de login por IP en 15 minutos |
| **RBAC (Roles)** | Admin, Support, Mechanic con permisos diferenciados |
| **Info Disclosure** | Mensajes genéricos en login y reset-password |
| **Validación de entrada** | trim() en todos los campos, whitelist de roles |
| **Restablecimiento seguro** | Token único de 64 caracteres con expiración de 1 hora |
| **IDOR Protection** | Middleware que verifica propiedad de recursos |

---

## 7. Frontend Funcional y Conectado a Microservicios

### Stack del Frontend

| Tecnología | Versión | Propósito |
|-----------|---------|-----------|
| React | 19 | UI Components |
| Vite | 8 | Build tool |
| React Router | 7 | Navegación SPA |
| Axios | 1 | HTTP Client |
| Socket.IO Client | 4 | WebSockets |
| Lucide React | 1 | Iconos |

### Pantallas Implementadas

| Ruta | Pantalla | Acceso |
|------|----------|--------|
| `/login` | Inicio de Sesión | Público |
| `/register` | Registro de Usuario | Público |
| `/forgot-password` | Solicitar token de recuperación | Público |
| `/reset-password` | Restablecer contraseña con token | Público |
| `/` | Dashboard (CRUD de repuestos) | Privado (Autenticado) |
| `/chat` | Soporte Técnico en Tiempo Real | Privado (Autenticado) |
| `/cart` | Carrito de Compras | Privado (Autenticado) |

### Conexión con Microservicios

```
React App ──► Axios ──► http://localhost:3000/auth/*
                │
                ├──► http://localhost:3000/api/inventory/*
                │
                ├──► http://localhost:3000/api/cart/*
                │
                └──► Socket.IO ──► ws://localhost:3000/api/chat/socket.io
```

- **API Gateway** es el único punto de conexión (puerto 3000)
- **Interceptor Axios** inyecta automáticamente el JWT en cada request
- **Socket.IO** envía el token en la query de conexión

### Despliegue en Contenedores

El frontend se despliega con **multi-stage build**:
1. **Etapa 1 (Build):** Node.js 20-alpine → `npm install` → `npm run build`
2. **Etapa 2 (Serve):** Nginx alpine sirve los archivos estáticos

```
Dockerfile del Frontend:
┌─────────────────────────────────────┐
│ FROM node:20-alpine AS builder      │
│ COPY package*.json ./               │
│ RUN npm install                     │
│ COPY . .                            │
│ RUN npm run build                   │
└──────────────────┬──────────────────┘
                   ▼
┌─────────────────────────────────────┐
│ FROM nginx:alpine                   │
│ COPY --from=builder /dist /usr/... │
│ EXPOSE 80                           │
└─────────────────────────────────────┘
```

---

## 8. Backend Funcional con Microservicios

### Microservicios Implementados

| Servicio | Puerto | Tecnología | Dependencias |
|----------|--------|------------|-------------|
| **API Gateway** | 3000 | Express, http-proxy-middleware | authMiddleware, promBundle |
| **Auth Service** | 4000 | Express, JWT, bcryptjs | PostgreSQL (auth_db) |
| **Inventory Service** | 5000 | Express, Sequelize | PostgreSQL (inventory_db) |
| **Chat Service** | 6000 | Express, Socket.IO | PostgreSQL (chat_db) |
| **Cart Service** | 7000 | Express, Sequelize | PostgreSQL (cart_db) |

### Despliegue en Contenedores

Cada microservicio tiene su propio `Dockerfile`:

```dockerfile
FROM node:20-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE <PORT>
CMD ["node", "server.js"]
```

### Orquestación con Docker Compose

```yaml
# docker-compose.yml (resumen)
services:
  auth_postgres:     # PostgreSQL 15 Alpine - Puerto 5433
  inventory_postgres: # PostgreSQL 15 Alpine - Puerto 5434
  cart_postgres:     # PostgreSQL 15 Alpine - Puerto 5435
  chat_postgres:     # PostgreSQL 15 Alpine - Puerto 5436
  auth-service:      # Node.js - Puerto 4000
  inventory-service: # Node.js - Puerto 5000
  chat-service:      # Node.js - Puerto 6000
  cart-service:      # Node.js - Puerto 7000
  api-gateway:       # Node.js - Puerto 3000
  frontend:          # Nginx - Puerto 3001
  prometheus:        # Puerto 9090
  grafana:           # Puerto 3005
```

**Comando para ejecutar:**
```bash
docker-compose up --build -d
```

---

## 9. Monitoreo y Logs

### Prometheus (http://localhost:9090)

Recolecta métricas HTTP de todos los servicios:

```yaml
# prometheus/prometheus.yml
scrape_configs:
  - job_name: 'api-gateway'     # targets: ['api-gateway:3000']
  - job_name: 'auth-service'    # targets: ['auth-service:4000']
  - job_name: 'inventory-service' # targets: ['inventory-service:5000']
  - job_name: 'chat-service'    # targets: ['chat-service:6000']
  - job_name: 'cart-service'    # targets: ['cart-service:7000']
```

**Métricas disponibles:**
- `http_request_duration_seconds_count` — Latencia de peticiones
- `http_requests_total` — Total de requests por método y ruta
- `http_request_duration_seconds_bucket` — Histograma de latencias

### Grafana (http://localhost:3005)

- **Usuario:** `admin`
- **Contraseña:** `admin`
- Visualización gráfica de métricas de Prometheus
- Dashboards personalizables para monitoreo de microservicios

### Logs en Tiempo Real

```bash
# Ver logs de todos los servicios
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f api-gateway
docker-compose logs -f auth-service
```

---

## 10. DevOps (CI/CD)

### GitHub Actions — Pipeline Automatizado

Archivo: `.github/workflows/deploy.yml`

```yaml
name: CI/CD Pipeline
on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  lint_and_test:
    name: Lint & Verify
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      # Instala dependencias de todos los servicios
      - run: npm install  # api-gateway
      - run: npm install  # auth-service
      - run: npm install  # inventory-service
      - run: npm install  # chat-service
      - run: npm install  # frontend

  build_docker:
    name: Build Docker Images
    runs-on: ubuntu-latest
    needs: lint_and_test
    steps:
      - uses: actions/checkout@v3
      - uses: docker/setup-buildx-action@v2
      # Construye imágenes Docker de cada servicio
      - uses: docker/build-push-action@v4
        with:
          context: ./api-gateway
          tags: apigateway:latest
```

**Flujo del pipeline:**
1. **Trigger:** Push o Pull Request a `main`/`master`
2. **Lint & Verify:** Instala dependencias de todos los servicios
3. **Build Docker:** Construye imágenes Docker de cada microservicio

---

## 11. Demostración de Ejecución Exitosa

### Requisitos

- Docker Desktop (Windows/Mac) o Docker Engine (Linux)
- Docker Compose (incluido en Docker Desktop)

### Pasos para ejecutar

```bash
# 1. Clonar el repositorio
git clone <url-del-repositorio>
cd Proyecto-Web-Avanzada

# 2. Construir y levantar todos los servicios
docker-compose up --build -d

# 3. Verificar que todos los contenedores estén corriendo
docker-compose ps

# 4. Acceder a la aplicación
# Frontend: http://localhost:3001
# API Gateway: http://localhost:3000
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3005 (admin/admin)
```

### Usuarios de Prueba

| Rol | Email | Contraseña |
|-----|-------|-----------|
| **Administrador** | `admin@repuestos.com` | `password123` |
| **Soporte** | `soporte@repuestos.com` | `password123` |
| **Mecánico** | `mecanico@repuestos.com` | `password123` |

### Verificación de Datos en BD

```bash
# Ver usuarios
docker exec auth_postgres psql -U postgres -d auth_db -c "SELECT name, email, role FROM users;"

# Ver repuestos
docker exec inventory_postgres psql -U postgres -d inventory_db -c "SELECT id, name, brand, price, stock FROM parts;"

# Ver mensajes del chat
docker exec chat_postgres psql -U postgres -d chat_db -c "SELECT * FROM messages;"
```

---

## Puntos Extras

### Kubernetes (Opcional)

El proyecto está preparado para ser orquestado con Kubernetes. Cada microservicio tiene su `Dockerfile` y puede ser desplegado en un clúster de Kubernetes usando los manifiestos YAML correspondientes.

**Estructura sugerida para Kubernetes:**
```
k8s/
├── namespace.yaml
├── configmap.yaml
├── secrets.yaml
├── auth-service/
│   ├── deployment.yaml
│   └── service.yaml
├── inventory-service/
│   ├── deployment.yaml
│   └── service.yaml
├── chat-service/
│   ├── deployment.yaml
│   └── service.yaml
├── cart-service/
│   ├── deployment.yaml
│   └── service.yaml
├── api-gateway/
│   ├── deployment.yaml
│   └── service.yaml
├── frontend/
│   ├── deployment.yaml
│   └── service.yaml
└── monitoring/
    ├── prometheus-deployment.yaml
    └── grafana-deployment.yaml
```

---

## Consideraciones Generales

### ✅ Validaciones Implementadas

| Validación | Frontend | Backend |
|-----------|----------|---------|
| Campos requeridos | ✅ | ✅ |
| Longitud de contraseña (mín. 6) | ✅ | ✅ |
| Formato de email | ✅ | ✅ |
| Precios numéricos | ✅ | ✅ |
| Roles permitidos (whitelist) | ✅ | ✅ |
| Cantidad en carrito (rango) | ✅ | ✅ |

### ✅ Navegabilidad

- Navegación superior (Navbar) con enlaces a todas las secciones
- Links de navegación entre Login ↔ Register ↔ Forgot Password
- Redirección automática al Dashboard después del login
- Protección de rutas privadas con `PrivateRoute`

### ✅ Repositorio Público

- Link del repositorio: [GitHub - Proyecto-Web-Avanzada]
- Commits de todos los integrantes visibles en el historial

---

## Stack Tecnológico Resumen

```
┌────────────────────────────────────────────────────────────┐
│                   STACK TECNOLÓGICO                        │
├────────────────────────────────────────────────────────────┤
│ Frontend:    React 19 + Vite 8 + React Router 7           │
│ Backend:     Node.js + Express + Sequelize ORM             │
│ Bases de Datos: PostgreSQL 15 (x4 independientes)         │
│ WebSockets:  Socket.IO                                     │
│ Autenticación: JWT + bcryptjs                              │
│ Contenedores: Docker + Docker Compose                      │
│ Monitoreo:   Prometheus + Grafana                          │
│ CI/CD:       GitHub Actions                                │
│ Diseño:      CSS Vanilla + Glassmorphism + Dark Theme      │
└────────────────────────────────────────────────────────────┘
```

---

## 📁 Estructura del Proyecto

```
Proyecto-Web-Avanzada/
├── api-gateway/          # API Gateway (Express + Proxy)
│   ├── server.js
│   ├── Dockerfile
│   └── middlewares/
├── auth-service/         # Microservicio de Autenticación
│   ├── server.js
│   ├── Dockerfile
│   ├── controllers/
│   ├── models/
│   └── routes/
├── inventory-service/    # Microservicio de Inventario
│   ├── server.js
│   ├── Dockerfile
│   ├── controllers/
│   ├── models/
│   └── routes/
├── chat-service/         # Microservicio de Chat
│   ├── server.js
│   ├── Dockerfile
│   ├── controllers/
│   └── models/
├── cart-service/         # Microservicio de Carrito
│   ├── server.js
│   ├── Dockerfile
│   ├── controllers/
│   ├── models/
│   └── routes/
├── client/               # Frontend React
│   ├── Dockerfile
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── context/
│   │   └── services/
│   └── public/
├── config/               # Configuración del monolito legado
├── controllers/          # Controladores del monolito legado
├── models/               # Modelos del monolito legado
├── routes/               # Rutas del monolito legado
├── views/                # Vistas EJS del monolito legado
├── prometheus/           # Configuración de Prometheus
├── .github/workflows/    # CI/CD con GitHub Actions
├── docker-compose.yml    # Orquestación de contenedores
└── README.md             # Documentación del proyecto
```
