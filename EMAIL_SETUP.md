# 📧 Sistema de Invitaciones por Email

## 🎯 Funcionalidad Implementada

El sistema de invitaciones ahora envía automáticamente emails a los usuarios invitados cuando se crea una nueva invitación.

## 🔧 Configuración Requerida

### 1. Crear Cuenta en Resend

1. Ve a [https://resend.com](https://resend.com)
2. Crea una cuenta gratuita (100 emails/día gratis)
3. Verifica tu email
4. Ve a la sección "API Keys"
5. Crea una nueva API Key

### 2. Configurar Variables de Entorno

Agrega estas variables a tu archivo `.env.local`:

```bash
# Email Service (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@tudominio.com
```

### 3. Configurar Dominio (Opcional pero Recomendado)

Para emails de producción, necesitas configurar un dominio:

1. En Resend, ve a "Domains"
2. Agrega tu dominio
3. Configura los registros DNS requeridos
4. Verifica el dominio

## 📋 Archivos Creados/Modificados

### Nuevos Archivos:
- `src/services/email.ts` - Servicio de envío de emails
- `src/app/api/invitations/send-email/route.ts` - API endpoint
- `EMAIL_SETUP.md` - Esta documentación

### Archivos Modificados:
- `package.json` - Agregado dependencia `resend`
- `src/app/configuracion/usuarios/page.tsx` - Integración con envío de emails
- `.env.example` - Variables de entorno actualizadas

## 🚀 Cómo Funciona

### Flujo Completo:

1. **Usuario crea invitación** → Interfaz `/configuracion/usuarios`
2. **Sistema crea invitación** → Base de datos
3. **Sistema envía email** → API `/api/invitations/send-email`
4. **Usuario recibe email** → Email con enlace de invitación
5. **Usuario acepta** → Enlace en el email
6. **Sistema procesa** → Usuario agregado a organización

### Contenido del Email:

El email incluye:
- ✅ Diseño profesional y responsive
- ✅ Información de la organización
- ✅ Datos del usuario que invita
- ✅ Rol asignado
- ✅ Fecha de expiración
- ✅ Botón de aceptación
- ✅ Enlace alternativo
- ✅ Nota de seguridad

## 🔍 Testing

### Desarrollo Local:
```bash
# 1. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus datos de Resend

# 2. Iniciar servidor
npm run dev

# 3. Probar invitación
# - Ir a /configuracion/usuarios
# - Crear invitación
# - Verificar email enviado
```

### Verificar Funcionamiento:
1. Crear invitación desde la interfaz
2. Verificar mensaje de confirmación
3. Revisar inbox del email invitado
4. Verificar logs en consola del servidor

## 📊 Monitoreo

### Logs del Sistema:
```bash
# Verificar logs en consola del servidor
npm run dev

# Buscar estos mensajes:
# ✅ "Invitation email sent successfully"
# ❌ "Error sending invitation email"
```

### Dashboard de Resend:
- Ve a tu dashboard en Resend
- Sección "Logs" para ver emails enviados
- Sección "Analytics" para estadísticas

## 🛠️ Troubleshooting

### Error: "Invalid API key"
```bash
# Verificar .env.local
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxx  # Debe empezar con 're_'
```

### Error: "Invalid from email"
```bash
# Si no tienes dominio configurado, usa:
RESEND_FROM_EMAIL=onboarding@resend.dev

# Con dominio propio:
RESEND_FROM_EMAIL=noreply@tudominio.com
```

### Email no llega
1. Verificar spam/junk folder
2. Verificar API key en Resend
3. Verificar logs del servidor
4. Verificar límites de Resend (100/día gratis)

### Error en producción
```bash
# Verificar variables de entorno en producción
RESEND_API_KEY=tu_api_key_de_produccion
RESEND_FROM_EMAIL=noreply@tudominio.com
NEXT_PUBLIC_APP_URL=https://tudominio.com
```

## 📈 Límites y Consideraciones

### Plan Gratuito de Resend:
- 100 emails/día
- 3000 emails/mes
- Sin límite de dominios

### Plan Pagado:
- Desde $20/mes
- 50,000 emails/mes
- Soporte prioritario

### Recomendaciones:
- Configurar dominio propio para mejor deliverability
- Monitorear límites de envío
- Implementar retry logic para errores temporales
- Configurar webhooks para tracking avanzado

## 🎯 Próximos Pasos

Para mejorar el sistema:

1. **Plantillas avanzadas** - Personalizar más el diseño
2. **Recordatorios** - Enviar recordatorios de invitaciones pendientes
3. **Webhooks** - Tracking de emails abiertos/clickeados
4. **Múltiples idiomas** - Soporte para diferentes idiomas
5. **Notificaciones** - Notificar al invitador cuando se acepta

## 📞 Soporte

Si tienes problemas:
1. Verificar la configuración paso a paso
2. Revisar logs del servidor
3. Consultar documentación de Resend
4. Verificar límites de la cuenta

## ✅ Checklist de Configuración

- [ ] Cuenta de Resend creada
- [ ] API Key obtenida
- [ ] Variables de entorno configuradas
- [ ] Dominio configurado (opcional)
- [ ] Invitación de prueba enviada
- [ ] Email recibido correctamente
- [ ] Enlace de invitación funcional

---

**🎉 ¡El sistema de invitaciones por email está listo para usar!**