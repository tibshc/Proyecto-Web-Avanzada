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

```text
Proyecto-Web-Avanzada/
├── config/
│   └── database.js          # Conexión e inicialización de Sequelize
├── controllers/
│   ├── authController.js    # Lógica de login, registro y recuperación de contraseña
│   ├── cartController.js    # Lógica de gestión de compras y operaciones del carrito
│   ├── chatController.js    # Renderización del chat de soporte técnico
│   └── productController.js # Lógica CRUD y filtrado para el catálogo de repuestos
├── middlewares/
│   ├── authMiddleware.js    # Control de accesos, roles (RBAC) y propiedad de items
│   └── flashMiddleware.js   # Middleware de mensajes dinámicos flash en sesión
├── models/
│   ├── index.js             # Inicializador de base de datos y mapeo asociativo
│   ├── User.js              # Modelo Sequelize para Usuarios (Mecánicos, Soporte, Admin)
│   ├── Product.js           # Modelo Sequelize para Repuestos de Carga Pesada
│   ├── Cart.js              # Modelo Sequelize de Carrito (relación uno-a-uno)
│   ├── CartItem.js          # Modelo Sequelize de Ítems del Carrito (cantidad y precios)
│   └── Message.js           # Modelo Sequelize para persistencia del chat
├── public/
│   └── css/
│       └── styles.css       # Estilos globales premium (Dark theme, Glassmorphism, animations)
├── routes/
│   ├── auth.js              # Rutas de autenticación (ingreso, salida, registro)
│   ├── cart.js              # Rutas de adición y actualización del carrito
│   ├── chatRoutes.js        # Ruta del módulo de chat en vivo
│   └── product.js           # Rutas del CRUD del catálogo y panel de administración
├── views/
│   ├── partials/
│   │   ├── header.ejs       # Encabezado (Navbar, socket.io-client, notificaciones globales y Lucide)
│   │   └── footer.ejs       # Pie de página (cierre de etiquetas y scripts complementarios)
│   ├── login.ejs            # Vista de ingreso de sesión
│   ├── register.ejs         # Vista de registro de nuevos usuarios
│   ├── reset-password.ejs   # Vista de recuperación y cambio de clave
│   ├── dashboard.ejs        # Panel del catálogo (interfaz interactiva del CRUD)
│   ├── cart.ejs             # Vista del carrito de compras interactivo
│   └── chat.ejs             # Sala de mensajería interactiva en tiempo real
├── .env.example             # Plantilla de configuración de variables de entorno
├── app.js                   # Configuración global del servidor Express
└── server.js                # Punto de entrada (Servidor HTTP + Socket.IO + DB)
```

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

## 🌟 Mejoras y Correcciones Recientes

Durante la última fase de desarrollo, se implementaron mejoras críticas de estabilidad, robustez en el CRUD y un sistema interactivo de notificaciones en tiempo real:

### 1. 🛠️ Correcciones de Estabilidad (Bug Fixes)
- **Middleware de Mensajes Flash (`flashMiddleware`)**: Corregido un bug crítico de inicialización y orden de registro de middlewares en `app.js` que causaba caídas del servidor por `req.flash is not a function`. Además, se optimizó el middleware para prevenir condiciones de carrera al limpiar los mensajes de la sesión.
- **Validación de Usuarios**: Se movió la validación de la longitud de contraseña al hook `beforeValidate` en el modelo `User`, previniendo que chocara con el hash encriptado por `bcrypt`.
- **Compatibilidad de Sequelize**: Ajustado el orden de ordenamiento de productos (`createdAt` en lugar de `created_at`) en `productController.js` para respetar la convención camelCase requerida por Sequelize.
- **Robustez en Base de Datos**: Mejorado el control de fallos en la conexión inicial (`testConnection`), propagando adecuadamente los errores para evitar que el servidor web intente atender peticiones si la base de datos no está disponible.
- **Redirecciones Seguras**: Se reemplazó el uso de parámetros de consulta con redirección manual para errores de propiedad de items del carrito por el uso limpio de mensajes flash.

### 2. 📋 Ajustes y Robustez en el CRUD
- **Edición Segura de SKU**: Se cambió el atributo `disabled` por `readonly` en el campo SKU en el formulario de edición de repuestos. Esto asegura que el valor del SKU sea enviado correctamente en la petición POST y no cause fallos de validación por ausencia de campo. Se añadieron clases CSS dinámicas (`opacity-50 cursor-not-allowed`) y reset de formulario interactivo.
- **Validaciones en el Frontend y Backend**:
  - El controlador de productos ahora valida estrictamente que los campos `name` y `brand` no estén vacíos.
  - El controlador del carrito cuenta con guardas de seguridad para evitar buscar IDs de producto nulos.
  - La vista del carrito valida los rangos de cantidad antes de enviar de forma reactiva mediante eventos `onchange`.

### 3. 💬 Sistema Premium de Notificaciones de Chat en Tiempo Real
- **Notificaciones Globales Integradas**: Se incorporó un sistema de alertas en tiempo real en todo el sitio web mediante Socket.IO, alojado de forma centralizada en el navbar (`header.ejs`).
- **Alertas Premium (Toasts)**: Al recibir un mensaje nuevo, el sistema genera dinámicamente un banner flotante premium (Toast visual interactivo) con animaciones CSS fluidas de entrada y salida (`slide-in` / `slide-out`).
- **Indicador Dinámico (Badge)**: Se añadió un círculo contador de mensajes no leídos interactivo y animado (`animate-bounce`) en la opción "Soporte en Vivo" de la barra de navegación superior.
- **Persistencia Inteligente**: La cantidad de mensajes no leídos se almacena en el navegador mediante `sessionStorage` para no perder el contador entre cambios de página, y se limpia automáticamente cuando el usuario ingresa de forma activa al chat en `/chat`.

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
