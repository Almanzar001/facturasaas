# 🔧 Fix: Column Ambiguity Error

## 🚨 Error Encontrado
```
Error: column reference "expires_at" is ambiguous
```

## 📋 Causa del Problema
El error ocurre porque existen múltiples tablas con la columna `expires_at` y las funciones SQL no están usando aliases específicos para referenciar las columnas.

## ✅ Solución Implementada

### 1. **Nueva Migración**
```sql
-- Ejecutar en Supabase SQL Editor
-- Archivo: supabase/migrations/032_fix_column_ambiguity.sql
```

### 2. **Cambios Realizados**
- ✅ **Aliases específicos** en todas las consultas SQL
- ✅ **Referencias explícitas** a columnas (inv.expires_at, org.name, etc.)
- ✅ **Funciones recreadas** con mejor sintaxis
- ✅ **Validaciones mejoradas**

### 3. **Funciones Corregidas**
1. `create_organization_invitation()` - Creación de invitaciones
2. `get_invitation_by_token()` - Obtener invitación por token
3. `accept_organization_invitation()` - Aceptar invitación

## 🚀 Pasos para Solucionar

### Paso 1: Ejecutar Nueva Migración
```sql
-- En Supabase SQL Editor
-- Copiar y ejecutar todo el contenido de:
-- supabase/migrations/032_fix_column_ambiguity.sql
```

### Paso 2: Verificar Funciones
```sql
-- En Supabase SQL Editor
-- Copiar y ejecutar:
-- test_invitation_functions.sql
```

### Paso 3: Probar Funcionalidad
1. Ir a `/configuracion/usuarios`
2. Pestaña "Invitar Usuarios"
3. Crear invitación de prueba
4. Verificar que no hay errores

## 🔍 Verificación del Fix

### Comprobar que las Funciones Existen
```sql
SELECT proname, pg_get_function_result(oid) as return_type
FROM pg_proc 
WHERE proname LIKE '%invitation%';
```

### Resultado Esperado
```
create_organization_invitation | jsonb
accept_organization_invitation | jsonb
get_invitation_by_token       | jsonb
cancel_organization_invitation | jsonb
cleanup_expired_invitations   | integer
```

### Probar Creación de Invitación
```sql
-- Ejemplo de prueba (usar tus IDs reales)
SELECT create_organization_invitation(
    'tu-organization-id-aqui'::UUID,
    'test@example.com',
    'member'
);
```

## 📊 Cambios Técnicos Detallados

### Antes (Problemático)
```sql
SELECT i.*, o.name, u.email
FROM organization_invitations i
JOIN organizations o ON i.organization_id = o.id
WHERE i.expires_at > NOW()  -- ❌ Ambiguo
```

### Después (Corregido)
```sql
SELECT 
    inv.id,
    inv.expires_at,  -- ✅ Específico
    org.name,
    usr.email
FROM organization_invitations inv
JOIN organizations org ON inv.organization_id = org.id
WHERE inv.expires_at > NOW()  -- ✅ Sin ambigüedad
```

## 🛠️ Troubleshooting

### Si el Error Persiste
1. **Verificar migración ejecutada**:
   ```sql
   SELECT proname FROM pg_proc WHERE proname LIKE '%invitation%';
   ```

2. **Eliminar funciones manualmente**:
   ```sql
   DROP FUNCTION IF EXISTS create_organization_invitation(UUID, TEXT, TEXT) CASCADE;
   DROP FUNCTION IF EXISTS get_invitation_by_token(TEXT) CASCADE;
   DROP FUNCTION IF EXISTS accept_organization_invitation(TEXT) CASCADE;
   ```

3. **Ejecutar migración nuevamente**

### Si Hay Otros Errores
- **Verificar permisos** de usuario en Supabase
- **Confirmar tablas** existen (organizations, organization_invitations)
- **Revisar RLS policies** están activas

## 📋 Checklist de Verificación

### Después de Aplicar el Fix
- [ ] Migración `032_fix_column_ambiguity.sql` ejecutada
- [ ] Funciones recreadas correctamente
- [ ] Test de creación de invitación exitoso
- [ ] Interfaz `/configuracion/usuarios` funcional
- [ ] No hay errores de ambigüedad

### Pruebas Funcionales
- [ ] Crear invitación desde interfaz
- [ ] Copiar enlace generado
- [ ] Verificar invitación en lista pendientes
- [ ] Aceptar invitación funciona
- [ ] Usuario aparece en miembros

## 🎯 Resultado Esperado

Después de aplicar este fix:
- ✅ **No más errores** de ambigüedad de columnas
- ✅ **Funciones SQL** funcionan correctamente
- ✅ **Interfaz web** crea invitaciones sin problemas
- ✅ **Sistema completo** operacional

## 📞 Si Necesitas Ayuda

1. **Ejecutar** `test_invitation_functions.sql` para diagnóstico
2. **Verificar** que todas las funciones retornan `jsonb`
3. **Probar** creación de invitación en interfaz
4. **Revisar** logs de Supabase para errores específicos

---

## ✅ Fix Aplicado

**Fecha**: 2025-07-17  
**Estado**: ✅ Listo para aplicar  
**Archivo**: `032_fix_column_ambiguity.sql`  
**Verificación**: `test_invitation_functions.sql`