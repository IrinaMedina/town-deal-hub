
# Publicitta - App de Ofertas Outlet por Población

## Resumen
Aplicación web responsive para publicar y consultar ofertas tipo outlet organizadas por población. Con sistema de roles (Publicador/Suscriptor), suscripciones personalizadas y un diseño moderno y colorido estilo marketplace.

---

## Pantallas y Funcionalidades

### 1. Registro y Login
- **Registro**: Formulario con nombre, email, contraseña, selector de rol (Publicador/Suscriptor), y población
- **Login**: Email y contraseña
- Redirección automática según rol después del login

### 2. Feed de Ofertas (Solo Suscriptores)
- Lista de ofertas en tarjetas atractivas ordenadas por fecha (más recientes primero)
- **Filtrado automático** basado en la suscripción del usuario (población + categorías)
- Filtros adicionales visibles: checkbox "Solo vigentes" (ofertas no expiradas)
- **Cada tarjeta muestra**: Imagen (si existe), título, precio destacado, categoría con badge de color, población, tienda, contacto, fecha de publicación
- Botón "Gestionar suscripción" para modificar preferencias

### 3. Gestión de Suscripción (Suscriptores)
- Modal o página para seleccionar:
  - Población a seguir
  - Categorías de interés (selección múltiple): Ropa, Tecnología, Hogar, Zapatos, Belleza, Otros
- Las preferencias se guardan y filtran automáticamente el Feed

### 4. Publicar Oferta (Solo Publicadores)
- Formulario completo con:
  - Título, descripción, categoría (dropdown)
  - Población (por defecto la del usuario)
  - Precio, nombre de tienda, contacto
  - Fecha de expiración (opcional)
  - **Subida de imagen** (opcional, directamente desde el dispositivo)
- Botón "Publicar" con confirmación visual

### 5. Mis Ofertas (Solo Publicadores)
- Lista de todas las ofertas publicadas por el usuario
- Cada oferta con opciones de **Editar** y **Eliminar**
- Indicador visual de ofertas expiradas
- Formulario de edición pre-rellenado con datos actuales

---

## Diseño Visual

### Estilo General
- **Moderno y colorido** tipo app de ofertas/descuentos
- Colores vibrantes con gradientes llamativos
- Tarjetas con sombras suaves y bordes redondeados
- Animaciones sutiles en interacciones

### Paleta de Colores
- Color primario vibrante (naranja/coral para ofertas)
- Acentos en tonos complementarios (azul, verde para acciones)
- Badges de colores por categoría para identificación rápida

### Navbar
- Logo "Publicitta" a la izquierda
- Navegación según rol:
  - **Suscriptor**: Feed, Mi Suscripción, Logout
  - **Publicador**: Publicar, Mis Ofertas, Logout
- Menú hamburguesa en móvil

---

## Backend (Lovable Cloud con Supabase)

### Tablas de Base de Datos
- **profiles**: id, name, town, created_at (vinculada a auth.users)
- **user_roles**: id, user_id, role (PUBLICADOR/SUSCRIPTOR) - tabla separada por seguridad
- **offers**: id, title, description, category, town, price, store_name, contact, image_url, expires_at, created_by, created_at
- **subscriptions**: id, user_id, town, categories, created_at

### Almacenamiento
- Bucket de Supabase Storage para imágenes de ofertas
- Políticas de seguridad para subida por publicadores autenticados

### Seguridad (RLS)
- Publicadores: crear, editar y eliminar solo sus propias ofertas
- Suscriptores: solo lectura de ofertas
- Suscripciones: cada usuario gestiona solo la suya
- Roles verificados con función security definer para evitar escalación de privilegios

---

## Flujo de Usuario

### Suscriptor
1. Registra cuenta → Configura suscripción inicial (población + categorías)
2. Accede al Feed → Ve ofertas filtradas automáticamente
3. Puede ajustar suscripción en cualquier momento

### Publicador
1. Registra cuenta → Accede a pantalla de publicar
2. Crea ofertas con imágenes y detalles
3. Gestiona sus ofertas desde "Mis Ofertas" (editar/eliminar)
