# Documentación del Proyecto: Arquitectura de Microservicios

Este documento detalla la refactorización de la aplicación monolítica hacia una arquitectura de microservicios, con un enfoque inicial en la autenticación y el enrutamiento centralizado.

## 1. Arquitectura General

La aplicación ha pasado de ser un monolito único a una arquitectura basada en microservicios, lo que permite un desarrollo, escalamiento y mantenimiento independientes de los componentes lógicos del sistema.

- **API Gateway:** Punto de entrada único para los clientes. Enruta las solicitudes a los microservicios apropiados.
- **Auth Service:** Microservicio dedicado a la gestión de usuarios (registro, login) y la emisión/validación de tokens de seguridad (JWT).
- **Monolito (Legado):** Temporalmente, el código monolítico restante manejará las demás operaciones de negocio hasta que se extraigan en sus propios microservicios.

## 2. API Gateway

El API Gateway es una aplicación Node.js/Express que escucha en el puerto `3000`. Actúa como un proxy inverso.
- **Tecnología:** `express`, `http-proxy-middleware`.
- **Funcionamiento:** 
  - Las peticiones a `/auth/*` se redirigen al Auth Service.
  - Otras peticiones pueden ser redirigidas a otros servicios o al monolito que corre en un puerto distinto.

## 3. Auth Service y Seguridad (JWT)

El **Auth Service** (puerto `4000`) es el único responsable de la autenticación de usuarios.

- **Tecnología:** `express`, `jsonwebtoken` (JWT), `bcryptjs`.
- **Flujo JWT:**
  1. El cliente envía credenciales (email y password) al endpoint `/auth/login` a través del API Gateway.
  2. El Auth Service verifica las credenciales en su base de datos.
  3. Si son válidas, el Auth Service firma un token JWT usando una clave secreta (`JWT_SECRET`) y lo devuelve al cliente.
  4. Para solicitudes futuras a rutas protegidas, el cliente incluye el JWT en el encabezado HTTP: `Authorization: Bearer <token>`.
  5. El Gateway (o los otros microservicios) pueden verificar la validez del token antes de procesar la solicitud.

## 4. Patrón "Database per Microservice"

Cada microservicio debe tener y gestionar su propia base de datos, garantizando un acoplamiento débil.

- **Auth Database:** El Auth Service utiliza una base de datos PostgreSQL exclusiva para almacenar los datos de los usuarios. Ningún otro servicio tiene acceso directo a esta base de datos. Si otro servicio necesita datos del usuario, debe solicitarlos al Auth Service a través de la red (API).
- Esto evita cuellos de botella en una base de datos centralizada y permite que cada servicio utilice la tecnología de persistencia más adecuada para sus necesidades.

## 5. Fase 2: Inventory Service y Chat Service

Se ha continuado la extracción de servicios separando la lógica de negocio y comunicación:

### Inventory Service
- **Propósito:** Manejar el CRUD de repuestos (`name`, `description`, `price`, `stock`).
- **Puerto:** `5000`
- **Base de Datos:** Posee su propia base de datos aislada `inventory_db` (PostgreSQL puerto `5434`), reafirmando el patrón "Database per Microservice".

### Chat Service
- **Propósito:** Manejar el soporte técnico en tiempo real.
- **Puerto:** `6000`
- **Tecnología:** Utiliza `Socket.io` para la comunicación full-duplex vía WebSockets.

### Validación de Tokens en el API Gateway
- Se ha añadido un middleware (`authMiddleware.js`) directamente en el **API Gateway**.
- Esto significa que las peticiones a `/api/inventory` y `/api/chat` son interceptadas por el Gateway.
- El Gateway verifica la firma del token JWT provisto en el encabezado `Authorization`.
- Si el token es inválido o no existe, el Gateway responde con `401 Unauthorized` bloqueando la petición antes de que siquiera alcance a los microservicios internos, reduciendo la carga y aumentando la seguridad del clúster.

## 6. Fase 3: Frontend Independiente (React + Vite)

Se ha creado una aplicación SPA (Single Page Application) en el directorio `/client` que actúa como cliente de los microservicios.

### Arquitectura de React
- **Tecnología:** React 18 inicializado con Vite.
- **Rutas (React Router):**
  - `/login`: Formulario de inicio de sesión.
  - `/register`: Formulario de creación de cuenta.
  - `/`: Dashboard principal protegido (CRUD de inventario).
  - `/chat`: Interfaz de soporte técnico en tiempo real protegida.
- **Estado de Autenticación:** Se utiliza un `AuthContext` para mantener el estado global del usuario y el JWT almacenado en `localStorage`. Este contexto protege las rutas privadas (`PrivateRoute`).

### Conexión con Microservicios
- **API Gateway como único punto:** Toda comunicación (HTTP y WebSockets) se realiza contra el API Gateway (`http://localhost:3000`). El Gateway se encarga de redirigir internamente al *Auth Service*, *Inventory Service* y *Chat Service*.
- **Axios Interceptor:** Se configuró un interceptor (`src/services/api.js`) que automáticamente inyecta la cabecera `Authorization: Bearer <token>` en todas las peticiones salientes.
- **WebSockets:** Se configuró el `socket.io-client` para conectar con la ruta `/api/chat/socket.io` y enviar el token en la *query* de conexión para que el API Gateway pueda validarlo.

### Validaciones de Interfaz y Diseño
- Se aplicó validación en el lado del cliente (ej: contraseñas de al menos 6 caracteres, precios estrictamente numéricos).
- Se implementó un diseño "Premium" ("Rich Aesthetics") con modo oscuro por defecto (`Vanilla CSS`), utilizando la fuente *Inter*, efectos *Glassmorphism* y microanimaciones suaves para una experiencia de usuario moderna.

## 7. Fase 4: Infraestructura y DevOps

Para preparar la aplicación para despliegues modernos, se ha contenerizado y automatizado el flujo de integración.

### Contenerización (Dockerfiles)
- **Backend (`Node:18-alpine`):** Los microservicios (`auth-service`, `inventory-service`, `chat-service`) y el `api-gateway` utilizan una imagen ligera de Node.js en Alpine Linux. Se instalan solo las dependencias de producción para minimizar el tamaño de la imagen y la superficie de ataque.
- **Frontend (`Multi-stage build`):** La aplicación cliente React se construye usando un proceso de dos etapas. En la Etapa 1 se instalan dependencias y se compila el código (`npm run build`). En la Etapa 2 se transfiere únicamente la carpeta `dist` compilada a un contenedor `nginx:alpine`, logrando un servidor web estático extremadamente rápido y ligero en el puerto 80.

### Orquestación Local (Docker Compose)
- El archivo maestro `docker-compose.yml` centraliza 7 servicios:
  - `auth_postgres` (puerto 5433)
  - `inventory_postgres` (puerto 5434)
  - `auth-service` (puerto 4000)
  - `inventory-service` (puerto 5000)
  - `chat-service` (puerto 6000)
  - `api-gateway` (puerto 3000)
  - `frontend` (puerto 80)
- **Redes Docker:** Se utiliza una red interna `app-network` tipo `bridge`. Los microservicios resuelven sus dependencias vía nombres de dominio internos (ej. `DB_HOST=inventory_postgres` o `AUTH_SERVICE_URL=http://auth-service:4000`).

### Pipeline CI/CD (GitHub Actions)
- Se configuró el archivo `.github/workflows/deploy.yml` que se dispara ante cada `push` o `pull_request` hacia la rama `main`.
- **Jobs:**
  1. `lint_and_test`: Valida que los proyectos sean funcionales ejecutando `npm install` (simulando pruebas o linters).
  2. `build_docker`: Emplea Buildx para compilar las 5 imágenes Docker (Frontend + 4 Backends) comprobando que no existan errores de empaquetado, finalizando con una validación estructural de `docker-compose config`.

## 8. Fase 5: Observabilidad y Monitoreo

Para garantizar la fiabilidad del sistema en producción, se ha implementado un stack de monitoreo estándar en la industria.

### Recolección de Métricas
- **Instrumentación Node.js:** Cada microservicio (`api-gateway`, `auth-service`, `inventory-service`, `chat-service`) fue instrumentado utilizando las librerías `prom-client` y `express-prom-bundle`. Esto permite recopilar métricas automáticas sobre el rendimiento de Node (uso de CPU, Memoria, Event Loop) y métricas HTTP (solicitudes totales, tiempos de respuesta, códigos de estado).
- **Endpoint `/metrics`:** Las métricas se exponen en formato de texto plano (estándar de Prometheus) en la ruta HTTP `/metrics` de cada servicio.

### Prometheus (Time-Series Database)
- **Rol:** Se configuró un contenedor central de **Prometheus** (expuesto en el puerto `9090`).
- **Scraping Activo (Pull):** A diferencia de otros sistemas basados en "Push", Prometheus está configurado mediante `prometheus.yml` para conectarse cada 15 segundos a los microservicios usando sus nombres internos de Docker y raspar (pulling) sus métricas actualizadas.

### Grafana (Visualización)
- **Rol:** Se configuró un contenedor de **Grafana** (expuesto en el puerto `3005`) para el análisis visual.
- **Dashboards:** Permite conectarse a Prometheus como origen de datos (Data Source) para crear paneles y alertas en tiempo real, observando directamente comportamientos críticos como la tasa de Peticiones Por Segundo (RPS) que atraviesan el API Gateway.

---
*Informe Técnico Final generado para la arquitectura de microservicios con React, Node.js, PostgreSQL y Docker.*
