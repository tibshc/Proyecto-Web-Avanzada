# Sistema de Gestión de Repuestos para Vehículos Comerciales Pesados

Este es el esqueleto base para una aplicación web monolítica basada en el patrón de arquitectura **Modelo-Vista-Controlador (MVC)**, diseñada para gestionar el catálogo de inventario de piezas (chasis, motores, frenos) de camiones y buses de carga pesada, integrando un chat en tiempo real para consultas de compatibilidad técnica.

---

## 🛠️ Stack Tecnológico

- **Core**: Node.js con Express.js
- **Motor de Plantillas (Servidor)**: EJS (HTML dinámico)
- **Base de Datos**: PostgreSQL mediante Sequelize ORM
- **Tiempo Real**: Socket.IO montado sobre el mismo servidor HTTP
- **Seguridad**: `bcryptjs` (encriptación de contraseñas) y `express-session` con persistencia en base de datos (`connect-session-sequelize`)

---

## 📁 Estructura del Proyecto

```text
Proyecto-Web-Avanzada/
├── config/
│   └── database.js          # Conexión e inicialización de Sequelize
├── controllers/
│   ├── authController.js    # Lógica de login, registro y recuperación
│   ├── productController.js # Lógica CRUD para el catálogo de repuestos
│   └── chatController.js    # Renderización del chat de soporte técnico
├── middlewares/
│   └── authMiddleware.js    # Control de accesos y roles (RBAC)
├── models/
│   ├── index.js             # Conector de base de datos y modelos
│   ├── User.js              # Modelo Sequelize para Usuarios (Mecánicos, Soporte, Admin)
│   └── Product.js           # Modelo Sequelize para Repuestos de Carga Pesada
├── public/
│   ├── css/
│   │   └── styles.css       # Estilos globales premium (Dark theme + Glassmorphism)
│   └── js/
│       └── chat-client.js   # Script cliente de Socket.IO con XSS y autoscroll
├── routes/
│   ├── authRoutes.js        # Endpoints de autenticación
│   ├── dashboardRoutes.js   # Endpoints del CRUD con restricción de roles
│   └── chatRoutes.js        # Endpoint del chat de soporte
├── views/
│   ├── partials/
│   │   ├── header.ejs       # Encabezado (Navbar, CSS y Lucide Icons)
│   │   └── footer.ejs       # Pie de página (scripts globales)
│   ├── login.ejs            # Vista de ingreso
│   ├── register.ejs         # Vista de registro de cuenta
│   ├── reset-password.ejs   # Vista de recuperación de contraseña
│   ├── dashboard.ejs        # Panel del catálogo (CRUD interactivo)
│   └── chat.ejs             # Sala de chat en tiempo real
├── .env.example             # Plantilla de variables de entorno
├── app.js                   # Configuración de Express y middlewares
└── server.js                # Punto de entrada (Servidor HTTP + Socket.IO + DB)
```

---

## 🚀 Guía de Configuración para Desarrolladores

Sigue estos pasos para levantar la aplicación en tu entorno local:

### 1. Clonar el repositorio e Instalar Dependencias
```bash
git clone <url-del-repositorio>
cd Proyecto-Web-Avanzada
npm install
```

### 2. Configurar la Base de Datos con Docker 🐳

Hemos incluido un archivo `docker-compose.yml` para facilitar el levantamiento de la base de datos PostgreSQL en un contenedor aislado, evitando instalaciones locales de software adicionales:

1. Asegúrate de tener **Docker** y **Docker Compose** instalados y ejecutándose.
2. Levanta el contenedor de PostgreSQL en segundo plano ejecutando:
   ```bash
   docker compose up -d
   ```
   *Esto iniciará un contenedor llamado `repuestos_postgres` en el puerto `5432` con el usuario, contraseña y base de datos ya configurados.*
3. Copia el archivo `.env.example` y nómbralo `.env`:
   ```bash
   cp .env.example .env
   ```
4. Los valores por defecto de `.env` ya coinciden con la configuración de Docker, por lo que **no necesitas modificar nada** si utilizas la base de datos dockerizada.

### 3. Ejecutar en Modo de Desarrollo
Arranca el servidor en modo desarrollo utilizando `nodemon` para que se reinicie automáticamente con cada cambio en el código:
```bash
npm run dev
```

El servidor sincronizará de forma automática las tablas (`Users`, `Products` y `Sessions`) en la base de datos de PostgreSQL dockerizada y se levantará en: **`http://localhost:3000`**

---

## 🛡️ Roles y Seguridad Incorporados

La aplicación cuenta con control de accesos basados en roles (**RBAC**):
- **Mecánico (`mechanic`)**: Puede visualizar el catálogo de repuestos, precios y detalles técnicos. No puede registrar, editar ni eliminar piezas. Tiene acceso al chat en tiempo real para resolver dudas de compatibilidad.
- **Soporte Técnico (`support`)**: Puede ver el catálogo, chatear y tiene permisos para **crear** y **editar** repuestos en el inventario.
- **Administrador (`admin`)**: Tiene control total sobre el sistema, incluyendo la eliminación permanente de repuestos (`deleteProduct`).

---

## 📝 Guía para Continuar el Desarrollo

Si deseas agregar nuevas características a este proyecto, sigue el flujo recomendado del patrón MVC:

1. **Base de Datos (Modelos)**:
   - Si necesitas añadir nuevos campos o tablas, agrégalos en `models/`.
   - Sequelize creará la estructura al arrancar gracias a `sequelize.sync({ alter: true })` en `server.js` (útil durante el desarrollo ágil).

2. **Controladores**:
   - Agrega lógica de negocio en `controllers/`.
   - Si creas nuevas consultas a la base de datos, maneja bloques `try-catch` y pasa los errores de validación a la vista para mantener una experiencia de usuario limpia.

3. **Vistas (EJS)**:
   - Utiliza las clases CSS predefinidas en `public/css/styles.css` para mantener la estética oscura y elegante (Glassmorphism).
   - Recuerda incluir los partials `<%- include('partials/header') %>` y `<%- include('partials/footer') %>` para heredar el navbar común, las sesiones y la biblioteca de iconos.

4. **Rutas**:
   - Mapea los nuevos controladores en `routes/`.
   - No olvides proteger tus endpoints utilizando el middleware `isAuthenticated` y, si es restrictivo, `authorizeRoles(['admin', 'support'])`.
