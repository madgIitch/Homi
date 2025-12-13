# HomiMatch · Esquema de UI (v0.1)

Este documento describe las pantallas principales de la app HomiMatch, sus componentes y la relación con el modelo de datos (USER, PROFILE, HABITACION, PISO, MATCH, CHAT, MESSAGE).

---

## Desarrollo de la primera fase MVP

## **Sprint 1 · Fundamentos y Autenticación **

### 1.1. Setup del proyecto React Native
- Configuración inicial del entorno.
- Creación de estructura base de carpetas (screens, components, hooks, navigation, theme…).
- Configuración de navegación (React Navigation).
- Arquitectura limpia desde el inicio.

### 1.2. Sistema de theming
- Definición de paleta base (morado + tonos pastel).
- Tipografía juvenil, bordes redondeados, chips y tarjetas.
- Implementación de `ThemeProvider`.

### 1.3. Autenticación
- Pantallas:
  - Login
  - Registro
- Integración con la entidad **USER**:
  - email
  - username
  - contraseña (hash)
  - premium_status (false por defecto)

---

## **Sprint 2 · Perfil de Usuario **

### 2.1. Pantalla de Edición de Perfil
- Foto de perfil (upload).
- Nombre, apellidos, username, edad, bio.
- Ocupación, universidad, campo de estudio.

### 2.2. Intereses
- Chips multiselección (música, cine, viajes, etc.).

### 2.3. Estilo de vida
- Horario
- Limpieza
- Fumar
- Mascotas
- Invitados

### 2.4. Situación de vivienda y zonas
- ¿Buscas piso o tienes piso?
- Ciudad del piso.
- Selector por zonas (chips).
- Presupuesto.
- Nº de compañeros buscados.

### 2.5. Integración con BBDD
- **PROFILE**
- **HABITACION**
- **PISO**

---

## **Sprint 3 · Sistema de Swipes **

### 3.1. Pantalla principal de Swipes
- Card stack con animaciones y gestos:
  - Swipe derecha → Like
  - Swipe izquierda → Rechazar
- Contador diario de swipes (`X/20` para free).
- Botones inferiores:
  - ❌ Rechazar
  - “Ver detalles completos”
  - ❤️ Me gusta

### 3.2. Tarjetas de perfil (vista resumida)
- Fotos.
- Badges:
  - “Busco piso”
  - “Tengo piso en <zona>”
  - Presupuesto.
- Bio breve.
- Chips de estilo de vida.

### 3.3. Pantalla de Detalle de Perfil
- Secciones:
  - Sobre
  - Compañeros
  - Presupuesto
  - Estudios y trabajo
  - Estilo de vida
  - Intereses
  - Detalles de convivencia
- Botón CTA “Enviar mensaje”.

---

## **Sprint 4 · Filtros y Búsqueda **

### 4.1. Pantalla de Filtros
- Situación vivienda (busca / tiene / indiferente).
- Presupuesto mínimo-máximo.
- Zonas.
- Nº de compañeros.
- Estilo de vida (chips).
- Intereses clave.

### 4.2. Integración
- Aplicación de filtros en algoritmo de swipes.
- Actualización dinámica del card stack.

---

## **Sprint 5 · Sistema de Matches y Chat **

### 5.1. Pantalla de Matches y Chats
- Segment control:
  - “Matches”
  - “Mensajes”
- Grid de matches con avatar.
- Lista de chats:
  - foto
  - nombre
  - última línea del mensaje
  - hora
  - badge de no leídos
- Estados vacíos:
  - “Aún no tienes matches”
  - “No hay mensajes todavía”

### 5.2. Chat individual
- Header con foto y nombre.
- Burbujas de mensajes (izquierda/derecha).
- Timestamps.
- Indicadores opcionales (entregado/leído).
- Input inferior con botón de enviar.

### 5.3. Integración con entidades
- **MATCH**
- **CHAT**
- **MESSAGE**

---

## **Sprint 6 · Gestión de Habitaciones **

### 6.1. Para usuarios con “Tengo piso”
- Pantalla de gestión:
  - Lista de habitaciones publicadas.
  - Estados: disponible, pausada, reservada.
  - Acciones:
    - Editar
    - Pausar
    - Ver interesados (perfiles que dieron like)

### 6.2. Detalle editable de habitación
- Fotos de habitación.
- m², tipo (individual/doble).
- Servicios incluidos.
- Reglas del piso.
- Disponibilidad.

---

## **Sprint 7 · Features Premium y Pulido **

### 7.1. Sistema Premium
- Badges premium visibles en UI.
- Ventajas:
  - Swipes ilimitados
  - Ver perfiles que te han dado like
  - Filtros avanzados

### 7.2. Estados globales y microinteracciones
- Loading skeletons.
- Empty states mejorados.
- Mensajes de error consistentes.
- Animaciones suaves en card stack, transiciones y chips.

### 7.3. Testing y optimización final
- Optimizar navegación.
- Perfilado de rendimiento en listas y swipes.
- QA completo de todas las pantallas.

---

## 0. Patrones globales de UI

- **Top bar**
  - Logo HomiMatch
  - Botón “Filtros”
  - Estado “Premium” (badge)
- **Tipografía y estilo**
  - Estilo juvenil, tarjetas con bordes redondeados, sombras suaves.
  - Chips para intereses, estilo de vida, zonas, etc.
- **Acciones principales**
  - Botones de like / dislike en las tarjetas.
  - Botones de CTA primarios en morado (p.ej. “Ver detalles completos”).

---

## 1. Pantalla de Swipes (Home · Matching)

### 1.1. Estructura general

- **Header**
  - Logo “HomiMatch”
  - Botón “Filtros”
  - Barra de progreso: `X/20 swipes`
  - Badge “Premium” (si aplica)

- **Zona central: Card stack**
  - Tarjeta principal (perfil actual)
  - Tarjeta siguiente asomando por detrás (efecto stack tipo Tinder)
  - Gestos de swipe:
    - Swipe derecha: like / interés
    - Swipe izquierda: descartar
    - Tap para “Ver detalles completos”

- **Tarjeta de perfil (vista resumida)**
  - Foto principal del perfil / habitación
  - Badges superiores:
    - `Busco piso` / `Tengo piso en <zona>`
    - Rango de presupuesto (ej. `200€ - 300€`)
  - Overlay inferior con datos básicos:
    - Nombre + edad (ej. “Maria, 22”)
    - Ciudad (ej. Sevilla)
    - Rol / universidad (ej. “Estudiante – US”)
  - Texto breve de bio en 1–2 líneas:
    - “Busco piso en Viapol/Plantinar/Juncal. Soy ordenada…”
  - Chips de estilo de vida:
    - “Muy ordenado/a”, “Flexible”, etc.
  - Chip de número de compañeros que busca:
    - “Busca 2 compañeros”

- **Zona inferior: acciones**
  - Botón circular “X” (rechazar)
  - Botón “Ver detalles completos”
  - Botón circular “♥” (like)

### 1.2. Datos asociados (modelo)

- Desde `PROFILE`:
  - nombre, edad, ciudad, universidad, ocupación, bio
  - flags de estilo de vida
  - número de compañeros buscados
- Desde `HABITACION` / `PISO` (si tiene piso):
  - tipo: “Busco piso” / “Tengo piso”
  - zona, rango de precio, disponibilidad
- Desde `USER`:
  - estado premium (para mostrar badge)
- Desde lógica de negocio:
  - contador de swipes diarios

---

## 2. Pantalla de Detalle de Perfil (Perfil de otro usuario)

Se muestra al pulsar “Ver detalles completos” o al hacer tap en la tarjeta.

### 2.1. Header

- Botón “Atrás”
- Título con nombre (“Jaime”)
- Botón “X” (descartar)
- Botón “♥” (like / match)

### 2.2. Hero con foto y datos básicos

- Foto grande del perfil
- Card superpuesta con:
  - Nombre + edad
  - Localización (zona o barrio)
  - Badge de situación vivienda:
    - `Busca piso en Bellavista – La Palmera`
    - o `Tengo piso en Viapol`
  - Iconos (ubicación, campus, etc.)

### 2.3. Sección “Sobre”

- Título “Sobre”
- Párrafo de descripción larga:
  - Ej. “Busco habitación por la zona de Reina Mercedes o Bami…”

### 2.4. Bloque de “Compañeros” y “Presupuesto”

- Dos tarjetas lado a lado:
  - **Compañeros**
    - Número de compañeros deseados
  - **Presupuesto**
    - Rango `200€ – 300€`

### 2.5. “Estudios y Trabajo”

- Tarjetas simples:
  - Universidad
  - Ocupación (Estudiante / Trabajador / Mixto)
  - Campo de estudio (si aplica)

### 2.6. “Estilo de Vida”

- Título
- Grupo de chips:
  - “Muy ordenado/a”
  - “Horario flexible”
  - “No fuma”
  - “Sin problema invitados”
  - “Sin mascotas”
  - Otros flags

### 2.7. “Intereses”

- Chips multicolor:
  - Tecnología, Viajes, Fiesta, Música, Cine, etc.

### 2.8. “Detalles de convivencia” (si tiene piso / habitación)

- Subtítulos por categoría:
  - Horario
  - Limpieza
  - Fumar
  - Mascotas
  - Invitados
- Texto o badges descriptivos para cada uno.

### 2.9. CTA inferior

- Botón principal “Enviar mensaje”
  - Si ya existe match → abre chat.
  - Si no existe → crea match pendiente y abre chat en modo “primero mensaje”.

### 2.10. Datos asociados

- `PROFILE`: bio, estudios, intereses, estilo de vida.
- `HABITACION` + `PISO`: nº compis, presupuesto, zona, reglas de convivencia.
- `MATCH`: estado del match (para saber si se puede chatear).

---

## 3. Pantalla de Edición de Perfil (Perfil propio)

### 3.1. Header

- Título: “Editar perfil”
- Botón “Cancelar” / “Atrás”
- Botón “Guardar” (fijo arriba o flotante inferior al hacer scroll)

### 3.2. Foto de perfil

- Avatar circular con foto actual.
- Texto: “Toca para cambiar foto”.
- Icono de cámara.

### 3.3. Información personal

- Campos:
  - Nombre (obligatorio)
  - Apellidos
  - Nombre de usuario (único)
  - Email (no editable, o editable con verificación)
  - Edad
  - Biografía (textarea corto)

### 3.4. Ocupación y estudios

- Ocupación (input / selector)
- Universidad
- Campo de estudio

### 3.5. Intereses

- Sección con chips:
  - Deportes, Música, Cine, Arte, Videojuegos, Gastronomía, Viajes, etc.
- Selección múltiple, muestra chips seleccionados en morado.

### 3.6. Estilo de Vida

- Bloque con inputs o selectores:
  - Horario (ej. “Temprano / Tarde / Flexible”)
  - Limpieza (ej. “Muy ordenado/a / Normal / Relajado”)
  - Fumar (Sí / No / Ocasional)
  - Mascotas (Sí / No / Depende)
  - Invitados (Sin problema / Limitados / Prefiero pocos)

### 3.7. Situación de vivienda

- Pregunta: “¿Cuál es tu situación actual?”
  - Select: “Busco piso”, “Tengo piso”, “Busco compañero para mi piso”, etc.
- Ciudad del piso (input o selector)
- Zonas de la ciudad (chips):
  - Casco Antiguo, Triana, Nervión, Viapol, El Plantinar, El Juncal, etc.
- Número de compañeros que buscas (input numérico / slider).
- Rango de presupuesto (slider o dos campos: min/max).

### 3.8. Datos de habitación/piso (si “Tengo piso”)

- m² aproximados
- Tipo de habitación (individual / doble)
- Baño propio / compartido
- Servicios incluidos (luz, agua, wifi, limpieza, etc.)
- Fecha de disponibilidad

### 3.9. Datos asociados

- Tabla `USER`: email, username, password hash.
- Tabla `PROFILE`: nombre, apellidos, edad, bio, intereses, estilo de vida, roles.
- Tabla `HABITACION` + `PISO`: campos de vivienda, m², zona, precio, disponibilidad.

---

## 4. Pantalla de Filtros

### 4.1. Header

- Título “Filtros”
- Botón “Borrar filtros”
- Botón “Aplicar”

### 4.2. Bloques de filtro

- **Situación vivienda**
  - Busco piso / Tengo piso / Indiferente
- **Presupuesto**
  - Rango de precio mínimo y máximo
- **Zonas**
  - Chips seleccionables (como en edición de perfil)
- **Número de compañeros**
  - Rango o lista (1, 2, 3+)
- **Estilo de vida**
  - Checkboxes / chips para:
    - No fuma, Sin mascotas, Muy ordenado/a, Sin problema invitados, etc.
- **Intereses clave**
  - Selección rápida de algunos intereses (ej. “Fiesta”, “Tecnología”, “Viajes”).

### 4.3. Resultado esperado

- Al aplicar filtros, la lista de perfiles en la pantalla de swipes se recalcula.

---

## 5. Pantalla de Lista de Matches y Chats

### 5.1. Estructura general

- **Header**
  - Título: “Chats”
  - Segment control:
    - “Matches”
    - “Mensajes”

- **Lista de matches (grid o lista)** – cuando se selecciona “Matches”
  - Avatares circulares con nombre y pequeña etiqueta:
    - “Nuevo match”
    - Estado: “Tiene piso en Viapol”, “Busca piso en Bami”
  - Tap abre el chat correspondiente.

- **Lista de chats** – cuando se selecciona “Mensajes”
  - Cada ítem:
    - Foto de la otra persona
    - Nombre
    - Zona o etiqueta resumen (ej. “Busca piso en Triana”)
    - Último mensaje (snippet)
    - Hora del último mensaje
    - Badge con número de mensajes no leídos (si >0)

### 5.2. Estados vacíos

- Si no hay matches:
  - Ilustración simple + texto: “Aún no tienes matches. Sigue deslizando en HomiMatch.”
- Si no hay chats:
  - “Cuando habléis por primera vez, tus conversaciones aparecerán aquí.”

### 5.3. Datos asociados

- `MATCH`:
  - `id`, `user_a_id`, `user_b_id`, `estado` (pending/accepted/blocked), `created_at`
- `CHAT`:
  - `id`, `match_id`
- `MESSAGE` (para preview del último mensaje):
  - `body`, `sender_id`, `created_at`, `read_at`

---

## 6. Pantalla de Chat individual

### 6.1. Header

- Foto pequeña del otro usuario
- Nombre + edad
- Subtítulo pequeño:
  - Zona (ej. “Viapol – Piso compartido”)
- Botón de opciones (⋯):
  - Ver perfil
  - Reportar / bloquear
  - Borrar chat

### 6.2. Zona de mensajes

- Listado vertical (scroll):
  - Burbujas alineadas a la derecha (mensajes propios) y a la izquierda (mensajes de la otra persona).
  - Cada burbuja:
    - Texto del mensaje
    - Hora (hh:mm)
    - Estado de entrega (opcional: check sencillo / doble check)
- Separadores por día:
  - “Hoy”, “Ayer”, fecha concreta

### 6.3. Input de mensaje

- Barra fija inferior:
  - Campo de texto multi-línea:
    - Placeholder: “Escribe un mensaje…”
  - Icono para adjuntos (opcional, v1 se puede omitir)
  - Botón de enviar (icono de avión de papel).

### 6.4. Estados

- Estado “match recién creado”:
  - Mensaje de sistema: “Habéis hecho match. Preséntate 🙂”.
- Estado “usuario inactivo/bloqueado”:
  - Mensaje de sistema informativo.

### 6.5. Datos asociados

- `CHAT`: referencia al `match_id`.
- `MESSAGE`:
  - `id`, `chat_id`, `sender_id`, `body`, `created_at`, `read_at`.
- `PROFILE` del otro usuario para mostrar resumen en header.

---

## 7. Pantalla de Perfil Propio (vista no edición)

Puede ser una pestaña en la navegación inferior o accesible desde el menú.

### 7.1. Header

- Foto y nombre grande
- “Ver como otros te ven”
- Icono de edición (lleva a “Editar perfil”)

### 7.2. Secciones

- Igual estructura que la pantalla de detalle de perfil (Sobre, Compañeros, Presupuesto, Estudios, Estilo de vida, Intereses, Detalles de convivencia), pero solo lectura.
- Botones extra:
  - “Gestionar suscripción Premium”
  - “Configuración” (notificaciones, idioma, etc.)

---

## 8. Pantalla de Gestión de Habitaciones / Piso (opcional v0, útil v1)

Solo para usuarios con “Tengo piso”.

### 8.1. Lista de habitaciones/publicaciones

- Card por habitación publicada:
  - Zona, precio, nº compis, estado (Disponible / Reservada / Ocupada).
  - Acciones:
    - Editar
    - Pausar publicación
    - Ver interesados (link a lista de perfiles que han hecho like).

### 8.2. Detalle de habitación

- Campos editables:
  - Fotos del piso/habitación
  - Descripción
  - Servicios incluidos
  - Reglas específicas
  - Disponibilidad

### 8.3. Datos asociados

- `PISO`: info global del piso.
- `HABITACION`: info de la habitación anunciada.
- `INTERES_HABITACION`: relación entre `PROFILE` y `HABITACION` (likes).

---

## 9. Estados y microinteracciones globales

- **Loading**
  - Skeletons en tarjetas / secciones.
- **Error**
  - Mensajes tipo “Algo ha fallado, inténtalo de nuevo”.
- **Empty states**
  - Mensajes amigables en resultados de búsqueda, chats, etc.
- **Premium**
  - Badges “Premium” en usuarios que paguen.
  - Posible highlight en la lista de swipes.

---

## 10. Resumen de entidades de datos vinculadas a UI

- **USER**
  - credenciales, email, username, tipo de usuario, estado premium.
- **PROFILE**
  - datos personales, biografía, estilo de vida, intereses, situación vivienda, zona preferida.
- **PISO**
  - dirección, ciudad, zona, características del piso.
- **HABITACION**
  - superficie, precio, nº compis, disponibilidad, reglas de convivencia.
- **MATCH**
  - relación entre dos usuarios que han hecho like mutuo.
- **CHAT**
  - canal de conversación creado a partir de un match.
- **MESSAGE**
  - mensajes individuales dentro de un chat.

Este esquema de UI cubre las pantallas que has enseñado (swipes, detalle de perfil, edición de perfil) y completa las vistas necesarias para la funcionalidad de chat y gestión básica de habitaciones coherente con el modelo de datos.


## 11. Estructura de carpetas 

src/  
├── components/          # Componentes reutilizables  
├── screens/            # Pantallas principales  
├── navigation/         # Configuración de navegación  
├── theme/              # Sistema de theming  
├── services/           # API y servicios  
├── types/              # Definiciones TypeScript  
├── utils/              # Utilidades  
└── assets/             # Imágenes, fuentes, etc.


## 12. SQL en supabase desplegado

-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.flats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  district text,
  total_rooms integer,
  common_areas_description text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT flats_pkey PRIMARY KEY (id),
  CONSTRAINT flats_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id)
);
CREATE TABLE public.matches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_a_id uuid NOT NULL,
  user_b_id uuid NOT NULL,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text])),
  matched_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT matches_pkey PRIMARY KEY (id),
  CONSTRAINT matches_user_a_id_fkey FOREIGN KEY (user_a_id) REFERENCES public.users(id),
  CONSTRAINT matches_user_b_id_fkey FOREIGN KEY (user_b_id) REFERENCES public.users(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  display_name text,
  avatar_url text,
  bio text,
  gender text,
  occupation text,
  smoker boolean DEFAULT false,
  has_pets boolean DEFAULT false,
  social_links jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES public.users(id)
);
CREATE TABLE public.room_interests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  room_id uuid NOT NULL,
  message text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT room_interests_pkey PRIMARY KEY (id),
  CONSTRAINT room_interests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT room_interests_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id)
);
CREATE TABLE public.rooms (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  flat_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  price_per_month numeric NOT NULL,
  size_m2 numeric,
  is_available boolean DEFAULT true,
  available_from date DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT rooms_pkey PRIMARY KEY (id),
  CONSTRAINT rooms_flat_id_fkey FOREIGN KEY (flat_id) REFERENCES public.flats(id),
  CONSTRAINT rooms_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id)
);
CREATE TABLE public.temp_registrations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  temp_token text NOT NULL UNIQUE,
  email text NOT NULL,
  password text,
  is_google_user boolean DEFAULT false,
  first_name text,
  last_name text,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT temp_registrations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.users (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  first_name text,
  last_name text,
  identity_document text UNIQUE,
  birth_date date,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);