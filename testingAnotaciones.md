# Testing & Database Seed Documentation

## 📋 Seed de Datos de Prueba

### **Versión**: Seed Básico v1.0
### **Fecha**: 2026-01-08
### **Cobertura**: ~70% de funcionalidades

---

## 🎯 Objetivo del Seed

Crear datos de prueba que permitan testear las funcionalidades principales de la aplicación:
- Swipes y recomendaciones
- Matches y chat
- Ofertas y asignaciones de habitaciones
- Intereses en habitaciones
- Filtros de búsqueda

---

## 👥 Usuarios Creados (8 usuarios)

### **Credenciales**
Todos los usuarios tienen la contraseña: `Test123456!`

| Email | Rol | Género | Housing | Presupuesto | Zonas Preferidas |
|-------|-----|--------|---------|-------------|------------------|
| `owner1@test.com` | Owner | Male | offering | - | Malasaña |
| `owner2@test.com` | Owner | Female | offering | - | Chamberí |
| `seeker1@test.com` | Seeker | Male | seeking | 300-450 EUR | Malasaña, Chueca |
| `seeker2@test.com` | Seeker | Female | seeking | 400-600 EUR | Chamberí, Salamanca |
| `seeker3@test.com` | Seeker | Non-binary | seeking | 500-700 EUR | Lavapiés, Malasaña |
| `seeker4@test.com` | Seeker | Female | seeking | Flexible | Chueca, Chamberí |
| `mixed1@test.com` | Mixed | Male | offering + seeking | 350-500 EUR | Malasaña |
| `mixed2@test.com` | Mixed | Female | offering + seeking | 400-550 EUR | Chamberí |

---

## 🏠 Pisos Creados (2 pisos)

### **Piso 1** (Owner 1 - Malasaña)
- **Dirección**: C/ San Vicente Ferrer 45, 3º A
- **Capacidad Total**: 4 personas
- **Gender Policy**: Mixed (mixto)
- **Servicios**: WiFi, Limpieza semanal, Calefacción central
- **Reglas**: No fumar, Mascotas OK con aviso, Silencio 23:00-08:00

**Habitaciones** (4):
1. Hab Individual 1 - 400 EUR - Disponible
2. Hab Doble 1 - 350 EUR/persona - Ocupada (Owner1)
3. Hab Individual 2 - 450 EUR - Ofertada a Seeker1
4. Hab Doble 2 - 380 EUR/persona - Rechazada por Seeker2

### **Piso 2** (Owner 2 - Chamberí)
- **Dirección**: C/ Alonso Cano 12, 2º B
- **Capacidad Total**: 3 personas
- **Gender Policy**: FLINTA only
- **Servicios**: WiFi, Aire acondicionado, Terraza
- **Reglas**: No fumar, No mascotas, Limpieza rotativa

**Habitaciones** (3):
1. Hab Individual 1 - 500 EUR - Disponible
2. Hab Individual 2 - 480 EUR - Ocupada (Owner2)
3. Hab Individual 3 - 520 EUR - Disponible

---

## 🔄 Interacciones Creadas

### **Matches** (5 matches)

| ID | User A | User B | Status | Descripción |
|----|--------|--------|--------|-------------|
| M1 | Owner1 | Seeker1 | `room_offer` | Owner1 ofreció habitación a Seeker1 |
| M2 | Seeker2 | Owner1 | `rejected` | Seeker2 rechazó match con Owner1 |
| M3 | Seeker3 | Seeker4 | `accepted` | Match mutuo entre seekers (chat activo) |
| M4 | Mixed1 | Seeker1 | `pending` | Match pendiente de respuesta |
| M5 | Owner2 | Seeker2 | `accepted` | Match aceptado con chat |

### **Room Assignments** (4 asignaciones)

| ID | Room | Assignee | Status | Match |
|----|------|----------|--------|-------|
| A1 | Piso1-Hab2 | Owner1 | `accepted` | - |
| A1b | Piso2-Hab2 | Owner2 | `accepted` | - |
| A2 | Piso1-Hab3 | Seeker1 | `offered` | M1 |
| A3 | Piso1-Hab4 | Seeker2 | `rejected` | M2 |

### **Swipe Rejections** (4 rechazos)

- Seeker1 rechazó a Seeker2
- Seeker1 rechazó a Mixed2
- Seeker3 rechazó a Mixed1
- Owner2 rechazó a Seeker4 (por ser male)

### **Room Interests** (2 intereses)

- Seeker3 mostró interés en Piso2-Hab1
- Seeker4 mostró interés en Piso1-Hab1

### **Messages** (12 mensajes)

**Chat M3** (Seeker3 ↔ Seeker4):
- 6 mensajes intercambiados
- Último mensaje hace 1 hora

**Chat M5** (Owner2 ↔ Seeker2):
- 6 mensajes intercambiados
- Último mensaje hace 30 minutos

### **Profile Photos** (2-3 fotos por usuario)

Todos los usuarios tienen 2-3 fotos en su perfil.

---

## ✅ Casos de Uso Cubiertos

### **Perfiles**
- ✅ Todos los géneros (male, female, non_binary)
- ✅ Housing situations (seeking, offering, mixed)
- ✅ Presupuestos variados (bajo, medio, alto, flexible)
- ✅ Perfiles activos (`is_searchable = true`)
- ✅ Perfiles inactivos (`is_searchable = false`)
- ✅ Con/sin mascotas
- ✅ Fumadores/no fumadores
- ✅ Diferentes intereses y lifestyles
- ✅ Diferentes zonas preferidas

### **Habitaciones**
- ✅ Individuales y dobles
- ✅ Disponibles y ocupadas
- ✅ Diferentes rangos de precio
- ✅ Distintas fechas de disponibilidad

### **Matches**
- ✅ `pending` (sin responder)
- ✅ `accepted` (aceptado con chat)
- ✅ `rejected` (rechazado)
- ✅ `room_offer` (oferta de habitación)
- ❌ `room_assigned` (NO incluido - añadir manualmente si necesario)
- ❌ `room_declined` (NO incluido - estado poco común)

### **Filtros Testeables**
- ✅ Por género
- ✅ Por housing situation
- ✅ Por presupuesto
- ✅ Por zona
- ✅ Por número de roommates deseados
- ✅ Por intereses
- ✅ Por lifestyle

---

## ❌ Lo que NO está incluido

### **Funcionalidades NO cubiertas** (requieren seed avanzado):
- ❌ Gastos compartidos (`flat_expenses`)
- ❌ Liquidaciones de gastos (`flat_settlement_payments`)
- ❌ Códigos de invitación a habitaciones (`room_invitations`)
- ❌ Push tokens (`push_tokens`)
- ❌ Registros temporales (`temp_registrations`)

### **Casos Edge NO cubiertos**:
- ❌ Usuario sin fotos
- ❌ Usuario con 10 fotos (máximo)
- ❌ Piso sin habitaciones disponibles
- ❌ Habitación sin foto
- ❌ Social links en perfiles
- ❌ Match con estado `room_declined`

---

## 🗄️ Queries SQL

### **1. Limpiar Base de Datos (Conserva Cities)**

```sql
SET session_replication_role = 'replica';

TRUNCATE TABLE
  public.messages,
  public.chats,
  public.room_assignments,
  public.room_interests,
  public.room_invitations,
  public.room_extras,
  public.rooms,
  public.flat_expense_participants,
  public.flat_expenses,
  public.flat_settlement_payments,
  public.flats,
  public.matches,
  public.swipe_rejections,
  public.profile_photos,
  public.profiles,
  public.push_tokens,
  public.place_search_counts,
  public.city_search_counts,
  public.temp_registrations,
  public.users
CASCADE;

SET session_replication_role = 'origin';
```

### **2. Seed Básico de Datos**

*Ver archivo: `seed-basic.sql`*

---

## 📝 Notas de Testing

### **Cómo usar el seed**:

1. **Limpiar base de datos**:
   ```bash
   # Ejecutar query de limpieza en Supabase SQL Editor
   ```

2. **Aplicar seed**:
   ```bash
   # Ejecutar seed-basic.sql en Supabase SQL Editor
   ```

3. **Login con usuarios de prueba**:
   - Email: `seeker1@test.com`
   - Password: `Test123456!`

### **Escenarios de prueba**:

#### **Test 1: Swipes**
- Login como `seeker1@test.com`
- Deberías ver perfiles de: Owner1, Owner2, Seeker2, Seeker3, Seeker4, Mixed1, Mixed2
- NO deberías ver: Seeker2 (rechazado), Mixed2 (rechazado)

#### **Test 2: Matches**
- Login como `seeker1@test.com`
- Deberías tener 2 matches:
  - Match con Owner1 (estado: `room_offer`)
  - Match con Mixed1 (estado: `pending`)

#### **Test 3: Chat**
- Login como `seeker3@test.com`
- Deberías tener chat activo con Seeker4
- 6 mensajes intercambiados

#### **Test 4: Room Interests**
- Login como `owner1@test.com`
- Habitación 1 debería tener 1 interesado (Seeker4)

#### **Test 5: Filtros**
- Login como `seeker1@test.com`
- Filtrar por presupuesto 300-450 EUR
- Deberían aparecer solo perfiles compatibles

#### **Test 6: Perfil Activo/Inactivo**
- Login como cualquier usuario
- Ir a perfil
- Toggle "Perfil activo"
- Verificar que desapareces/apareces en swipes de otros

---

## 🔄 Mantenimiento

### **Actualizar seed**:
1. Modificar archivo `seed-basic.sql`
2. Actualizar esta documentación
3. Incrementar versión

### **Añadir casos avanzados**:
- Crear `seed-advanced.sql` con gastos, invitaciones, etc.
- Documentar en sección separada

---

## 📚 Referencias

- **Schema**: Ver archivo raíz con schema completo de la DB
- **UI Analysis**: `docs/uiAnalysis.md`
- **API Docs**: Supabase Dashboard

---

*Última actualización: 2026-01-08*
*Autor: Testing Team*
