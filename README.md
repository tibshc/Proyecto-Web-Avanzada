# Sistema de Gestión de Repuestos - Arquitectura de Microservicios

Este proyecto es una evolución de una arquitectura monolítica hacia una **Arquitectura de Microservicios** basada en contenedores (Docker), React y Node.js. Permite gestionar el catálogo de inventario de piezas de camiones y buses de carga pesada, integrando un chat en tiempo real para consultas de compatibilidad técnica.

---

## 🛠️ Stack Tecnológico Actual

- **Frontend**: React.js (Vite), React Router, Axios, Socket.IO Client.
- **API Gateway**: Node.js, Express, Proxy Inverso (http-proxy-middleware).
- **Microservicios Backend** (Node.js/Express):
  - `auth-service`: Manejo de autenticación (JWT) y roles.
  - `inventory-service`: CRUD del catálogo de repuestos.
  - `chat-service`: Sockets en tiempo real.
- **Bases de Datos**: PostgreSQL independiente por microservicio (Database per microservice).
- **Infraestructura**: Docker y Docker Compose para orquestación de contenedores.
- **Monitoreo**: Prometheus (Métricas HTTP) y Grafana (Dashboards visuales).

---

## 🚀 Guía de Configuración y Ejecución

Todo el ecosistema está orquestado mediante Docker, por lo que **solo necesitas tener Docker y Docker Compose instalados** en tu máquina. No es necesario instalar Node.js ni PostgreSQL localmente.

### 1. Levantar el Ecosistema

En la raíz del proyecto, ejecuta el siguiente comando para construir todas las imágenes y levantar todos los contenedores en segundo plano:

```bash
docker-compose up -d --build
```

Este comando levantará:
- **Bases de Datos**: `auth_postgres` (5433) e `inventory_postgres` (5434).
- **Backend**: `auth-service` (4000), `inventory-service` (5000), `chat-service` (6000).
- **API Gateway**: (3000) - Punto de entrada único para el frontend.
- **Frontend (React)**: Servido en el puerto **3001** (Accesible en `http://localhost:3001`).
- **Observabilidad**: `prometheus` (9090) y `grafana` (3002).

### 2. Acceso a la Aplicación

Una vez que todos los contenedores estén levantados (`docker-compose ps` para verificar), abre tu navegador e ingresa a:

👉 **[http://localhost:3001](http://localhost:3001)**

---

## 👥 Usuarios de Prueba (Roles)

El sistema cuenta con Control de Accesos Basado en Roles (RBAC). Puedes utilizar los siguientes usuarios de prueba que ya han sido generados en la base de datos para probar los distintos niveles de permisos:

| Rol | Correo Electrónico | Contraseña | Permisos |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin@taller.com` | `password123` | Control total. Puede agregar, editar y **eliminar** repuestos. |
| **Soporte** | `soporte@taller.com` | `password123` | Puede ver, agregar y editar repuestos. No puede eliminar. |
| **Mecánico** | `mecanico@taller.com` | `password123` | Solo lectura. No puede agregar, editar ni eliminar repuestos. |

Todos los usuarios tienen acceso a la sala de **Soporte Técnico en Línea** (Chat), donde sus mensajes aparecerán con su respectiva etiqueta de rol.

---

## 📊 Monitoreo y Observabilidad

Para revisar el estado de salud de la aplicación y las métricas de peticiones HTTP (latencias, códigos de estado, etc):

1. **Prometheus**: Ingresa a `http://localhost:9090` para consultar métricas en bruto (Ej: `http_request_duration_seconds_count`).
2. **Grafana**: Ingresa a `http://localhost:3005` (Usuario: `admin`, Clave: `password123`). Puedes importar dashboards para visualizar gráficamente el tráfico que pasa por el API Gateway y los microservicios.

---

## 🛑 Detener la Aplicación

Para apagar el entorno y detener todos los contenedores, ejecuta:

```bash
docker-compose down
```

*(Si deseas borrar también los volúmenes de las bases de datos para empezar desde cero, puedes agregar la bandera `-v`: `docker-compose down -v`).*
