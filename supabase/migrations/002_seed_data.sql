-- Insert sample expense categories
INSERT INTO public.expense_categories (name) VALUES 
('Servicios'),
('Suministros'),
('Transporte'),
('Equipos'),
('Marketing'),
('Otros')
ON CONFLICT DO NOTHING;

-- Sample data for testing (only insert if in development)
-- This data will be created only if there's a user with a specific test email
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- Check if we're in development by looking for a test user
    SELECT id INTO test_user_id FROM auth.users WHERE email = 'test@example.com' LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Insert sample clients
        INSERT INTO public.clients (user_id, name, email, phone, identification, address, city) VALUES
        (test_user_id, 'Empresa ABC S.A.S', 'contacto@empresaabc.com', '3001234567', '900123456', 'Calle 123 #45-67', 'Bogotá'),
        (test_user_id, 'Comercial XYZ Ltda', 'ventas@comercialxyz.com', '3109876543', '800987654', 'Carrera 45 #12-34', 'Medellín'),
        (test_user_id, 'Servicios DEF', 'info@serviciosdef.com', '3201357924', '700246810', 'Avenida 78 #90-12', 'Cali');

        -- Insert sample products
        INSERT INTO public.products (user_id, name, description, price, category, unit) VALUES
        (test_user_id, 'Consultoría Técnica', 'Servicio de consultoría técnica especializada', 150000.00, 'Servicios', 'hora'),
        (test_user_id, 'Desarrollo Web', 'Desarrollo de aplicaciones web personalizadas', 2500000.00, 'Servicios', 'proyecto'),
        (test_user_id, 'Mantenimiento Sistema', 'Mantenimiento mensual de sistemas', 800000.00, 'Servicios', 'mes'),
        (test_user_id, 'Hosting Premium', 'Servicio de hosting premium anual', 1200000.00, 'Servicios', 'año');

        -- Insert sample expenses
        INSERT INTO public.expenses (user_id, description, amount, category, date) VALUES
        (test_user_id, 'Pago de servicios de internet', 120000.00, 'Servicios', CURRENT_DATE - INTERVAL '5 days'),
        (test_user_id, 'Compra de equipos de oficina', 450000.00, 'Equipos', CURRENT_DATE - INTERVAL '10 days'),
        (test_user_id, 'Campaña publicitaria Facebook', 200000.00, 'Marketing', CURRENT_DATE - INTERVAL '3 days'),
        (test_user_id, 'Combustible y transporte', 85000.00, 'Transporte', CURRENT_DATE - INTERVAL '1 day');
    END IF;
END $$;