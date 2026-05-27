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

### 2.5 Poblar la Base de Datos (Opcional - Seed)
Para rellenar la base de datos con usuarios de prueba (Administrador, Soporte, Mecánico) y un catálogo inicial de repuestos pesados, ejecuta el script de sembrado:
```bash
npm run seed
```
*Credenciales de prueba generadas:*
- **Administrador**: `admin@repuestos.com` (Contraseña: `password123`)
- **Soporte Técnico**: `soporte@repuestos.com` (Contraseña: `password123`)
- **Mecánico**: `mecanico@repuestos.com` (Contraseña: `password123`)

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
