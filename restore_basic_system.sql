-- =====================================================
-- RESTAURAR SISTEMA BÁSICO SIN ORGANIZACIONES
-- =====================================================

-- 1. ELIMINAR TABLAS DE ORGANIZACIONES SI EXISTEN
DROP TABLE IF EXISTS organization_invitations CASCADE;
DROP TABLE IF EXISTS organization_members CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- 2. ELIMINAR FUNCIONES DE ORGANIZACIONES
DROP FUNCTION IF EXISTS create_organization_invitation CASCADE;
DROP FUNCTION IF EXISTS accept_organization_invitation CASCADE;
DROP FUNCTION IF EXISTS get_invitation_by_token CASCADE;
DROP FUNCTION IF EXISTS cancel_organization_invitation CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_invitations CASCADE;
DROP FUNCTION IF EXISTS generate_invitation_token CASCADE;

-- 3. VERIFICAR QUE TABLAS BÁSICAS EXISTEN
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    full_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    tax_id VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE,
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    quote_number VARCHAR(100) NOT NULL,
    issue_date DATE NOT NULL,
    expiry_date DATE,
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    category VARCHAR(100),
    expense_date DATE NOT NULL,
    receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. CONFIGURAR RLS BÁSICO
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- 5. CREAR POLÍTICAS BÁSICAS (PERMISIVAS PARA DESARROLLO)
-- Usuarios pueden ver sus propios datos
DROP POLICY IF EXISTS "Users can view own data" ON users;
CREATE POLICY "Users can view own data" ON users 
    FOR ALL USING (auth.uid() = id);

-- Usuarios pueden ver sus propios clientes
DROP POLICY IF EXISTS "Users can manage own clients" ON clients;
CREATE POLICY "Users can manage own clients" ON clients 
    FOR ALL USING (auth.uid() = user_id);

-- Usuarios pueden ver sus propios productos
DROP POLICY IF EXISTS "Users can manage own products" ON products;
CREATE POLICY "Users can manage own products" ON products 
    FOR ALL USING (auth.uid() = user_id);

-- Usuarios pueden ver sus propias facturas
DROP POLICY IF EXISTS "Users can manage own invoices" ON invoices;
CREATE POLICY "Users can manage own invoices" ON invoices 
    FOR ALL USING (auth.uid() = user_id);

-- Usuarios pueden ver sus propias cotizaciones
DROP POLICY IF EXISTS "Users can manage own quotes" ON quotes;
CREATE POLICY "Users can manage own quotes" ON quotes 
    FOR ALL USING (auth.uid() = user_id);

-- Usuarios pueden ver sus propios gastos
DROP POLICY IF EXISTS "Users can manage own expenses" ON expenses;
CREATE POLICY "Users can manage own expenses" ON expenses 
    FOR ALL USING (auth.uid() = user_id);

-- 6. CREAR FUNCIÓN PARA MANEJAR NUEVOS USUARIOS
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO users (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. CREAR TRIGGER PARA NUEVOS USUARIOS
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- 8. CREAR FUNCIÓN PARA ACTUALIZAR TIMESTAMPS
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. CREAR TRIGGERS PARA ACTUALIZAR TIMESTAMPS
DROP TRIGGER IF EXISTS handle_users_updated_at ON users;
CREATE TRIGGER handle_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS handle_clients_updated_at ON clients;
CREATE TRIGGER handle_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS handle_products_updated_at ON products;
CREATE TRIGGER handle_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS handle_invoices_updated_at ON invoices;
CREATE TRIGGER handle_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS handle_quotes_updated_at ON quotes;
CREATE TRIGGER handle_quotes_updated_at
    BEFORE UPDATE ON quotes
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS handle_expenses_updated_at ON expenses;
CREATE TRIGGER handle_expenses_updated_at
    BEFORE UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- 10. MOSTRAR RESUMEN DEL SISTEMA
SELECT 
    'SISTEMA BÁSICO RESTAURADO' as status,
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM clients) as total_clients,
    (SELECT COUNT(*) FROM products) as total_products,
    (SELECT COUNT(*) FROM invoices) as total_invoices,
    (SELECT COUNT(*) FROM quotes) as total_quotes,
    (SELECT COUNT(*) FROM expenses) as total_expenses;

-- 11. MOSTRAR TABLAS DISPONIBLES
SELECT 
    'TABLAS DISPONIBLES' as section,
    table_name as tabla,
    table_type as tipo
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN ('users', 'clients', 'products', 'invoices', 'quotes', 'expenses')
ORDER BY table_name;