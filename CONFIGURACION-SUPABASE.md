# 🔧 Configuración de Supabase para Crear Usuarios

## Problema Actual
El error "no se pudo crear en supabase auth" ocurre porque Supabase tiene configuraciones de seguridad que impiden la creación directa de usuarios.

## Solución 1: Configurar Supabase para permitir registro

### Paso 1: Configurar Authentication
1. Ve a tu panel de Supabase: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Authentication > Settings**
4. En la sección **User Signup**:
   - ✅ **Enable email confirmations**: DESACTIVAR
   - ✅ **Enable phone confirmations**: DESACTIVAR
5. En la sección **Email Templates**:
   - Verifica que tengas un template de confirmación configurado
6. **Guarda los cambios**

### Paso 2: Verificar RLS (Row Level Security)
Ejecuta este SQL en tu panel de Supabase:

```sql
-- Verificar que las tablas tengan políticas correctas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('users', 'organization_members');

-- Si no hay políticas para insertar usuarios, agrega esta:
CREATE POLICY "Enable insert for service role" ON users
    FOR INSERT WITH CHECK (true);
```

### Paso 3: Probar la creación de usuario
1. Ve a http://localhost:3001/crear-usuario
2. Completa el formulario
3. Haz click en "Crear Usuario"

## Solución 2: Crear usuario manualmente (Recomendado)

### Paso 1: Usar el botón "Crear Manual"
1. Ve a http://localhost:3001/crear-usuario
2. Completa el formulario
3. Haz click en "Crear Manual"
4. Sigue las instrucciones que aparecen

### Paso 2: Crear en el panel de Supabase
1. Ve a **Authentication > Users**
2. Click **"Add user"**
3. Completa:
   - **Email**: El email del usuario
   - **Password**: La contraseña
   - ✅ **Auto Confirm User**: MARCADO
   - ✅ **Auto Confirm Phone**: MARCADO
4. Click **"Create user"**

### Paso 3: Crear perfil automático
El sistema creará automáticamente el perfil del usuario cuando inicie sesión por primera vez.

## Solución 3: Usar Service Role Key (Avanzado)

### Paso 1: Obtener Service Role Key
1. Ve a **Settings > API**
2. Copia la **service_role** key (NO la anon key)

### Paso 2: Agregar al .env.local
```env
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
```

### Paso 3: Usar en el código
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Usar supabaseAdmin.auth.admin.createUser()
```

## Verificación de que funciona

### 1. Crear usuario de prueba
- Email: test@ejemplo.com
- Password: 123456
- Nombre: Usuario de Prueba

### 2. Verificar en Supabase
```sql
-- Verificar que el usuario se creó
SELECT * FROM auth.users WHERE email = 'test@ejemplo.com';

-- Verificar que el perfil se creó
SELECT * FROM users WHERE email = 'test@ejemplo.com';

-- Verificar que se agregó a la organización
SELECT * FROM organization_members WHERE user_id = (
    SELECT id FROM users WHERE email = 'test@ejemplo.com'
);
```

### 3. Probar login
1. Ve a http://localhost:3001/login
2. Usa las credenciales creadas
3. Verifica que puede acceder al dashboard

## Páginas para probar

1. **Crear Usuario**: http://localhost:3001/crear-usuario
2. **Gestión de Usuarios**: http://localhost:3001/usuarios
3. **Administración**: http://localhost:3001/admin
4. **Login**: http://localhost:3001/login

## Errores comunes y soluciones

### Error: "Email confirmations are required"
- Desactiva email confirmations en Authentication > Settings

### Error: "New row violates row-level security policy"
- Verifica las políticas RLS en las tablas users y organization_members

### Error: "Function does not exist"
- Ejecuta las migraciones SQL para crear las funciones necesarias

### Error: "Invalid JWT"
- Verifica que estés usando las keys correctas en .env.local

## Recomendación final

Para desarrollo, usa la **Solución 2** (crear manualmente) porque es más confiable y rápida. Para producción, configura correctamente la **Solución 1** o **Solución 3**.