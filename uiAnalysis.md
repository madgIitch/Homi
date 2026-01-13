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

--- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.chats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chats_pkey PRIMARY KEY (id),
  CONSTRAINT chats_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id)
);
CREATE TABLE public.flat_expense_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL,
  member_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT flat_expense_participants_pkey PRIMARY KEY (id),
  CONSTRAINT flat_expense_participants_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES public.flat_expenses(id),
  CONSTRAINT flat_expense_participants_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.flat_expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  flat_id uuid NOT NULL,
  created_by uuid NOT NULL,
  concept text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0::numeric),
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT flat_expenses_pkey PRIMARY KEY (id),
  CONSTRAINT flat_expenses_flat_id_fkey FOREIGN KEY (flat_id) REFERENCES public.flats(id),
  CONSTRAINT flat_expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.flat_settlement_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  flat_id uuid NOT NULL,
  month text NOT NULL,
  from_id uuid NOT NULL,
  to_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0::numeric),
  marked_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT flat_settlement_payments_pkey PRIMARY KEY (id),
  CONSTRAINT flat_settlement_payments_flat_id_fkey FOREIGN KEY (flat_id) REFERENCES public.flats(id),
  CONSTRAINT flat_settlement_payments_from_id_fkey FOREIGN KEY (from_id) REFERENCES public.profiles(id),
  CONSTRAINT flat_settlement_payments_to_id_fkey FOREIGN KEY (to_id) REFERENCES public.profiles(id),
  CONSTRAINT flat_settlement_payments_marked_by_fkey FOREIGN KEY (marked_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.flats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  district text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  rules text,
  services jsonb DEFAULT '[]'::jsonb,
  gender_policy text NOT NULL DEFAULT 'mixed'::text CHECK (gender_policy = ANY (ARRAY['mixed'::text, 'men_only'::text, 'flinta'::text])),
  CONSTRAINT flats_pkey PRIMARY KEY (id),
  CONSTRAINT flats_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id)
);
CREATE TABLE public.matches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_a_id uuid NOT NULL,
  user_b_id uuid NOT NULL,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text, 'room_offer'::text, 'room_assigned'::text, 'room_declined'::text])),
  matched_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT matches_pkey PRIMARY KEY (id),
  CONSTRAINT matches_user_a_id_fkey FOREIGN KEY (user_a_id) REFERENCES public.profiles(id),
  CONSTRAINT matches_user_b_id_fkey FOREIGN KEY (user_b_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  body text NOT NULL CHECK (length(body) <= 1000),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  read_at timestamp with time zone,
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.profile_photos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  path text NOT NULL,
  position integer NOT NULL CHECK ("position" >= 1 AND "position" <= 10),
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profile_photos_pkey PRIMARY KEY (id),
  CONSTRAINT profile_photos_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  avatar_url text,
  bio text,
  gender text NOT NULL CHECK (gender = ANY (ARRAY['male'::text, 'female'::text, 'non_binary'::text, 'other'::text, 'undisclosed'::text])),
  occupation text,
  smoker boolean DEFAULT false,
  has_pets boolean DEFAULT false,
  social_links jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  university text,
  field_of_study text,
  interests jsonb,
  lifestyle_preferences jsonb,
  housing_situation text,
  preferred_zones jsonb,
  budget_min numeric,
  budget_max numeric,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES public.users(id)
);
CREATE TABLE public.push_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform = ANY (ARRAY['ios'::text, 'android'::text])),
  device_id text,
  device_name text,
  app_version text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  last_used_at timestamp with time zone,
  provider text NOT NULL CHECK (provider = ANY (ARRAY['fcm'::text, 'apns'::text])),
  CONSTRAINT push_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT push_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.room_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  match_id uuid UNIQUE,
  room_id uuid NOT NULL,
  assignee_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'offered'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT room_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT room_assignments_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id),
  CONSTRAINT room_assignments_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.profiles(id),
  CONSTRAINT room_assignments_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id)
);
CREATE TABLE public.room_extras (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL,
  category text,
  room_type text,
  common_area_type text,
  common_area_custom text,
  photos ARRAY NOT NULL DEFAULT '{}'::text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT room_extras_pkey PRIMARY KEY (id),
  CONSTRAINT room_extras_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id)
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
CREATE TABLE public.room_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  code text NOT NULL UNIQUE,
  expires_at timestamp with time zone,
  used_at timestamp with time zone,
  used_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT room_invitations_pkey PRIMARY KEY (id),
  CONSTRAINT room_invitations_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id),
  CONSTRAINT room_invitations_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id),
  CONSTRAINT room_invitations_used_by_fkey FOREIGN KEY (used_by) REFERENCES public.users(id)
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
CREATE TABLE public.swipe_rejections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  rejected_profile_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT swipe_rejections_pkey PRIMARY KEY (id),
  CONSTRAINT swipe_rejections_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT swipe_rejections_rejected_profile_id_fkey FOREIGN KEY (rejected_profile_id) REFERENCES public.profiles(id)
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
  gender text CHECK ((gender = ANY (ARRAY['male'::text, 'female'::text, 'non_binary'::text, 'other'::text, 'undisclosed'::text])) OR gender IS NULL),
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
  gender text NOT NULL CHECK (gender = ANY (ARRAY['male'::text, 'female'::text, 'non_binary'::text, 'other'::text, 'undisclosed'::text])),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);




























# UI Analysis - Swipe Cards para Propietarios (Owners)

## 📋 Contexto

Los perfiles con `housing_situation === 'offering'` tienen pisos con habitaciones disponibles. Actualmente, las swipe cards no muestran información del piso, lo cual es información crítica para los usuarios que buscan habitación.

---

## 🎯 Opciones de Diseño

### **Opción 1: Sección Expandible "Ver Piso"** ⭐ RECOMENDADA

#### Descripción
Agregar un botón colapsable/expandible debajo de la bio que revela información del piso al hacer tap.

#### Mockup Visual
```
┌─────────────────────────────────────┐
│         [FOTO PERFIL]               │
│       (carousel de fotos)           │
├─────────────────────────────────────┤
│ Nombre, 25        [Ofrezco piso]    │
│                                     │
│ 💰 400 EUR  📍 Malasaña             │
│ 🎯 Arte  🌟 Activo                  │
│                                     │
│ Bio del usuario en tres líneas      │
│ mostrando su personalidad y...     │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ▼ Ver piso (3 habitaciones)     │ │ ← Colapsable
│ └─────────────────────────────────┘ │
│                                     │
│ [Ver perfil completo →]             │
└─────────────────────────────────────┘

Al expandir ▼:

┌─────────────────────────────────────┐
│ ▲ Ocultar piso                      │
├─────────────────────────────────────┤
│ 📸 [Mini galería - 3 fotos scroll]  │
│ ┌────┐ ┌────┐ ┌────┐               │
│ │Hab1│ │Hab2│ │Salón│              │
│ └────┘ └────┘ └────┘               │
│                                     │
│ 🏠 Piso de 120m² en C/ Gran Vía     │
│ 🚪 3 habitaciones, 2 baños          │
│ ✨ WiFi, Limpieza incluida          │
│ 📜 No fumar, Mascotas OK            │
│                                     │
│ 💰 Habitaciones desde 350 EUR/mes   │
└─────────────────────────────────────┘
```

#### Ventajas
- ✅ No sobrecarga la card inicialmente
- ✅ El usuario decide si quiere ver más información
- ✅ Muestra datos agregados del piso completo
- ✅ Contexto claro (reglas, servicios, características)
- ✅ Galería de fotos del piso separada de fotos de perfil

#### Desventajas
- ❌ Requiere interacción adicional (tap para expandir)
- ❌ Puede no ser obvio que es colapsable
- ❌ Aumenta la altura de la card cuando está expandido

#### Implementación
```typescript
const [expandedFlats, setExpandedFlats] = useState<Record<string, boolean>>({});

const toggleFlatInfo = (profileId: string) => {
  setExpandedFlats(prev => ({
    ...prev,
    [profileId]: !prev[profileId]
  }));
};

// En el renderCard:
{profile.housing === 'offering' && profile.flat && (
  <View style={styles.flatSection}>
    <TouchableOpacity
      style={styles.flatToggle}
      onPress={() => toggleFlatInfo(profile.id)}
    >
      <Ionicons
        name={expandedFlats[profile.id] ? 'chevron-up' : 'chevron-down'}
        size={16}
      />
      <Text style={styles.flatToggleText}>
        {expandedFlats[profile.id] ? 'Ocultar' : 'Ver'} piso
        ({profile.rooms?.length} habitaciones)
      </Text>
    </TouchableOpacity>

    {expandedFlats[profile.id] && (
      <View style={styles.flatContent}>
        {/* Galería mini de fotos */}
        {/* Info del piso */}
        {/* Servicios y reglas */}
      </View>
    )}
  </View>
)}
```

#### Datos Necesarios
```typescript
type SwipeProfile = {
  // ... campos existentes
  flat?: {
    id: string;
    address: string;
    size?: number;
    totalRooms: number;
    bathrooms: number;
    services: string[];
    rules: string[];
    photos: string[]; // Fotos del piso/zonas comunes
  };
  rooms?: Array<{
    id: string;
    title: string;
    price: number;
    photoUrl: string;
    type: 'individual' | 'doble';
    isAvailable: boolean;
  }>;
};
```

---

### **Opción 2: Carousel de Fotos Mixto**

#### Descripción
Mezclar fotos del perfil personal con fotos del piso en el mismo carousel de la swipe card.

#### Mockup Visual
```
┌─────────────────────────────────────┐
│   [FOTO PERFIL]                     │
│   📷 Foto 1/5                       │
│   Badge: "Perfil"                   │
├─────────────────────────────────────┤
│ Nombre, 25        [Ofrezco piso]    │
│ ... badges y bio ...                │
└─────────────────────────────────────┘

← Swipe derecha →

┌─────────────────────────────────────┐
│   [FOTO HABITACIÓN 1]               │
│   📷 Foto 2/5                       │
│   Badge: "🏠 Habitación - 400€"     │
├─────────────────────────────────────┤
│ Nombre, 25        [Ofrezco piso]    │
│ ... badges y bio ...                │
└─────────────────────────────────────┘

← Swipe derecha →

┌─────────────────────────────────────┐
│   [FOTO HABITACIÓN 2]               │
│   📷 Foto 3/5                       │
│   Badge: "🏠 Habitación - 450€"     │
├─────────────────────────────────────┤
│ Nombre, 25        [Ofrezco piso]    │
│ ... badges y bio ...                │
└─────────────────────────────────────┘

← Swipe derecha →

┌─────────────────────────────────────┐
│   [FOTO SALÓN/COCINA]               │
│   📷 Foto 4/5                       │
│   Badge: "🏠 Zonas comunes"         │
├─────────────────────────────────────┤
│ Nombre, 25        [Ofrezco piso]    │
│ ... badges y bio ...                │
└─────────────────────────────────────┘
```

#### Ventajas
- ✅ Usa el espacio de fotos existente (no cambia layout)
- ✅ Flujo natural de navegación (swipe izq/der)
- ✅ Muestra fotos reales del piso
- ✅ Fácil de implementar (solo agregar fotos al array)
- ✅ Badge contextual indica qué es cada foto

#### Desventajas
- ❌ Puede confundir (mezcla persona y espacio)
- ❌ Dilluye fotos del perfil personal
- ❌ No muestra info agregada del piso (servicios, reglas)
- ❌ Usuario puede no ver todas las fotos del piso

#### Implementación
```typescript
const getProfilePhotos = (profile: SwipeProfile) => {
  const photos: Array<{ url: string; type: 'profile' | 'room' | 'common'; label?: string; price?: number }> = [];

  // Fotos del perfil
  const profilePhotos = profilePhotosById[profile.id] ?? [profile.photoUrl];
  profilePhotos.forEach(url => {
    photos.push({ url, type: 'profile' });
  });

  // Fotos de habitaciones (si es owner)
  if (profile.housing === 'offering' && profile.rooms) {
    profile.rooms.forEach(room => {
      if (room.photoUrl) {
        photos.push({
          url: room.photoUrl,
          type: 'room',
          label: room.title,
          price: room.price
        });
      }
    });
  }

  // Fotos de zonas comunes
  if (profile.flat?.photos) {
    profile.flat.photos.forEach(url => {
      photos.push({ url, type: 'common', label: 'Zonas comunes' });
    });
  }

  return photos;
};

// En el render de la foto:
{currentPhoto.type !== 'profile' && (
  <View style={styles.photoBadge}>
    <Text style={styles.photoBadgeText}>
      {currentPhoto.type === 'room'
        ? `🏠 ${currentPhoto.label} - ${currentPhoto.price}€`
        : `🏠 ${currentPhoto.label}`
      }
    </Text>
  </View>
)}
```

#### Datos Necesarios
- Mismo que Opción 1, pero solo necesita URLs de fotos

---

### **Opción 3: Modal Bottom Sheet al Tap en Badge**

#### Descripción
Cuando el usuario hace tap en el badge "Ofrezco piso", se abre un modal tipo bottom sheet con información detallada del piso.

#### Mockup Visual
```
Card inicial:
┌─────────────────────────────────────┐
│         [FOTO PERFIL]               │
├─────────────────────────────────────┤
│ Nombre, 25    [Ofrezco piso] ← TAP  │
│ ... bio ...                         │
└─────────────────────────────────────┘

↓ Al hacer tap en "Ofrezco piso"

┌─────────────────────────────────────┐
│                                     │
│                                     │
│  ╔═══════════════════════════════╗  │
│  ║  🏠 Piso en Malasaña          ║  │
│  ║                               ║  │
│  ║  [Carousel 3-4 fotos]         ║  │
│  ║  ← → Habitaciones             ║  │
│  ║                               ║  │
│  ║  📍 C/ Gran Vía 123, 3º izq   ║  │
│  ║  📏 120m² • 🚪 4 hab • 🚿 2 ba║  │
│  ║                               ║  │
│  ║  💰 Habitaciones disponibles: ║  │
│  ║  • Hab 1: 400 EUR individual  ║  │
│  ║  • Hab 2: 450 EUR doble       ║  │
│  ║  • Hab 3: 350 EUR individual  ║  │
│  ║                               ║  │
│  ║  ✅ Servicios incluidos:      ║  │
│  ║  WiFi, Limpieza, Calefacción  ║  │
│  ║                               ║  │
│  ║  📜 Reglas:                   ║  │
│  ║  ❌ No fumar                  ║  │
│  ║  ✅ Mascotas OK               ║  │
│  ║  ⏰ Silencio 23:00-08:00      ║  │
│  ║                               ║  │
│  ║  [Ver detalles completos →]   ║  │
│  ║                               ║  │
│  ║  [Cerrar]                     ║  │
│  ╚═══════════════════════════════╝  │
└─────────────────────────────────────┘
```

#### Ventajas
- ✅ No modifica la card inicial (limpia y simple)
- ✅ Espacio ilimitado para mostrar información
- ✅ Foco total en el piso cuando se abre
- ✅ Puede incluir botones de acción ("Ver detalles", "Contactar")
- ✅ Familiar (patrón común en apps)

#### Desventajas
- ❌ Requiere tap adicional (fricción)
- ❌ No es obvio que el badge es interactivo
- ❌ Puede interrumpir el flujo de swipe
- ❌ Requiere cerrar modal para continuar

#### Implementación
```typescript
const [flatModalVisible, setFlatModalVisible] = useState(false);
const [selectedFlat, setSelectedFlat] = useState<SwipeProfile['flat'] | null>(null);

const openFlatModal = (flat: SwipeProfile['flat']) => {
  setSelectedFlat(flat);
  setFlatModalVisible(true);
};

// En el badge:
<Pressable
  style={styles.badge}
  onPress={() => profile.flat && openFlatModal(profile.flat)}
>
  <Text style={styles.badgeText}>Ofrezco piso</Text>
  <Ionicons name="information-circle-outline" size={12} />
</Pressable>

// Modal:
<Modal
  visible={flatModalVisible}
  transparent
  animationType="slide"
  onRequestClose={() => setFlatModalVisible(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.flatModalContent}>
      {/* Carousel de fotos */}
      {/* Info completa del piso */}
      {/* Botones de acción */}
    </View>
  </View>
</Modal>
```

#### Datos Necesarios
- Mismo que Opción 1 + dirección completa del piso

---

### **Opción 4: Mini-Cards Horizontales de Habitaciones** 🌟 FAVORITA

#### Descripción
Agregar una sección de scroll horizontal con mini-cards de las habitaciones disponibles, mostrando foto, precio y tipo.

#### Mockup Visual
```
┌─────────────────────────────────────┐
│         [FOTO PERFIL]               │
│       (carousel de fotos)           │
├─────────────────────────────────────┤
│ Nombre, 25        [Ofrezco piso]    │
│                                     │
│ 💰 400 EUR  📍 Malasaña             │
│ 🎯 Arte  🌟 Activo                  │
│                                     │
│ Bio del usuario en tres líneas      │
│ mostrando su personalidad...        │
│                                     │
│ 🏠 3 habitaciones disponibles:      │
│                                     │
│ ┌──────┐ ┌──────┐ ┌──────┐ ← scroll│
│ │[📸] │ │[📸] │ │[📸] │         │
│ │      │ │      │ │      │         │
│ │400 € │ │450 € │ │350 € │         │
│ │Indiv.│ │Doble │ │Indiv.│         │
│ └──────┘ └──────┘ └──────┘         │
│                                     │
│ 📏 120m² • 🚪 4 hab • 🚿 2 baños    │
│ ✅ WiFi, Limpieza  ❌ No fumar      │
│                                     │
│ [Ver perfil completo →]             │
└─────────────────────────────────────┘
```

#### Ventajas
- ✅ Información clave visible sin interacción
- ✅ Muestra precio específico de cada habitación
- ✅ Visual, intuitivo y atractivo
- ✅ Ocupa poco espacio vertical
- ✅ Fácil comparación entre habitaciones
- ✅ No interrumpe el flujo de swipe
- ✅ Info agregada del piso debajo (tamaño, servicios)

#### Desventajas
- ❌ Aumenta altura de la card
- ❌ Puede ser mucha info en pantalla
- ❌ Scroll horizontal dentro de card (puede confundir con swipe)

#### Implementación
```typescript
// En el renderCard, después de la bio:
{profile.housing === 'offering' && profile.rooms && profile.rooms.length > 0 && (
  <View style={styles.flatPreview}>
    <Text style={styles.flatPreviewTitle}>
      🏠 {profile.rooms.length} habitación{profile.rooms.length > 1 ? 'es' : ''} disponible{profile.rooms.length > 1 ? 's' : ''}
    </Text>

    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.roomsScroll}
    >
      {profile.rooms.map((room) => (
        <View key={room.id} style={styles.roomMiniCard}>
          <Image
            source={{ uri: room.photoUrl }}
            style={styles.roomMiniPhoto}
          />
          <Text style={styles.roomMiniPrice}>{room.price} €</Text>
          <Text style={styles.roomMiniType}>
            {room.type === 'individual' ? 'Indiv.' : 'Doble'}
          </Text>
        </View>
      ))}
    </ScrollView>

    {/* Info agregada del piso */}
    <View style={styles.flatInfoRow}>
      {profile.flat?.size && (
        <Text style={styles.flatInfoItem}>📏 {profile.flat.size}m²</Text>
      )}
      <Text style={styles.flatInfoItem}>
        🚪 {profile.flat?.totalRooms} hab
      </Text>
      <Text style={styles.flatInfoItem}>
        🚿 {profile.flat?.bathrooms} baños
      </Text>
    </View>

    {/* Servicios y reglas principales */}
    <View style={styles.flatTagsRow}>
      {profile.flat?.services?.slice(0, 2).map((service) => (
        <Text key={service} style={styles.flatTag}>✅ {service}</Text>
      ))}
      {profile.flat?.rules?.slice(0, 2).map((rule) => (
        <Text key={rule} style={styles.flatTag}>📜 {rule}</Text>
      ))}
    </View>
  </View>
)}
```

#### Estilos Necesarios
```typescript
flatPreview: {
  marginTop: spacing.md,
  gap: spacing.sm,
},
flatPreviewTitle: {
  fontSize: 14,
  fontWeight: '600',
  color: colors.text,
},
roomsScroll: {
  flexDirection: 'row',
},
roomMiniCard: {
  width: 90,
  marginRight: spacing.sm,
  borderRadius: borderRadius.md,
  overflow: 'hidden',
  backgroundColor: colors.glassSurface,
  borderWidth: 1,
  borderColor: colors.glassBorderSoft,
},
roomMiniPhoto: {
  width: '100%',
  height: 80,
  backgroundColor: colors.surfaceLight,
},
roomMiniPrice: {
  fontSize: 13,
  fontWeight: '700',
  color: colors.text,
  padding: spacing.xs,
  textAlign: 'center',
},
roomMiniType: {
  fontSize: 11,
  color: colors.textSecondary,
  paddingHorizontal: spacing.xs,
  paddingBottom: spacing.xs,
  textAlign: 'center',
},
flatInfoRow: {
  flexDirection: 'row',
  gap: spacing.sm,
  flexWrap: 'wrap',
},
flatInfoItem: {
  fontSize: 12,
  color: colors.textSecondary,
},
flatTagsRow: {
  flexDirection: 'row',
  gap: spacing.xs,
  flexWrap: 'wrap',
},
flatTag: {
  fontSize: 11,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  backgroundColor: colors.glassUltraLightAlt,
  borderRadius: borderRadius.sm,
  color: colors.text,
},
```

#### Datos Necesarios
```typescript
type SwipeProfile = {
  // ... campos existentes
  flat?: {
    id: string;
    size?: number;
    totalRooms: number;
    bathrooms: number;
    services: string[]; // Ej: ['WiFi', 'Limpieza', 'Calefacción']
    rules: string[]; // Ej: ['No fumar', 'Mascotas OK']
  };
  rooms: Array<{
    id: string;
    title: string;
    price: number;
    photoUrl: string;
    type: 'individual' | 'doble';
    isAvailable: boolean;
  }>;
};
```

---

## 📊 Comparativa de Opciones

| Criterio | Opción 1<br/>Expandible | Opción 2<br/>Carousel Mixto | Opción 3<br/>Modal | Opción 4<br/>Mini-Cards |
|----------|-------------------------|------------------------------|-------------------|------------------------|
| **UX** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Info Visible** | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Fricción** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Espacio** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Implementación** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Claridad** | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 🎯 Recomendación Final

### **Combinación de Opciones 1 + 4**

**Fase 1 (MVP)**: Implementar **Opción 4 (Mini-Cards)**
- Mostrar habitaciones en scroll horizontal
- Info básica del piso (tamaño, hab, baños)
- 2-3 servicios/reglas principales

**Fase 2 (Futuro)**: Agregar **Opción 1 (Expandible)**
- Al hacer tap en el título "🏠 3 habitaciones disponibles"
- Se expande para mostrar más info (todas las reglas, todos los servicios)
- Galería completa de fotos del piso

### Justificación
- ✅ Información clave visible sin fricción
- ✅ No abruma al usuario inicialmente
- ✅ Permite profundizar si hay interés
- ✅ Fácil de implementar progresivamente
- ✅ Mejor conversión (los seekers ven precios reales)

---

## 📝 Notas de Implementación

### Carga de Datos
Para cualquier opción, necesitamos modificar `getProfileRecommendations` para incluir:

```sql
-- En el endpoint de recomendaciones
SELECT
  p.*,
  -- Si es owner, cargar flat y rooms
  (
    SELECT json_build_object(
      'id', f.id,
      'size', f.size,
      'totalRooms', f.capacity_total,
      'bathrooms', f.bathrooms,
      'services', f.services,
      'rules', f.rules
    )
    FROM flats f
    WHERE f.owner_id = p.id
    LIMIT 1
  ) as flat,
  (
    SELECT json_agg(json_build_object(
      'id', r.id,
      'title', r.title,
      'price', r.price_per_month,
      'type', re.room_type,
      'photoUrl', (
        SELECT rp.signed_url
        FROM room_photos rp
        WHERE rp.room_id = r.id AND rp.is_primary = true
        LIMIT 1
      ),
      'isAvailable', r.is_available
    ))
    FROM rooms r
    LEFT JOIN room_extras re ON re.room_id = r.id
    WHERE r.owner_id = p.id AND r.is_available = true
  ) as rooms
FROM profiles p
WHERE p.housing_situation = 'offering'
```

### Performance
- Usar lazy loading para fotos de habitaciones
- Cachear datos del piso en memoria
- Limitar a 3-4 habitaciones en preview inicial

---

## 🔄 Historial de Decisiones

| Fecha | Decisión | Razón |
|-------|----------|-------|
| 2026-01-06 | Documento creado | Explorar opciones para swipe cards de owners |

---

## 📚 Referencias

- Tinder: Muestra info básica en card, detalles en perfil completo
- Bumble: Usa badges interactivos
- Airbnb: Mini-cards horizontales para propiedades similares
- Idealista: Carousel de fotos de propiedades
