-- =====================================================
-- OPTIMIZED VIEWS FOR PERFORMANCE - Migration 006
-- =====================================================
-- This migration creates optimized views to replace complex queries
-- and improve application performance

-- 1. DASHBOARD OPTIMIZATION VIEWS
-- =====================================================

-- Vista optimizada para top clients (reemplaza dashboard.ts líneas 166-204)
CREATE OR REPLACE VIEW top_clients_optimized AS
SELECT 
    c.user_id,
    c.id as client_id,
    c.name,
    c.email,
    c.city,
    SUM(i.total) as total_revenue,
    COUNT(i.id) as invoice_count,
    ROW_NUMBER() OVER (PARTITION BY c.user_id ORDER BY SUM(i.total) DESC) as rank
FROM clients c
INNER JOIN invoices i ON c.id = i.client_id
WHERE i.status = 'paid'
GROUP BY c.user_id, c.id, c.name, c.email, c.city
ORDER BY total_revenue DESC;

-- Vista optimizada para top products (reemplaza dashboard.ts líneas 207-246)
CREATE OR REPLACE VIEW top_products_optimized AS
SELECT 
    p.user_id,
    ii.product_id,
    ii.product_name,
    SUM(ii.total) as total_revenue,
    SUM(ii.quantity) as total_quantity,
    COUNT(ii.id) as times_sold,
    ROW_NUMBER() OVER (PARTITION BY p.user_id ORDER BY SUM(ii.total) DESC) as rank
FROM products p
INNER JOIN invoice_items ii ON p.id = ii.product_id
INNER JOIN invoices i ON ii.invoice_id = i.id
WHERE i.status = 'paid'
GROUP BY p.user_id, ii.product_id, ii.product_name
ORDER BY total_revenue DESC;

-- Vista optimizada para recent activity (reemplaza dashboard.ts líneas 257-318)
CREATE OR REPLACE VIEW recent_activity_optimized AS
SELECT 
    'invoice' as activity_type,
    i.user_id,
    i.id,
    i.invoice_number as title,
    c.name as client_name,
    i.total as amount,
    i.status,
    i.created_at,
    i.date as reference_date
FROM invoices i
LEFT JOIN clients c ON i.client_id = c.id

UNION ALL

SELECT 
    'quote' as activity_type,
    q.user_id,
    q.id,
    q.quote_number as title,
    c.name as client_name,
    q.total as amount,
    q.status,
    q.created_at,
    q.date as reference_date
FROM quotes q
LEFT JOIN clients c ON q.client_id = c.id

UNION ALL

SELECT 
    'expense' as activity_type,
    e.user_id,
    e.id,
    e.description as title,
    e.category as client_name,
    e.amount,
    'completed' as status,
    e.created_at,
    e.date as reference_date
FROM expenses e

UNION ALL

SELECT 
    'client' as activity_type,
    c.user_id,
    c.id,
    c.name as title,
    NULL as client_name,
    0 as amount,
    'active' as status,
    c.created_at,
    c.created_at as reference_date
FROM clients c

ORDER BY created_at DESC;

-- Vista optimizada para monthly revenue (reemplaza dashboard.ts líneas 386-404)
CREATE OR REPLACE VIEW monthly_revenue_optimized AS
SELECT 
    i.user_id,
    DATE_TRUNC('month', i.date) as month,
    SUM(p.amount) as total_revenue,
    COUNT(p.id) as payments_count,
    COUNT(DISTINCT i.id) as invoices_count
FROM invoices i
INNER JOIN payments p ON i.id = p.invoice_id
GROUP BY i.user_id, DATE_TRUNC('month', i.date)
ORDER BY month DESC;

-- 2. INVOICES OPTIMIZATION VIEWS
-- =====================================================

-- Vista optimizada para invoices with details (reemplaza invoices.ts líneas 69-73)
CREATE OR REPLACE VIEW invoices_with_details AS
SELECT 
    i.id,
    i.user_id,
    i.invoice_number,
    i.date,
    i.due_date,
    i.status,
    i.subtotal,
    i.tax_amount,
    i.total,
    i.notes,
    i.created_at,
    i.updated_at,
    -- Client information
    c.name as client_name,
    c.email as client_email,
    c.phone as client_phone,
    c.address as client_address,
    -- Items summary
    (SELECT COUNT(*) FROM invoice_items ii WHERE ii.invoice_id = i.id) as items_count,
    (SELECT SUM(ii.quantity) FROM invoice_items ii WHERE ii.invoice_id = i.id) as total_items,
    -- Payment information
    (SELECT SUM(p.amount) FROM payments p WHERE p.invoice_id = i.id) as total_paid,
    (SELECT COUNT(*) FROM payments p WHERE p.invoice_id = i.id) as payments_count,
    -- Status calculations
    CASE 
        WHEN i.status = 'paid' THEN 'paid'
        WHEN i.due_date < CURRENT_DATE AND i.status != 'paid' THEN 'overdue'
        ELSE i.status
    END as display_status
FROM invoices i
LEFT JOIN clients c ON i.client_id = c.id;

-- Vista optimizada para invoice statistics (reemplaza invoices.ts líneas 360-381)
CREATE OR REPLACE VIEW invoice_statistics AS
SELECT 
    user_id,
    COUNT(*) as total_invoices,
    SUM(total) as total_amount,
    COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_invoices,
    SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END) as paid_amount,
    COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_invoices,
    SUM(CASE WHEN status = 'sent' THEN total ELSE 0 END) as sent_amount,
    COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_invoices,
    SUM(CASE WHEN status = 'draft' THEN total ELSE 0 END) as draft_amount,
    COUNT(CASE WHEN status = 'overdue' OR (due_date < CURRENT_DATE AND status != 'paid') THEN 1 END) as overdue_invoices,
    SUM(CASE WHEN status = 'overdue' OR (due_date < CURRENT_DATE AND status != 'paid') THEN total ELSE 0 END) as overdue_amount,
    AVG(total) as average_invoice_value,
    MIN(date) as first_invoice_date,
    MAX(date) as last_invoice_date
FROM invoices
GROUP BY user_id;

-- 3. QUOTES OPTIMIZATION VIEWS
-- =====================================================

-- Vista optimizada para quotes with details (reemplaza quotes.ts líneas 59-62)
CREATE OR REPLACE VIEW quotes_with_details AS
SELECT 
    q.id,
    q.user_id,
    q.quote_number,
    q.date,
    q.expiry_date,
    q.status,
    q.subtotal,
    q.tax_amount,
    q.total,
    q.notes,
    q.converted_to_invoice,
    q.created_at,
    q.updated_at,
    -- Client information
    c.name as client_name,
    c.email as client_email,
    c.phone as client_phone,
    c.address as client_address,
    -- Items summary
    (SELECT COUNT(*) FROM quote_items qi WHERE qi.quote_id = q.id) as items_count,
    (SELECT SUM(qi.quantity) FROM quote_items qi WHERE qi.quote_id = q.id) as total_items,
    -- Status calculations
    CASE 
        WHEN q.status = 'accepted' THEN 'accepted'
        WHEN q.expiry_date < CURRENT_DATE AND q.status = 'sent' THEN 'expired'
        ELSE q.status
    END as display_status
FROM quotes q
LEFT JOIN clients c ON q.client_id = c.id;

-- 4. EXPENSES OPTIMIZATION VIEWS
-- =====================================================

-- Vista optimizada para expense statistics (reemplaza expenses.ts líneas 169-211)
CREATE OR REPLACE VIEW expense_statistics AS
SELECT 
    user_id,
    COUNT(*) as total_expenses,
    SUM(amount) as total_amount,
    COUNT(DISTINCT category) as categories_count,
    AVG(amount) as average_expense,
    MIN(date) as first_expense_date,
    MAX(date) as last_expense_date,
    -- Por categoría
    (SELECT category FROM expenses e2 WHERE e2.user_id = e.user_id GROUP BY category ORDER BY SUM(amount) DESC LIMIT 1) as top_category,
    -- Por mes actual
    SUM(CASE WHEN DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END) as current_month_total,
    COUNT(CASE WHEN DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as current_month_count
FROM expenses e
GROUP BY user_id;

-- 5. PRODUCTS OPTIMIZATION VIEWS
-- =====================================================

-- Vista optimizada para product statistics (reemplaza products.ts líneas 200-207)
CREATE OR REPLACE VIEW product_statistics AS
SELECT 
    p.user_id,
    p.id as product_id,
    p.name,
    p.description,
    p.price,
    p.category,
    p.is_active,
    -- Invoice items stats
    COALESCE(invoice_stats.total_revenue, 0) as invoice_revenue,
    COALESCE(invoice_stats.total_quantity, 0) as invoice_quantity,
    COALESCE(invoice_stats.times_sold, 0) as invoice_times_sold,
    -- Quote items stats
    COALESCE(quote_stats.total_quoted, 0) as quote_revenue,
    COALESCE(quote_stats.quote_quantity, 0) as quote_quantity,
    COALESCE(quote_stats.quote_times, 0) as quote_times_sold,
    -- Combined stats
    COALESCE(invoice_stats.total_revenue, 0) + COALESCE(quote_stats.total_quoted, 0) as total_potential_revenue,
    COALESCE(invoice_stats.total_quantity, 0) + COALESCE(quote_stats.quote_quantity, 0) as total_quantity
FROM products p
LEFT JOIN (
    SELECT 
        ii.product_id,
        SUM(ii.total) as total_revenue,
        SUM(ii.quantity) as total_quantity,
        COUNT(ii.id) as times_sold
    FROM invoice_items ii
    INNER JOIN invoices i ON ii.invoice_id = i.id
    WHERE i.status = 'paid'
    GROUP BY ii.product_id
) invoice_stats ON p.id = invoice_stats.product_id
LEFT JOIN (
    SELECT 
        qi.product_id,
        SUM(qi.total) as total_quoted,
        SUM(qi.quantity) as quote_quantity,
        COUNT(qi.id) as quote_times
    FROM quote_items qi
    INNER JOIN quotes q ON qi.quote_id = q.id
    WHERE q.status IN ('sent', 'accepted')
    GROUP BY qi.product_id
) quote_stats ON p.id = quote_stats.product_id
WHERE p.is_active = true;

-- 6. DASHBOARD METRICS CACHE (MATERIALIZED VIEW)
-- =====================================================

-- Vista materializada para métricas del dashboard (actualización periódica)
CREATE MATERIALIZED VIEW dashboard_metrics_cache AS
SELECT 
    user_id,
    -- Revenue metrics
    SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END) as total_revenue,
    SUM(CASE WHEN status = 'sent' THEN total ELSE 0 END) as pending_revenue,
    SUM(CASE WHEN status = 'overdue' OR (due_date < CURRENT_DATE AND status != 'paid') THEN total ELSE 0 END) as overdue_revenue,
    -- Invoice counts
    COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_invoices,
    COUNT(CASE WHEN status = 'sent' THEN 1 END) as pending_invoices,
    COUNT(CASE WHEN status = 'overdue' OR (due_date < CURRENT_DATE AND status != 'paid') THEN 1 END) as overdue_invoices,
    COUNT(*) as total_invoices,
    -- Recent activity
    COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as recent_invoices,
    SUM(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' AND status = 'paid' THEN total ELSE 0 END) as recent_revenue,
    -- Last update
    MAX(updated_at) as last_updated
FROM invoices
GROUP BY user_id;

-- Índice para la vista materializada
CREATE INDEX idx_dashboard_metrics_cache_user_id ON dashboard_metrics_cache(user_id);

-- 7. ÍNDICES OPTIMIZADOS
-- =====================================================

-- Índices para mejorar el rendimiento de las vistas
CREATE INDEX IF NOT EXISTS idx_invoices_status_date_user ON invoices(status, date, user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_status ON invoices(client_id, status);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product_total ON invoice_items(product_id, total);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_date ON payments(invoice_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date_category ON expenses(user_id, date, category);
CREATE INDEX IF NOT EXISTS idx_quotes_status_date_user ON quotes(status, date, user_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_product_total ON quote_items(product_id, total);
CREATE INDEX IF NOT EXISTS idx_clients_user_name ON clients(user_id, name);
CREATE INDEX IF NOT EXISTS idx_products_user_active ON products(user_id, is_active);

-- 8. FUNCIÓN PARA ACTUALIZAR CACHE
-- =====================================================

-- Función para actualizar la vista materializada
CREATE OR REPLACE FUNCTION refresh_dashboard_cache()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW dashboard_metrics_cache;
END;
$$ LANGUAGE plpgsql;

-- Comentarios sobre el uso de las vistas
COMMENT ON VIEW top_clients_optimized IS 'Vista optimizada para obtener los mejores clientes por ingresos';
COMMENT ON VIEW top_products_optimized IS 'Vista optimizada para obtener los productos más vendidos';
COMMENT ON VIEW recent_activity_optimized IS 'Vista optimizada para actividad reciente del dashboard';
COMMENT ON VIEW monthly_revenue_optimized IS 'Vista optimizada para ingresos mensuales';
COMMENT ON VIEW invoices_with_details IS 'Vista optimizada para facturas con detalles de cliente y items';
COMMENT ON VIEW invoice_statistics IS 'Vista optimizada para estadísticas de facturas';
COMMENT ON VIEW quotes_with_details IS 'Vista optimizada para cotizaciones con detalles de cliente';
COMMENT ON VIEW expense_statistics IS 'Vista optimizada para estadísticas de gastos';
COMMENT ON VIEW product_statistics IS 'Vista optimizada para estadísticas de productos';
COMMENT ON MATERIALIZED VIEW dashboard_metrics_cache IS 'Cache materializado para métricas del dashboard (actualizar periódicamente)';