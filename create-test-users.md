# Script para Crear Usuarios de Prueba

## ⚠️ IMPORTANTE: Ejecutar ANTES del seed-basic.sql

Este script debe ejecutarse primero para crear los usuarios en `auth.users` de Supabase.

---

## Opción 1: Crear usuarios manualmente en Supabase Dashboard

1. Ve a tu **Supabase Dashboard**
2. Navega a **Authentication → Users**
3. Haz clic en **"Add user"** o **"Invite"**
4. Crea estos 8 usuarios uno por uno:

### Usuarios a crear:

**Contraseña para TODOS**: `Test123456!`

1. ✉️ `owner1@test.com`
2. ✉️ `owner2@test.com`
3. ✉️ `seeker1@test.com`
4. ✉️ `seeker2@test.com`
5. ✉️ `seeker3@test.com`
6. ✉️ `seeker4@test.com`
7. ✉️ `mixed1@test.com`
8. ✉️ `mixed2@test.com`

**IMPORTANTE**:
- Marca la opción **"Auto Confirm User"** para cada uno
- NO envíes email de confirmación
- Usa la misma contraseña para todos: `Test123456!`

---

## Opción 2: Crear usuarios con SQL (MÁS RÁPIDO)

Ejecuta este script en **Supabase SQL Editor**:

```sql
-- ============================================
-- CREAR USUARIOS DE AUTH PARA TESTING
-- ============================================
-- IMPORTANTE: Este script usa la extensión auth
-- Solo funciona si tienes permisos de admin

DO $$
DECLARE
    test_password TEXT := 'Test123456!';
    hashed_password TEXT;
BEGIN
    -- El hash de 'Test123456!' en bcrypt
    -- Nota: Supabase usa bcrypt, este hash puede que no funcione
    -- Es mejor crear los usuarios manualmente en el dashboard

    -- Si tienes acceso al admin API, usa este endpoint en su lugar:
    -- POST https://[PROJECT_REF].supabase.co/auth/v1/admin/users

    RAISE NOTICE 'Este script requiere permisos de admin.';
    RAISE NOTICE 'Es recomendable crear los usuarios manualmente en el Dashboard.';

END $$;
```

⚠️ **NOTA**: La creación automática de usuarios requiere el Admin API de Supabase. Es más fácil crearlos manualmente en el dashboard.

---

## Opción 3: Script Node.js con Supabase Admin API

Si tienes Node.js y quieres automatizarlo:

```javascript
// create-users.js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://your-project.supabase.co';
const supabaseServiceKey = 'your-service-role-key'; // ⚠️ NUNCA commitees esto

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const users = [
  'owner1@test.com',
  'owner2@test.com',
  'seeker1@test.com',
  'seeker2@test.com',
  'seeker3@test.com',
  'seeker4@test.com',
  'mixed1@test.com',
  'mixed2@test.com',
];

async function createUsers() {
  for (const email of users) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: 'Test123456!',
      email_confirm: true,
    });

    if (error) {
      console.error(`❌ Error creando ${email}:`, error.message);
    } else {
      console.log(`✅ Usuario creado: ${email} (ID: ${data.user.id})`);
    }
  }
}

createUsers();
```

Ejecutar:
```bash
npm install @supabase/supabase-js
node create-users.js
```

---

## ✅ Verificación

Después de crear los usuarios, verifica en **Supabase SQL Editor**:

```sql
SELECT email, created_at, confirmed_at
FROM auth.users
WHERE email LIKE '%@test.com'
ORDER BY email;
```

Deberías ver los 8 usuarios listados.

---

## 📋 Siguiente Paso

Una vez creados los usuarios en `auth.users`:

1. ✅ Ejecuta la query de limpieza (en `testingAnotaciones.md`)
2. ✅ Ejecuta el script `seed-basic.sql`
3. ✅ Verifica los datos con las queries al final del seed

---

## 🔄 Para resetear todo

Si necesitas empezar de cero:

```sql
-- Borrar usuarios de auth
DELETE FROM auth.users WHERE email LIKE '%@test.com';

-- Luego ejecuta la query de limpieza y vuelve a crear los usuarios
```
