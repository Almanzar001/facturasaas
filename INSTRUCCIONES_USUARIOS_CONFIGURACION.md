# 👥 Gestión de Usuarios - Configuración

## 📍 Nueva Ubicación
La funcionalidad de invitaciones y gestión de usuarios ahora está ubicada en:

**📍 Configuración → Usuarios**
- **URL**: `/configuracion/usuarios`
- **Menú**: Configuración → Usuarios → Pestaña "Invitar Usuarios"

## 🎯 Cómo Acceder

### Opción 1: Desde el Menú Principal
1. Ir a **"Configuración"** en el menú lateral
2. Hacer clic en **"Usuarios"**
3. Seleccionar pestaña **"Invitar Usuarios"**

### Opción 2: Desde la Página de Configuración
1. Ir a `/configuracion`
2. Hacer clic en el card **"Usuarios"**
3. Seleccionar pestaña **"Invitar Usuarios"**

### Opción 3: URL Directa
```
/configuracion/usuarios
```

## 🗂️ Estructura de Pestañas

### 1. **Miembros** 👥
- Lista de todos los miembros actuales
- Información de roles y estado
- Opción para eliminar miembros (solo admins)

### 2. **Invitar Usuarios** ✉️
- Formulario para crear invitaciones
- Lista de invitaciones pendientes
- Opciones para reenviar/cancelar

### 3. **Permisos** 🔒
- Información sobre roles y permisos
- Explicación del sistema de roles
- Tu rol actual y permisos

## 🚀 Flujo de Invitación

### Para Administradores:
1. **Ir a**: Configuración → Usuarios
2. **Seleccionar pestaña**: "Invitar Usuarios"
3. **Completar formulario**:
   - Email del usuario
   - Rol (Miembro/Administrador)
4. **Hacer clic**: "Crear Invitación"
5. **Copiar enlace** generado
6. **Enviar enlace** al usuario

### Para Usuarios Invitados:
1. **Recibir enlace** del administrador
2. **Hacer clic** en el enlace
3. **Crear cuenta** (si no existe)
4. **Iniciar sesión**
5. **Aceptar invitación**

## 🔐 Permisos Requeridos

### Para Ver la Página:
- Estar autenticado
- Tener una organización asignada

### Para Invitar Usuarios:
- Rol: **Admin** o **Owner**
- Permisos: `invite_members` o `manage_members`

### Para Gestionar Miembros:
- Rol: **Admin** o **Owner**  
- Permisos: `manage_members`

## 📊 Funcionalidades Disponibles

### En la Pestaña "Miembros":
- ✅ Ver todos los miembros actuales
- ✅ Ver roles y estado de cada miembro
- ✅ Eliminar miembros (solo admins)
- ✅ Ver fecha de ingreso

### En la Pestaña "Invitar":
- ✅ Crear nuevas invitaciones
- ✅ Ver invitaciones pendientes
- ✅ Reenviar invitaciones
- ✅ Cancelar invitaciones
- ✅ Copiar enlaces de invitación

### En la Pestaña "Permisos":
- ✅ Ver explicación de roles
- ✅ Ver tu rol actual
- ✅ Entender el sistema de permisos

## 🎨 Mejoras de la Nueva Ubicación

### Organización Mejorada:
- **Integrado** con el resto de configuración
- **Pestañas** para mejor organización
- **Contexto** claro dentro de configuración

### Mejor Control:
- **Centralizado** en configuración
- **Permisos** más claros
- **Interfaz** más intuitiva

### Información Completa:
- **Estado** de miembros actual
- **Historial** de invitaciones
- **Explicación** de permisos

## 📋 Checklist de Verificación

### Antes de Invitar:
- [ ] Ir a Configuración → Usuarios
- [ ] Verificar que tienes permisos (pestaña Permisos)
- [ ] Confirmar email del usuario
- [ ] Seleccionar rol apropiado

### Durante la Invitación:
- [ ] Completar formulario correctamente
- [ ] Verificar mensaje de éxito
- [ ] Copiar enlace generado
- [ ] Enviar enlace al usuario

### Después de Invitar:
- [ ] Verificar en "Invitaciones Pendientes"
- [ ] Seguimiento con el usuario
- [ ] Confirmar aceptación en "Miembros"

## 🔧 Troubleshooting

### "No veo la pestaña Invitar"
- **Verificar** que tienes rol admin/owner
- **Ir a** pestaña "Permisos" para confirmar
- **Contactar** administrador si necesitas permisos

### "Botón deshabilitado"
- **Verificar** que hay organización seleccionada
- **Revisar** permisos en pestaña "Permisos"
- **Recargar** página si es necesario

### "Error al crear invitación"
- **Verificar** formato del email
- **Confirmar** que no existe invitación pendiente
- **Revisar** que el usuario no sea miembro ya

## 📱 Responsivo

La nueva interfaz está optimizada para:
- **Desktop**: Vista completa con pestañas
- **Tablet**: Diseño adaptativo
- **Mobile**: Pestañas colapsables

## 🎯 Ventajas de la Nueva Ubicación

### Para Administradores:
- **Más control** sobre la gestión de usuarios
- **Mejor organización** dentro de configuración
- **Contexto claro** sobre permisos y roles

### Para Usuarios:
- **Fácil de encontrar** dentro de configuración
- **Interfaz intuitiva** con pestañas
- **Información completa** sobre el sistema

### Para la Organización:
- **Centralizado** en configuración
- **Mejor seguridad** con permisos claros
- **Mantenimiento** más fácil

---

## ✅ Migración Completa

La funcionalidad de invitaciones ahora está completamente integrada en la sección de configuración para mayor control y mejor organización.

**Nueva ruta**: `/configuracion/usuarios`
**Funcionalidad**: Completa y mejorada
**Estado**: ✅ Lista para producción

¿Necesitas ayuda? Revisa la pestaña "Permisos" para entender tu rol actual y qué puedes hacer.