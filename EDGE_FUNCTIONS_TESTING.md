# 🧪 Edge Functions Testing Guide

Documentación completa del sistema de testing para las Edge Functions de HomiMatch.

---

## 📋 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Estructura de Tests](#estructura-de-tests)
3. [Tests Disponibles](#tests-disponibles)
4. [Ejecutar Tests](#ejecutar-tests)
5. [GitHub Actions CI/CD](#github-actions-cicd)
6. [Escribir Nuevos Tests](#escribir-nuevos-tests)
7. [Utilidades de Testing](#utilidades-de-testing)
8. [Best Practices](#best-practices)

---

## 🎯 Visión General

El sistema de testing de edge functions valida:

- ✅ **Validación de datos**: Formatos, tipos y constraints
- ✅ **Lógica de negocio**: Flujos correctos y transiciones de estado
- ✅ **Autenticación y permisos**: Acceso y autorización
- ✅ **Manejo de errores**: Códigos HTTP y mensajes apropiados
- ✅ **Estructura de respuestas**: Schemas y formatos JSON
- ✅ **CORS y headers**: Configuración correcta

### Tecnologías

- **Deno**: Runtime para TypeScript/JavaScript
- **Test Framework**: Custom runner con assertions
- **CI/CD**: GitHub Actions
- **Edge Functions**: Supabase Deno Functions

---

## 📁 Estructura de Tests

```
supabase/functions/
├── _tests/
│   ├── test-utils.ts           # Utilidades compartidas
│   ├── auth-login.test.ts      # Tests de autenticación
│   ├── profiles.test.ts        # Tests de perfiles
│   ├── matches.test.ts         # Tests de matches
│   └── run-all-tests.ts        # Runner consolidado
├── _shared/
│   ├── auth.ts                 # Auth middleware
│   ├── cors.ts                 # CORS headers
│   └── types.ts                # TypeScript types
├── auth-login/
│   └── index.ts
├── profiles/
│   └── index.ts
└── matches/
    └── index.ts
```

---

## 📝 Tests Disponibles

### 1. **auth-login.test.ts** (15 tests)

Valida la edge function de autenticación:

#### Categorías de Tests:
- **Validación de Request** (3 tests)
  - Email requerido
  - Password requerido
  - Formato de email válido

- **Métodos HTTP** (3 tests)
  - Rechazar GET
  - Aceptar POST
  - Aceptar OPTIONS (CORS)

- **Estructura de Respuesta** (1 test)
  - Campos obligatorios del token

- **Validación de Datos** (2 tests)
  - Longitud mínima de password
  - Formato de email

- **Headers** (2 tests)
  - Headers CORS
  - Content-Type JSON

- **Códigos de Error** (4 tests)
  - 400: Bad Request
  - 401: Unauthorized
  - 405: Method Not Allowed
  - 500: Internal Server Error

**Total**: 15 tests

### 2. **profiles.test.ts** (22 tests)

Valida CRUD operations de perfiles:

#### Categorías de Tests:
- **Validación de Datos** (5 tests)
  - Gender válido
  - Housing situation válido
  - Tipos de datos correctos
  - Budget min/max
  - Roommates min/max

- **Métodos HTTP** (4 tests)
  - GET requiere auth
  - POST requiere auth
  - PATCH requiere auth
  - DELETE requiere auth

- **Estructura de Datos** (1 test)
  - Schema completo del perfil

- **Validación de Arrays** (2 tests)
  - Interests array de strings
  - Preferred zones array de strings

- **Lifestyle Preferences** (1 test)
  - Estructura correcta

- **Códigos de Estado** (7 tests)
  - 200: GET exitoso
  - 404: Perfil no encontrado
  - 409: Perfil ya existe
  - 201: POST exitoso
  - Etc.

- **Social Links** (1 test)
  - Objeto JSON válido

- **Permisos** (1 test)
  - Usuario solo ve su perfil

**Total**: 22 tests

### 3. **matches.test.ts** (25 tests)

Valida lógica de matches:

#### Categorías de Tests:
- **Validación de Match Status** (1 test)
  - Status válidos

- **Validación de Datos** (4 tests)
  - user_a_id requerido
  - user_b_id requerido
  - IDs no pueden ser iguales
  - UUIDs válidos

- **Lógica de Match** (5 tests)
  - Pending match aceptado por user_b
  - Pending match no aceptado por user_a
  - Rejected match no recreable
  - Accepted match no es pending
  - Transiciones de estado

- **Permisos** (2 tests)
  - Solo participantes ven match
  - Solo participantes actualizan match

- **Métodos HTTP** (3 tests)
  - GET requiere auth
  - POST requiere auth
  - PATCH requiere auth

- **Estructura de Respuesta** (1 test)
  - Schema completo del match

- **Códigos de Estado** (8 tests)
  - 201: POST exitoso
  - 200: Match existente
  - 409: Match rechazado
  - 403: Sin permisos
  - Etc.

- **Duplicación** (1 test)
  - No permite duplicados

**Total**: 25 tests

### 4. **room-assignments.test.ts** (52 tests)

Valida asignaciones de habitaciones y auto-matching:

#### Categorías de Tests:
- **Validación GET** (5 tests)
  - Requiere parámetro (match_id, room_id, owner, assignee)
  - Valida participación en match
  - Valida permisos de propietario
  - Valida permisos de tenant
  - Datos limitados para externos

- **POST con match_id** (11 tests)
  - Requiere room_id y assignee_id
  - Previene duplicados
  - Valida usuario en match
  - Solo owner puede ofrecer
  - Valida propiedad de room
  - Crea con status "offered"
  - Actualiza match a "room_offer"
  - Usa upsert con onConflict

- **POST self-assignment** (4 tests)
  - Solo permite auto-asignar sin match
  - Valida propiedad de room
  - Crea con status "accepted"
  - Marca room como no disponible

- **PATCH validaciones** (12 tests)
  - Requiere assignment_id y status
  - Solo acepta "accepted" o "rejected"
  - Valida que usuario es assignee o owner
  - Owner solo puede rechazar
  - Assignee puede aceptar o rechazar
  - Actualiza status del match
  - Gestiona disponibilidad del room

- **Auto-matching** (6 tests)
  - Obtiene miembros del flat
  - Excluye nuevo usuario del matching
  - Excluye matches existentes
  - Crea matches con status "accepted"
  - Maneja listas de miembros vacías

- **resolveOwnerId** (3 tests)
  - Identifica offeror en user_a
  - Identifica offeror en user_b
  - Retorna null si ninguno offering

**Total**: 52 tests

### 5. **auth-register-phase3.test.ts** (42 tests)

Valida registro completo con invite codes y rollback:

#### Categorías de Tests:
- **Validación Básica** (3 tests)
  - Requiere temp_token
  - Requiere birth_date
  - birth_date formato YYYY-MM-DD

- **Token Temporal** (3 tests)
  - Valida que token existe
  - Valida que token no expiró
  - Valida que gender está presente

- **Invite Code** (6 tests)
  - invite_code es opcional
  - Código debe existir si se proporciona
  - Código no puede estar usado
  - Código no puede estar expirado
  - Código no puede ser área común
  - Room no puede estar asignado

- **Flujos de Registro** (4 tests)
  - Registro normal crea usuario Auth
  - Registro Google busca usuario existente
  - Registro normal genera sesión
  - Registro Google actualiza metadata

- **Creación de Datos** (3 tests)
  - Crea registro en users
  - Crea registro en profiles
  - Usa upsert para evitar duplicados

- **Aceptación de Invite** (6 tests)
  - Crea room_assignment con invite
  - Assignment status "accepted"
  - Marca room como no disponible
  - Marca invite como usado
  - Crea matches con miembros del flat
  - Matches status "accepted"
  - Excluye matches existentes

- **Rollback** (3 tests)
  - Elimina profile en error
  - Elimina user en error
  - Elimina auth user en error

- **Limpieza** (1 test)
  - Elimina temp_registration al finalizar

**Total**: 42 tests

### 6. **rooms.test.ts** (32 tests)

Valida CRUD de flats y rooms:

#### Categorías de Tests:
- **Validación GET** (3 tests)
  - Requiere parámetro type
  - type debe ser flats, rooms o room
  - type=room requiere flat_ids

- **POST flat validaciones** (4 tests)
  - address mínimo 5 caracteres
  - city mínimo 2 caracteres
  - capacity_total positivo
  - Fuerza owner_id del token

- **POST room validaciones** (5 tests)
  - Requiere flat_id
  - price_per_month >= 0
  - size_m2 >= 5
  - Requiere available_from
  - Fuerza owner_id del token

- **Permisos** (4 tests)
  - PATCH flat valida propietario
  - PATCH room valida propietario
  - DELETE room valida propietario
  - GET type=room valida owner o tenant

- **Updates** (3 tests)
  - Previene cambio de owner_id
  - Previene cambio de id
  - Previene cambio de created_at

- **DELETE** (1 test)
  - Elimina photos del storage

**Total**: 32 tests

### 7. **chats.test.ts** (36 tests)

Valida chats y mensajes:

#### Categorías de Tests:
- **Match Status** (1 test)
  - Solo accepted, room_offer, room_assigned, room_declined

- **Creación de Chat** (5 tests)
  - Requiere match_id
  - Valida match existe
  - Valida usuario en match
  - Valida status del match
  - Previene duplicados

- **Envío de Mensajes** (6 tests)
  - Requiere chat_id
  - Requiere body
  - Body no puede estar vacío
  - Body máximo 1000 caracteres
  - Valida usuario en chat
  - Fuerza sender_id del token

- **GET operations** (3 tests)
  - Lista solo chats del usuario
  - Valida participación por chat_id
  - Valida participación por match_id

- **Marcar como leído** (4 tests)
  - Marca mensajes como leídos
  - No marca propios mensajes
  - No marca ya leídos
  - Valida participación

- **DELETE** (2 tests)
  - Elimina chat y mensajes
  - Valida participación

**Total**: 36 tests

---

## 🚀 Ejecutar Tests

### Localmente

#### 1. Instalar Deno (si no está instalado)

```bash
# macOS/Linux
curl -fsSL https://deno.land/install.sh | sh

# Windows (PowerShell)
irm https://deno.land/install.ps1 | iex
```

#### 2. Ejecutar tests individuales

```bash
# Test de auth-login
deno run --allow-all supabase/functions/_tests/auth-login.test.ts

# Test de profiles
deno run --allow-all supabase/functions/_tests/profiles.test.ts

# Test de matches
deno run --allow-all supabase/functions/_tests/matches.test.ts

# Test de room-assignments
deno run --allow-all supabase/functions/_tests/room-assignments.test.ts

# Test de auth-register-phase3
deno run --allow-all supabase/functions/_tests/auth-register-phase3.test.ts

# Test de rooms
deno run --allow-all supabase/functions/_tests/rooms.test.ts

# Test de chats
deno run --allow-all supabase/functions/_tests/chats.test.ts
```

#### 3. Ejecutar todos los tests

```bash
deno run --allow-all supabase/functions/_tests/run-all-tests.ts
```

### Ejemplo de Output

```
🧪 Running auth-login tests...

========================================
TEST RESULTS
========================================

✅ auth-login: debe rechazar peticiones sin email (0.45ms)
✅ auth-login: debe rechazar peticiones sin password (0.32ms)
✅ auth-login: debe rechazar email inválido (0.28ms)
✅ auth-login: debe rechazar método GET (0.19ms)
...

========================================
Total: 15 | Passed: 15 | Failed: 0
========================================
```

---

## 🔄 GitHub Actions CI/CD

Los tests se ejecutan automáticamente en GitHub Actions:

### Triggers

- **Push** a `main` o `develop`
- **Pull Request** a `main` o `develop`

### Workflow Steps

1. ✅ Checkout código
2. ✅ Setup Deno v2.x
3. ✅ Configurar variables de entorno
4. ✅ Ejecutar auth-login tests
5. ✅ Ejecutar profiles tests
6. ✅ Ejecutar matches tests
7. ✅ Ejecutar room-assignments tests
8. ✅ Ejecutar auth-register-phase3 tests
9. ✅ Ejecutar rooms tests
10. ✅ Ejecutar chats tests
11. ✅ Ejecutar resumen consolidado
12. ✅ Verificar resultados

### Ver Resultados

1. Ve a tu repositorio en GitHub
2. Click en la pestaña **Actions**
3. Selecciona el workflow **Edge Functions Tests**
4. Ve los logs detallados de cada test

### Ejemplo de CI Output

```
┌────────────────────────────────────┬─────────┬─────────┬─────────┬────────────┐
│ Test File                          │ Passed  │ Failed  │ Total   │ Duration   │
├────────────────────────────────────┼─────────┼─────────┼─────────┼────────────┤
│ ✅ auth-login.test.ts               │      15 │       0 │      15 │      165ms │
│ ✅ profiles.test.ts                 │      22 │       0 │      22 │      130ms │
│ ✅ matches.test.ts                  │      25 │       0 │      25 │      123ms │
│ ✅ room-assignments.test.ts         │      52 │       0 │      52 │      104ms │
│ ✅ auth-register-phase3.test.ts     │      42 │       0 │      42 │      101ms │
│ ✅ rooms.test.ts                    │      32 │       0 │      32 │      105ms │
│ ✅ chats.test.ts                    │      36 │       0 │      36 │       99ms │
├────────────────────────────────────┼─────────┼─────────┼─────────┼────────────┤
│   TOTAL                            │     224 │       0 │     224 │      831ms │
└────────────────────────────────────┴─────────┴─────────┴─────────┴────────────┘

Success Rate: 100.0%

✅ All 224 tests passed!
```

---

## ✍️ Escribir Nuevos Tests

### 1. Crear archivo de test

```typescript
// supabase/functions/_tests/my-function.test.ts

import {
  TestRunner,
  TestAssertions,
  createMockRequest,
} from './test-utils.ts';

const runner = new TestRunner();

runner.test('my-function: debe hacer X', () => {
  // Arrange
  const input = { foo: 'bar' };

  // Act
  const result = doSomething(input);

  // Assert
  TestAssertions.assertEquals(result, expected);
});

// Ejecutar tests
if (import.meta.main) {
  console.log('🧪 Running my-function tests...\n');
  const results = await runner.run();
  const summary = runner.printResults(results);
  Deno.exit(summary.failed > 0 ? 1 : 0);
}
```

### 2. Usar TestAssertions

```typescript
// Comparaciones
TestAssertions.assertEquals(actual, expected);
TestAssertions.assertNotEquals(actual, expected);

// Booleanos
TestAssertions.assertTrue(value);
TestAssertions.assertFalse(value);

// Existencia
TestAssertions.assertExists(value);
TestAssertions.assertNull(value);

// Arrays
TestAssertions.assertArrayIncludes(array, item);

// Excepciones
TestAssertions.assertThrows(() => { throw new Error(); });

// HTTP Responses
TestAssertions.assertResponseStatus(response, 200);
TestAssertions.assertResponseHasHeader(response, 'Content-Type');
TestAssertions.assertResponseContentType(response, 'application/json');
```

### 3. Crear mock requests

```typescript
// Request simple
const request = createMockRequest('http://localhost/endpoint', {
  method: 'POST',
  body: { data: 'value' },
});

// Request autenticado
const authRequest = createAuthenticatedRequest(
  'http://localhost/endpoint',
  'mock-token',
  {
    method: 'GET',
  }
);
```

### 4. Agregar al runner consolidado

Edita `run-all-tests.ts`:

```typescript
const testFiles = [
  './supabase/functions/_tests/auth-login.test.ts',
  './supabase/functions/_tests/profiles.test.ts',
  './supabase/functions/_tests/matches.test.ts',
  './supabase/functions/_tests/room-assignments.test.ts',
  './supabase/functions/_tests/auth-register-phase3.test.ts',
  './supabase/functions/_tests/rooms.test.ts',
  './supabase/functions/_tests/chats.test.ts',
  './supabase/functions/_tests/my-function.test.ts', // ← Nuevo
];
```

### 5. Agregar al workflow de GitHub Actions

Edita `.github/workflows/edge-functions-tests.yml`:

```yaml
- name: Run my-function tests
  run: deno run --allow-all supabase/functions/_tests/my-function.test.ts
```

---

## 🛠️ Utilidades de Testing

### test-utils.ts

Proporciona utilidades compartidas:

#### TestRunner
```typescript
const runner = new TestRunner();
runner.test('test name', async () => { /* test code */ });
const results = await runner.run();
runner.printResults(results);
```

#### Mock Helpers
```typescript
createMockRequest(url, options)
createAuthenticatedRequest(url, token, options)
parseResponseBody<T>(response)
createMockJWT(userId, email)
```

#### MockSupabaseClient
```typescript
const mockClient = new MockSupabaseClient({
  profiles: [{ id: '1', first_name: 'Test', last_name: 'User' }],
});
```

#### Test Cleanup
```typescript
await cleanupTestData(supabaseClient, userId);
```

---

## 📚 Best Practices

### 1. Nomenclatura de Tests

✅ **Bueno**: `profiles: debe validar gender correcto`
❌ **Malo**: `test 1`

### 2. Estructura AAA

```typescript
runner.test('descripción clara', () => {
  // Arrange - Preparar datos
  const input = { foo: 'bar' };

  // Act - Ejecutar acción
  const result = doSomething(input);

  // Assert - Verificar resultado
  TestAssertions.assertEquals(result, expected);
});
```

### 3. Tests Independientes

Cada test debe ser independiente y no depender del estado de otros tests.

```typescript
// ✅ Bueno
runner.test('test 1', () => {
  const data = createFreshData();
  // ...
});

// ❌ Malo - depende de variable externa
let sharedData;
runner.test('test 1', () => {
  sharedData = { foo: 'bar' };
});
runner.test('test 2', () => {
  // Usa sharedData ❌
});
```

### 4. Tests Descriptivos

```typescript
// ✅ Bueno - claro qué se está probando
runner.test('profiles: budget_max debe ser mayor o igual que budget_min', () => {
  // ...
});

// ❌ Malo - no está claro qué se prueba
runner.test('test budget', () => {
  // ...
});
```

### 5. Un Concepto por Test

```typescript
// ✅ Bueno - un test, un concepto
runner.test('debe validar email', () => {
  TestAssertions.assertTrue(isValidEmail('test@example.com'));
});

runner.test('debe validar password', () => {
  TestAssertions.assertTrue(isValidPassword('Pass123!'));
});

// ❌ Malo - múltiples conceptos en un test
runner.test('debe validar login', () => {
  TestAssertions.assertTrue(isValidEmail('test@example.com'));
  TestAssertions.assertTrue(isValidPassword('Pass123!'));
});
```

### 6. Mensajes de Error Claros

```typescript
// ✅ Bueno
TestAssertions.assertEquals(
  result,
  expected,
  'El email debe tener formato válido'
);

// ❌ Malo
TestAssertions.assertEquals(result, expected);
```

---

## 🔍 Debugging Tests

### Ver logs detallados

```bash
deno run --allow-all --log-level=debug supabase/functions/_tests/auth-login.test.ts
```

### Ejecutar un test específico

Comenta los otros tests temporalmente:

```typescript
// runner.test('test 1', () => { /* ... */ });
// runner.test('test 2', () => { /* ... */ });
runner.test('test 3 que quiero debuggear', () => {
  console.log('Debug info:', someValue);
  // ...
});
```

### Inspeccionar responses

```typescript
const response = await makeRequest();
console.log('Status:', response.status);
console.log('Headers:', Object.fromEntries(response.headers));
const body = await parseResponseBody(response);
console.log('Body:', JSON.stringify(body, null, 2));
```

---

## 📊 Coverage Analysis

### Tests Actuales

| Edge Function | Tests | Cobertura |
|--------------|-------|-----------|
| auth-login | 15 | ✅ Validación, HTTP methods, errors |
| profiles | 22 | ✅ CRUD, validación, permisos |
| matches | 25 | ✅ Lógica de match, estados, permisos |
| room-assignments | 52 | ✅ Asignaciones, ofertas, auto-matching |
| auth-register-phase3 | 42 | ✅ Registro completo, invites, rollback |
| rooms | 32 | ✅ CRUD flats/rooms, validaciones |
| chats | 36 | ✅ Chats, mensajes, permisos |
| **TOTAL** | **224** | **7 funciones principales** |

### Áreas Cubiertas

- ✅ Validación de datos de entrada
- ✅ Tipos de datos y constraints
- ✅ Métodos HTTP permitidos
- ✅ Autenticación y autorización
- ✅ Códigos de estado HTTP
- ✅ Estructura de respuestas
- ✅ Lógica de negocio
- ✅ Transiciones de estado
- ✅ Permisos y acceso

### Próximos Tests a Implementar (Sprint 2)

- [ ] swipe-rejections.test.ts
- [ ] invite-codes.test.ts
- [ ] photos.test.ts
- [ ] auth-register-phase1.test.ts
- [ ] auth-register-phase2.test.ts
- [ ] auth-google-register.test.ts

### Sprint 3 (Funcionalidad Adicional)

- [ ] test-endpoint.test.ts
- [ ] validate-invite-code.test.ts
- [ ] auth-refresh-token.test.ts

---

## 🎓 Recursos Adicionales

- [Deno Testing Documentation](https://docs.deno.com/runtime/fundamentals/testing/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [GitHub Actions](https://docs.github.com/en/actions)

---

**Última actualización**: 2026-01-09
**Autor**: HomiMatch Team con Claude Sonnet 4.5

---

## 📈 Progreso de Testing

### ✅ Sprint 1 Completado (162 tests nuevos)

- ✅ room-assignments.test.ts (52 tests)
- ✅ auth-register-phase3.test.ts (42 tests)
- ✅ rooms.test.ts (32 tests)
- ✅ chats.test.ts (36 tests)

**Total implementado**: 224 tests cubriendo 7 edge functions principales
