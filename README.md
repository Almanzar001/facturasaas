# Supabase Database Setup

Este directorio contiene los scripts SQL necesarios para configurar la base de datos de FacturaSaaS.

## Archivos

- `schema.sql` - Esquema completo de la base de datos
- `migrations/001_create_tables.sql` - Migración inicial con tablas, índices y políticas RLS
- `migrations/002_seed_data.sql` - Datos de prueba opcionales

## Configuración

### 1. Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com)
2. Crea una cuenta y un nuevo proyecto
3. Anota la URL del proyecto y la clave anónima

### 2. Configurar variables de entorno

Actualiza el archivo `.env.local` con tus credenciales:

```bash
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima
```

### 3. Ejecutar migraciones

#### Opción A: Usando la interfaz web de Supabase
1. Ve a tu proyecto en Supabase
2. Navega a SQL Editor
3. Ejecuta el contenido de `migrations/001_create_tables.sql`
4. Opcionalmente ejecuta `migrations/002_seed_data.sql` para datos de prueba

#### Opción B: Usando Supabase CLI
```bash
# Instalar Supabase CLI
npm install -g supabase

# Inicializar proyecto
supabase init

# Configurar conexión
supabase link --project-ref tu_project_id

# Ejecutar migraciones
supabase db push
```

## Estructura de Base de Datos

### Tablas principales

- **users** - Perfiles de usuario (extiende auth.users)
- **clients** - Clientes del negocio
- **products** - Productos/servicios
- **invoices** - Facturas
- **invoice_items** - Items de factura
- **quotes** - Cotizaciones
- **quote_items** - Items de cotización
- **expenses** - Gastos del negocio

### Seguridad

- **Row Level Security (RLS)** habilitado en todas las tablas
- Los usuarios solo pueden ver/modificar sus propios datos
- Autenticación manejada por Supabase Auth

### Características

- **UUIDs** como llaves primarias
- **Timestamps** automáticos (created_at, updated_at)
- **Índices** optimizados para consultas frecuentes
- **Triggers** para actualizar timestamps
- **Validaciones** en campos críticos

## Datos de Prueba

Si ejecutas `002_seed_data.sql`, se crearán datos de ejemplo solo si existe un usuario con email `test@example.com`.

Para usar datos de prueba:
1. Registra un usuario con email `test@example.com`
2. Ejecuta el script de seed data
3. Los datos aparecerán en la aplicación

## Backup y Restore

```bash
# Backup
supabase db dump --file backup.sql

# Restore
supabase db reset
supabase db push
```