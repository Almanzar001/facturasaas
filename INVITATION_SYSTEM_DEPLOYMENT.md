# Sistema de Invitaciones - Guía de Deployment

## 📋 Resumen
Sistema completo de invitaciones para permitir que usuarios administradores inviten a otros usuarios a sus organizaciones. Este sistema está listo para producción y reemplaza las implementaciones anteriores.

## 🗄️ 1. Configuración de Base de Datos

### Ejecutar Migration
```sql
-- Ejecutar en Supabase SQL Editor
-- Archivo: supabase/migrations/031_fix_invitation_functions.sql
```

**⚠️ IMPORTANTE**: Si encuentras el error "cannot change return type of existing function", usa la migración `031_fix_invitation_functions.sql` que primero elimina las funciones existentes y luego las recrea correctamente.

### Verificar Installation
```sql
-- Ejecutar después de la migración
-- Archivo: verify_invitation_system.sql
```

La migración incluye:
- ✅ Tabla `organization_invitations`
- ✅ Índices para performance
- ✅ Funciones RPC robustas
- ✅ Políticas de seguridad RLS
- ✅ Validaciones completas

### Funciones RPC Creadas
1. `create_organization_invitation(org_id, invite_email, invite_role)`
2. `accept_organization_invitation(invitation_token)`
3. `get_invitation_by_token(invitation_token)`
4. `cancel_organization_invitation(invitation_id)`
5. `cleanup_expired_invitations()`

## 🔧 2. Servicios Implementados

### InvitationService
```typescript
// src/services/invitations.ts
```

**Funciones principales:**
- `createInvitation()` - Crear invitación
- `acceptInvitation()` - Aceptar invitación
- `getInvitationByToken()` - Obtener invitación por token
- `getOrganizationInvitations()` - Listar invitaciones
- `cancelInvitation()` - Cancelar invitación
- `resendInvitation()` - Reenviar invitación

## 🎨 3. Interfaces de Usuario

### Página de Gestión de Usuarios (Principal)
- **Ruta**: `/configuracion/usuarios`
- **Archivo**: `src/app/configuracion/usuarios/page.tsx`
- **Funcionalidades**:
  - 3 pestañas: Miembros, Invitar, Permisos
  - Crear invitaciones
  - Listar miembros actuales
  - Gestionar invitaciones pendientes
  - Sistema de permisos explicado

### Página de Aceptación
- **Ruta**: `/invitations?token=...`
- **Archivo**: `src/app/invitations/page.tsx`
- **Funcionalidades**:
  - Mostrar detalles de invitación
  - Aceptar/rechazar invitación
  - Validación de token

### Páginas Eliminadas
- **`/invitar`** - Eliminada (funcionalidad movida a configuración)
- **`/admin`** - Eliminada (funcionalidad movida a configuración)
- **`InvitationForm.tsx`** - Eliminado (integrado directamente)

## 🔐 4. Seguridad y Validaciones

### Validaciones Implementadas
- ✅ Token único de 64 caracteres hex
- ✅ Expiración automática (7 días)
- ✅ Validación de permisos (admin/owner)
- ✅ Verificación de email coincidente
- ✅ Prevención de invitaciones duplicadas
- ✅ Validación de organización activa

### Políticas de Seguridad RLS
```sql
-- Usuarios pueden ver invitaciones de sus organizaciones
-- Usuarios pueden ver sus propias invitaciones
-- Admins pueden gestionar invitaciones
```

## 🚀 5. Flujo de Invitación

### Para Administradores
1. Ir a `/configuracion/usuarios`
2. Seleccionar pestaña "Invitar Usuarios"
3. Completar formulario de invitación
4. Copiar enlace generado
5. Enviar enlace al usuario

### Para Usuarios Invitados
1. Clic en enlace de invitación
2. Crear cuenta si no existe
3. Iniciar sesión
4. Aceptar invitación
5. Acceso automático a organización

## 📊 6. Monitoreo y Mantenimiento

### Limpieza Automática
```sql
-- Ejecutar periódicamente para limpiar invitaciones expiradas
SELECT cleanup_expired_invitations();
```

### Verificaciones de Estado
```sql
-- Verificar invitaciones pendientes
SELECT 
    email,
    role,
    expires_at,
    created_at
FROM organization_invitations 
WHERE accepted_at IS NULL 
AND expires_at > NOW()
ORDER BY created_at DESC;
```

## 🔧 7. Configuración Adicional

### Variables de Entorno
```env
# No se requieren variables adicionales
# El sistema usa las credenciales existentes de Supabase
```

### Permisos Requeridos
- Usuario debe tener rol `admin` o `owner` en la organización
- Acceso a funciones RPC de Supabase

## 🧪 8. Testing

### Casos de Prueba
1. **Crear invitación** - Usuario admin crea invitación válida
2. **Aceptar invitación** - Usuario acepta invitación con token válido
3. **Invitación expirada** - Manejo de tokens expirados
4. **Token inválido** - Validación de tokens malformados
5. **Permisos** - Verificación de roles y permisos
6. **Duplicados** - Prevención de invitaciones duplicadas

### Comandos de Test
```bash
# Instalar dependencias
npm install

# Ejecutar tests (cuando estén disponibles)
npm test

# Verificar build
npm run build
```

## 📋 9. Checklist de Deployment

### Base de Datos
- [ ] Ejecutar migración `031_fix_invitation_functions.sql`
- [ ] Ejecutar script de verificación `verify_invitation_system.sql`
- [ ] Verificar que todas las funciones muestren ✅ EXISTS
- [ ] Confirmar políticas RLS activas
- [ ] Validar índices creados

### Código
- [ ] Actualizar imports en componentes
- [ ] Verificar tipos TypeScript
- [ ] Confirmar manejo de errores
- [ ] Validar URLs de invitación

### Testing
- [ ] Crear invitación como admin
- [ ] Aceptar invitación como usuario
- [ ] Verificar expiración de tokens
- [ ] Confirmar navegación correcta

### Monitoreo
- [ ] Configurar alertas de errores
- [ ] Monitoring de funciones RPC
- [ ] Logs de invitaciones creadas

## 🆘 10. Troubleshooting

### Problemas Comunes

**Error: "Function create_organization_invitation does not exist"**
```sql
-- Verificar que la migración se ejecutó correctamente
SELECT * FROM pg_proc WHERE proname LIKE '%invitation%';
```

**Error: "Insufficient permissions"**
```sql
-- Verificar rol del usuario
SELECT role FROM organization_members 
WHERE user_id = auth.uid() AND organization_id = 'ORG_ID';
```

**Error: "Invalid token"**
```typescript
// Verificar formato del token
const isValid = InvitationService.validateTokenFormat(token);
```

### Logs de Debug
```sql
-- Ver invitaciones recientes
SELECT * FROM organization_invitations 
ORDER BY created_at DESC 
LIMIT 10;

-- Ver miembros de organización
SELECT * FROM organization_members 
WHERE organization_id = 'ORG_ID';
```

## 🎯 11. Próximos Pasos

### Mejoras Futuras
1. **Sistema de Email** - Envío automático de invitaciones
2. **Notificaciones** - Alertas en tiempo real
3. **Roles Personalizados** - Más tipos de roles
4. **Estadísticas** - Dashboard de invitaciones
5. **API Externa** - Endpoint para integraciones

### Integración con Email
```typescript
// Ejemplo de integración futura
const result = await InvitationService.createInvitation(orgId, email, role);
if (result.success) {
  await EmailService.sendInvitation({
    email,
    invitationUrl: InvitationService.getInvitationUrl(result.token),
    organizationName: result.organization_name
  });
}
```

---

## ✅ Sistema Listo para Producción

Este sistema de invitaciones es completo, seguro y está listo para producción. Incluye todas las validaciones necesarias, manejo de errores robusto y una experiencia de usuario fluida.

**Última actualización**: 2025-07-17
**Versión**: 1.0.0
**Estado**: ✅ Listo para producción