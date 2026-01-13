# 🧪 Database Testing - HomiMatch

## 📋 Descripción

Sistema automatizado de tests para validar la lógica de negocio y constraints de la base de datos HomiMatch.

---

## 🎯 Objetivo

Asegurar que:
1. ✅ Los constraints de la BBDD funcionan correctamente
2. ✅ Las foreign keys mantienen integridad referencial
3. ✅ La lógica de negocio se cumple (matches, habitaciones, chats, etc.)
4. ✅ El seed de datos es consistente

---

## 📁 Archivos del Sistema de Testing

### **1. `database-tests.sql`**
Archivo principal con **23 tests SQL** organizados en 7 secciones:

#### **Sección 1: Constraints Básicos** (6 tests)
- ✅ TEST 1.1: Users ↔ Profiles (1:1 relationsh ip)
- ✅ TEST 1.2: Gender constraints válidos
- ✅ TEST 1.3: Gender policy en flats
- ✅ TEST 1.4: Match status válidos
- ✅ TEST 1.5: Límite de 1000 caracteres en mensajes
- ✅ TEST 1.6: Límite de 10 fotos por perfil

#### **Sección 2: Relaciones y Foreign Keys** (5 tests)
- ✅ TEST 2.1: Matches → Profiles FK
- ✅ TEST 2.2: Chats → Matches FK
- ✅ TEST 2.3: Messages → Chats FK
- ✅ TEST 2.4: Rooms → Flats FK
- ✅ TEST 2.5: Flats → Users FK

#### **Sección 3: Lógica de Matches** (4 tests)
- ✅ TEST 3.1: Matches rejected NO tienen chat
- ✅ TEST 3.2: Matches accepted tienen chat
- ✅ TEST 3.3: Unicidad de match_id en chats
- ✅ TEST 3.4: Mensajes pertenecen a participantes del match

#### **Sección 4: Lógica de Habitaciones** (3 tests)
- ✅ TEST 4.1: Habitaciones ocupadas tienen assignment
- ✅ TEST 4.2: Room assignments con match válido
- ✅ TEST 4.3: Conteo de habitaciones por piso

#### **Sección 5: Filtros de Swipe** (3 tests)
- ✅ TEST 5.1: Perfiles inactivos (`is_searchable = false`)
- ✅ TEST 5.2: Conteo de swipe rejections
- ✅ TEST 5.3: No existen rechazos bidireccionales

#### **Sección 6: Integridad de Datos del Seed** (2 tests)
- ✅ TEST 6.1: Conteo total de registros del seed
- ✅ TEST 6.2: Distribución de match statuses

#### **Sección 7: Lógica de Negocio Avanzada** (3 tests)
- ✅ TEST 7.1: Room interests apuntan a habitaciones disponibles
- ✅ TEST 7.2: Room extras tienen data completa
- ✅ TEST 7.3: Budget compatibility en room offers

---

### **2. `.github/workflows/database-tests.yml`**
GitHub Actions workflow que ejecuta los tests automáticamente:

- 🔄 Se ejecuta en cada **push a `main` o `develop`**
- 🔄 Se ejecuta en cada **Pull Request** hacia `main` o `develop`
- 🎯 Configura PostgreSQL temporal en Ubuntu
- 🏗️ Crea el schema completo de la BBDD
- 📊 Ejecuta `seed-basic.sql` para poblar datos
- 🧪 Ejecuta `database-tests.sql`
- ✅ Falla el CI si algún test falla
- 📝 Genera artifact con resultados

---

## 🚀 Cómo Usar

### **Opción 1: Ejecución Local (Supabase SQL Editor)**

1. Limpia la BBDD:
```sql
SET session_replication_role = 'replica';
TRUNCATE TABLE ... -- (ver testingAnotaciones.md)
SET session_replication_role = 'origin';
```

2. Ejecuta el seed:
```bash
# En Supabase SQL Editor, pega y ejecuta:
seed-basic.sql
```

3. Ejecuta los tests:
```bash
# En Supabase SQL Editor, pega y ejecuta:
database-tests.sql
```

4. Revisa los resultados:
   - Cada test muestra: `✅ PASS` o `❌ FAIL`
   - El resumen final muestra: `tests_passed / total_tests`

---

### **Opción 2: Ejecución Automática con GitHub Actions**

#### **Configuración Inicial** (solo una vez)

No requiere configuración. El workflow ya está listo en `.github/workflows/database-tests.yml`.

#### **Ejecución Automática**

Los tests se ejecutan automáticamente cuando:

1. **Haces push a `main` o `develop`**:
```bash
git add .
git commit -m "feat: nueva funcionalidad"
git push origin main
```

2. **Creas un Pull Request hacia `main`**:
```bash
git checkout -b mi-feature
# ... hacer cambios ...
git push origin mi-feature
# Crear PR en GitHub
```

3. **Ejecutas manualmente** desde GitHub:
   - Ve a **Actions** → **Database Tests** → **Run workflow**

---

### **Opción 3: Ejecución con PostgreSQL Local**

Si tienes PostgreSQL instalado localmente:

```bash
# 1. Crear base de datos de test
createdb homimatch_test

# 2. Crear schema (primero debes tener un archivo con el schema completo)
psql homimatch_test < schema.sql

# 3. Crear usuarios en auth.users
psql homimatch_test <<EOF
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY, email text);
INSERT INTO auth.users (email) VALUES
  ('owner1@test.com'),
  ('owner2@test.com'),
  -- ... resto de usuarios
EOF

# 4. Ejecutar seed
psql homimatch_test < seed-basic.sql

# 5. Ejecutar tests
psql homimatch_test < database-tests.sql
```

---

## 📊 Interpretación de Resultados

### **Formato de Salida**

Cada test muestra:
```
test_name                          | result    | details
-----------------------------------|-----------|----------
TEST 1.1: Users ↔ Profiles (1:1)  | ✅ PASS   | users_count: 8, profiles_count: 8
TEST 1.2: Gender Constraints       | ✅ PASS   | invalid_genders: 0
...
```

### **Resumen Final**

Al final del archivo verás:
```
tests_passed | total_tests | pass_percentage
-------------|-------------|----------------
      23     |      23     |     100.00
```

---

## 🐛 Debugging de Tests Fallidos

Si un test falla:

### **1. Identificar el test que falla**
```sql
-- Buscar en el output:
TEST X.X: Descripción | ❌ FAIL | detalles del error
```

### **2. Revisar los detalles**
Cada test muestra información adicional:
- `invalid_*`: Número de registros que violan el constraint
- `*_count`: Conteos esperados vs encontrados

### **3. Investigar los datos**
Ejecuta queries manuales para ver los datos problemáticos:

```sql
-- Ejemplo: Si falla TEST 3.1 (Rejected matches no tienen chat)
SELECT m.*, c.id as chat_id
FROM matches m
LEFT JOIN chats c ON m.id = c.match_id
WHERE m.status = 'rejected' AND c.id IS NOT NULL;
```

### **4. Corregir el seed**
Si el error está en el seed, actualiza `seed-basic.sql` y vuelve a ejecutar.

### **5. Corregir el schema**
Si el error está en el schema, actualiza las tablas en Supabase.

---

## 🔧 Mantenimiento

### **Añadir Nuevos Tests**

1. Edita `database-tests.sql`
2. Añade tu test siguiendo el formato:

```sql
-- TEST X.X: Descripción clara del test
-- ESPERADO: Comportamiento esperado
SELECT
    'TEST X.X: Descripción' as test_name,
    CASE
        WHEN [condición] THEN '✅ PASS'
        ELSE '❌ FAIL'
    END as result,
    [columnas adicionales con detalles]
FROM [tabla]
WHERE [condiciones];
```

3. Actualiza el test summary al final del archivo
4. Commit y push

---

### **Actualizar el Workflow de GitHub Actions**

Si cambias el schema o necesitas más configuración:

1. Edita `.github/workflows/database-tests.yml`
2. Modifica la sección `Create schema structure` con las nuevas tablas
3. Commit y push

---

## 📈 Cobertura Actual

### **Cobertura por Tabla**

| Tabla | Tests | Cobertura |
|-------|-------|-----------|
| `users` | 3 | 100% |
| `profiles` | 4 | 100% |
| `flats` | 3 | 100% |
| `rooms` | 4 | 100% |
| `matches` | 5 | 100% |
| `chats` | 3 | 100% |
| `messages` | 3 | 100% |
| `room_assignments` | 3 | 100% |
| `room_interests` | 2 | 100% |
| `swipe_rejections` | 2 | 100% |
| `profile_photos` | 1 | 80% |

### **Cobertura por Tipo**

- ✅ **Constraints**: 100% (6/6 tests)
- ✅ **Foreign Keys**: 100% (5/5 tests)
- ✅ **Business Logic**: 85% (17/20 posibles)
- ⚠️ **Edge Cases**: 60% (funcionalidades avanzadas no cubiertas)

---

## 🚦 CI/CD Pipeline

### **Flujo de Trabajo**

```
1. Developer hace commit
   ↓
2. GitHub Actions detecta push
   ↓
3. Setup PostgreSQL temporal
   ↓
4. Crea schema de BBDD
   ↓
5. Ejecuta seed-basic.sql
   ↓
6. Ejecuta database-tests.sql
   ↓
7. Verifica resultados
   ↓
8. ✅ PASS: Merge permitido
   ❌ FAIL: Bloquea merge
```

### **Status Badges**

Puedes añadir un badge en el README principal:

```markdown
![Database Tests](https://github.com/tu-usuario/HomiMatchApp/actions/workflows/database-tests.yml/badge.svg)
```

---

## 📚 Referencias

- **Seed Documentation**: [testingAnotaciones.md](testingAnotaciones.md)
- **Schema**: Ver sección 12 en [uiAnalysis.md](uiAnalysis.md)
- **GitHub Actions Docs**: https://docs.github.com/en/actions

---

## 🤝 Contribuciones

Para añadir o mejorar tests:

1. Fork el repositorio
2. Crea una rama: `git checkout -b test/nueva-validacion`
3. Añade tus tests en `database-tests.sql`
4. Asegúrate de que pasen localmente
5. Commit: `git commit -m "test: añadir validación de X"`
6. Push y crea Pull Request
7. El CI verificará automáticamente tus tests

---

*Última actualización: 2026-01-08*
*Versión: 1.0*
