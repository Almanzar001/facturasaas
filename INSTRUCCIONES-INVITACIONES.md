# 🚀 Instrucciones para Probar el Sistema de Invitaciones

## 1. Ejecutar el SQL en Supabase

1. Ve a tu panel de Supabase
2. Abre **SQL Editor** 
3. Crea una nueva query
4. Copia y pega el contenido del archivo `add-invitation-functions.sql`
5. Ejecuta la query (debería mostrar "Organization invitation functions created successfully")

## 2. Verificar las tablas

En el SQL Editor, ejecuta:
```sql
SELECT * FROM organization_invitations LIMIT 1;
SELECT * FROM organization_members LIMIT 1;
```

## 3. Verificar las funciones RPC

En el SQL Editor, ejecuta:
```sql
SELECT proname FROM pg_proc WHERE proname LIKE '%invitation%';
```

Deberías ver:
- `create_organization_invitation`
- `accept_organization_invitation`

## 4. Verificar tu rol de usuario

En el SQL Editor, ejecuta (reemplaza con tu email):
```sql
SELECT 
    u.email,
    om.role,
    o.name as organization_name
FROM users u
JOIN organization_members om ON u.id = om.user_id
JOIN organizations o ON om.organization_id = o.id
WHERE u.email = 'tu-email@ejemplo.com';
```

Si no tienes rol 'owner' o 'admin', ejecuta:
```sql
UPDATE organization_members 
SET role = 'owner' 
WHERE user_id = (SELECT id FROM users WHERE email = 'tu-email@ejemplo.com');
```

## 5. Probar las páginas

1. **Página de administración**: http://localhost:3001/admin
2. **Demo de invitaciones**: http://localhost:3001/demo-invitations
3. **Página original**: http://localhost:3001/configuracion/organizacion

## 6. Pasos para probar

1. Ve a http://localhost:3001/admin
2. Verifica que tu rol sea 'owner' o 'admin'
3. Ingresa un email en el formulario
4. Selecciona el rol
5. Haz click en "Enviar Invitación"
6. Revisa la consola del navegador para ver logs
7. Verifica en la sección "Invitaciones Pendientes"

## 7. Probar la aceptación de invitaciones

1. Ve a la tabla `organization_invitations` en Supabase
2. Copia el `token` de una invitación
3. Ve a: http://localhost:3001/invitations?token=EL_TOKEN_AQUI
4. Sigue las instrucciones en pantalla

## 8. Solución de problemas

### Error: "User not authenticated"
- Asegúrate de estar logueado
- Verifica que el token de sesión sea válido

### Error: "Insufficient permissions"
- Verifica que tu usuario tenga rol 'owner' o 'admin'
- Ejecuta la query del paso 4 para cambiar tu rol

### Error: "Function does not exist"
- Ejecuta nuevamente el SQL del paso 1
- Verifica que las funciones se crearon correctamente

### Error: "Table does not exist"
- Asegúrate de que las migraciones anteriores se hayan ejecutado
- Verifica que las tablas `organization_invitations` y `organization_members` existan

## 9. URLs importantes

- **Admin**: http://localhost:3001/admin
- **Demo**: http://localhost:3001/demo-invitations
- **Configuración**: http://localhost:3001/configuracion/organizacion
- **Invitaciones**: http://localhost:3001/invitations?token=TOKEN

## 10. Archivos importantes

- `add-invitation-functions.sql` - SQL para crear las funciones
- `src/app/admin/page.tsx` - Página de administración
- `src/app/demo-invitations/page.tsx` - Demo de invitaciones
- `src/services/organizations.ts` - Servicios de organización
- `src/hooks/usePermissions.ts` - Sistema de permisos

¡Ahora deberías poder ver y probar el sistema de invitaciones! 🎉