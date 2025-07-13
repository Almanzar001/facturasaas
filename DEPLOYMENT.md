# 🚀 Guía de Deployment

## Pasos para subir a GitHub y deployar en Vercel

### 1. Subir a GitHub (Manual)

Como git tiene problemas de configuración, sigue estos pasos manuales:

1. **Ve a GitHub.com** y crea un nuevo repositorio:
   - Nombre: `factura-saas-app` (o el nombre que prefieras)
   - Descripción: "Sistema de facturación moderno con Next.js y Supabase"
   - Público o Privado (tu elección)
   - **NO** inicialices con README, .gitignore o licencia (ya los tenemos)

2. **Descarga/Comprime los archivos importantes:**
   
   **Incluir estos archivos y carpetas:**
   ```
   📁 src/               # Todo el código fuente
   📁 public/            # Archivos estáticos
   📁 supabase/          # Migraciones de base de datos
   📄 package.json       # Dependencias
   📄 package-lock.json  # Lock de dependencias
   📄 next.config.js     # Configuración Next.js
   📄 tailwind.config.js # Configuración Tailwind
   📄 tsconfig.json      # Configuración TypeScript
   📄 postcss.config.js  # Configuración PostCSS
   📄 .gitignore         # Archivos a ignorar
   📄 .env.example       # Ejemplo de variables de entorno
   📄 README.md          # Documentación
   📄 DEPLOYMENT.md      # Esta guía
   ```

   **NO incluir:**
   ```
   📁 node_modules/      # Dependencias (se reinstalan)
   📁 .next/             # Build artifacts
   📁 .env.local         # Variables secretas
   📁 factura-saas/      # Carpeta duplicada
   ```

3. **Subir a GitHub:**
   - Arrastra los archivos al repositorio nuevo en GitHub
   - O usa GitHub Desktop si lo tienes instalado
   - Commit message: "Initial commit - Factura SaaS optimized for production"

### 2. Configurar Supabase

1. **Crear proyecto en Supabase:**
   - Ve a [supabase.com](https://supabase.com)
   - Crea una nueva organización y proyecto
   - Anota la URL y API Key (anon, public)

2. **Ejecutar migraciones:**
   - Ve a SQL Editor en Supabase Dashboard
   - Ejecuta los archivos en orden:
     - `supabase/migrations/001_create_tables.sql`
     - `supabase/migrations/002_seed_data.sql`
     - `supabase/migrations/003_financial_reports_views.sql`
     - `supabase/migrations/004_add_missing_tables.sql`
     - `supabase/migrations/005_update_fiscal_sequences_table.sql`

3. **Configurar Authentication:**
   - Habilitar Email/Password auth
   - Configurar redirect URLs (después de tener la URL de Vercel)

### 3. Deploy en Vercel

1. **Conectar repositorio:**
   - Ve a [vercel.com](https://vercel.com)
   - Conecta tu cuenta de GitHub
   - Importa el repositorio `factura-saas-app`

2. **Configurar variables de entorno:**
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
   NEXT_PUBLIC_APP_NAME=Factura SaaS
   ```

3. **Deploy:**
   - Vercel detectará automáticamente que es Next.js
   - Build Command: `npm run build` (ya configurado)
   - Output Directory: `.next` (automático)
   - Click "Deploy"

### 4. Post-Deploy

1. **Configurar dominio personalizado** (opcional):
   - En Vercel > Settings > Domains
   - Agregar tu dominio personalizado

2. **Actualizar Supabase Auth URLs:**
   - Ve a Authentication > Settings en Supabase
   - Site URL: `https://tu-app.vercel.app`
   - Redirect URLs: `https://tu-app.vercel.app/auth/callback`

3. **Testing:**
   - Crea una cuenta de prueba
   - Verifica todas las funcionalidades
   - Prueba crear facturas, clientes, productos

### 5. Comandos de Desarrollo Local

```bash
# Instalar dependencias
npm install

# Desarrollo
npm run dev

# Build de producción
npm run build

# Verificar tipos
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Limpiar build anterior
npm run clean
```

### 6. Solución de Problemas Comunes

**Error de build en Vercel:**
- Verificar que todas las variables de entorno están configuradas
- Revisar los logs de build en Vercel dashboard

**Error de conexión a Supabase:**
- Verificar URL y API Keys
- Confirmar que las migraciones se ejecutaron correctamente

**Error 404 en rutas:**
- Verificar que todas las pages están correctamente nombradas
- Next.js 15 usa App Router automáticamente

**Errores de TypeScript:**
- Ejecutar `npm run type-check` localmente
- Corregir errores antes de hacer push

### 7. Monitoreo y Logs

- **Vercel Analytics**: Habilitar en dashboard
- **Supabase Logs**: Ver en proyecto Supabase
- **Browser Console**: Para errores del frontend

### 8. Actualizaciones Futuras

Para actualizar el código:
1. Hacer cambios localmente
2. Probar con `npm run build`
3. Subir a GitHub (push al repositorio)
4. Vercel hace auto-deploy desde main branch

---

## ✅ Checklist Final

- [ ] Repositorio creado en GitHub
- [ ] Código subido (sin node_modules, .env, .next)
- [ ] Proyecto Supabase configurado
- [ ] Migraciones ejecutadas
- [ ] Variables de entorno en Vercel
- [ ] Deploy exitoso en Vercel
- [ ] Auth URLs actualizadas en Supabase
- [ ] Testing de funcionalidades principales
- [ ] Dominio personalizado (opcional)

¡Tu aplicación debería estar funcionando en producción! 🎉