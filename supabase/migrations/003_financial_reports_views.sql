-- SQL Views for Financial Reports
-- These views provide common financial reports and analytics

-- Monthly Revenue Summary View
CREATE OR REPLACE VIEW monthly_revenue_summary AS
SELECT 
    user_id,
    DATE_TRUNC('month', date) as month,
    COUNT(*) as invoice_count,
    SUM(subtotal) as total_subtotal,
    SUM(tax_amount) as total_tax,
    SUM(total) as total_revenue,
    AVG(total) as average_invoice_value,
    COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_invoices,
    SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END) as paid_revenue,
    COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_invoices,
    SUM(CASE WHEN status = 'overdue' THEN total ELSE 0 END) as overdue_amount
FROM invoices 
WHERE date >= CURRENT_DATE - INTERVAL '2 years'
GROUP BY user_id, DATE_TRUNC('month', date)
ORDER BY month DESC;

-- Client Performance Report View
CREATE OR REPLACE VIEW client_performance_report AS
SELECT 
    c.user_id,
    c.id as client_id,
    c.name as client_name,
    c.email,
    c.city,
    COUNT(i.id) as total_invoices,
    SUM(i.total) as total_revenue,
    AVG(i.total) as average_invoice_value,
    MAX(i.date) as last_invoice_date,
    MIN(i.date) as first_invoice_date,
    COUNT(CASE WHEN i.status = 'paid' THEN 1 END) as paid_invoices,
    SUM(CASE WHEN i.status = 'paid' THEN i.total ELSE 0 END) as paid_revenue,
    COUNT(CASE WHEN i.status = 'overdue' THEN 1 END) as overdue_invoices,
    SUM(CASE WHEN i.status = 'overdue' THEN i.total ELSE 0 END) as overdue_amount,
    -- Quote metrics
    COUNT(q.id) as total_quotes,
    SUM(q.total) as total_quoted_amount,
    COUNT(CASE WHEN q.status = 'accepted' THEN 1 END) as accepted_quotes,
    SUM(CASE WHEN q.status = 'accepted' THEN q.total ELSE 0 END) as accepted_quote_amount,
    CASE 
        WHEN COUNT(q.id) > 0 THEN 
            ROUND((COUNT(CASE WHEN q.status = 'accepted' THEN 1 END) * 100.0 / COUNT(q.id)), 2)
        ELSE 0 
    END as quote_conversion_rate
FROM clients c
LEFT JOIN invoices i ON c.id = i.client_id
LEFT JOIN quotes q ON c.id = q.client_id
GROUP BY c.user_id, c.id, c.name, c.email, c.city
HAVING COUNT(i.id) > 0 OR COUNT(q.id) > 0
ORDER BY total_revenue DESC NULLS LAST;

-- Product Sales Analysis View
CREATE OR REPLACE VIEW product_sales_analysis AS
SELECT 
    p.user_id,
    p.id as product_id,
    p.name as product_name,
    p.category,
    p.price as current_price,
    -- Invoice items metrics
    COUNT(ii.id) as times_sold,
    SUM(ii.quantity) as total_quantity_sold,
    SUM(ii.total) as total_revenue,
    AVG(ii.price) as average_selling_price,
    MIN(ii.price) as min_selling_price,
    MAX(ii.price) as max_selling_price,
    -- Recent sales
    MAX(i.date) as last_sale_date,
    COUNT(CASE WHEN i.date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as sales_last_30_days,
    SUM(CASE WHEN i.date >= CURRENT_DATE - INTERVAL '30 days' THEN ii.total ELSE 0 END) as revenue_last_30_days,
    -- Quote items metrics
    COUNT(qi.id) as times_quoted,
    SUM(qi.quantity) as total_quantity_quoted,
    SUM(qi.total) as total_quoted_amount
FROM products p
LEFT JOIN invoice_items ii ON p.id = ii.product_id
LEFT JOIN invoices i ON ii.invoice_id = i.id
LEFT JOIN quote_items qi ON p.id = qi.product_id
WHERE p.is_active = true
GROUP BY p.user_id, p.id, p.name, p.category, p.price
HAVING COUNT(ii.id) > 0 OR COUNT(qi.id) > 0
ORDER BY total_revenue DESC NULLS LAST;

-- Financial Dashboard Summary View
CREATE OR REPLACE VIEW financial_dashboard_summary AS
WITH monthly_metrics AS (
    SELECT 
        user_id,
        DATE_TRUNC('month', CURRENT_DATE) as current_month,
        DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') as previous_month
),
current_month_revenue AS (
    SELECT 
        user_id,
        SUM(total) as revenue
    FROM invoices 
    WHERE DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
    AND status = 'paid'
    GROUP BY user_id
),
previous_month_revenue AS (
    SELECT 
        user_id,
        SUM(total) as revenue
    FROM invoices 
    WHERE DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
    AND status = 'paid'
    GROUP BY user_id
),
current_month_expenses AS (
    SELECT 
        user_id,
        SUM(amount) as expenses
    FROM expenses 
    WHERE DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
    GROUP BY user_id
),
previous_month_expenses AS (
    SELECT 
        user_id,
        SUM(amount) as expenses
    FROM expenses 
    WHERE DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
    GROUP BY user_id
)
SELECT 
    mm.user_id,
    -- Current month metrics
    COALESCE(cmr.revenue, 0) as current_month_revenue,
    COALESCE(cme.expenses, 0) as current_month_expenses,
    COALESCE(cmr.revenue, 0) - COALESCE(cme.expenses, 0) as current_month_profit,
    
    -- Previous month metrics for comparison
    COALESCE(pmr.revenue, 0) as previous_month_revenue,
    COALESCE(pme.expenses, 0) as previous_month_expenses,
    COALESCE(pmr.revenue, 0) - COALESCE(pme.expenses, 0) as previous_month_profit,
    
    -- Growth percentages
    CASE 
        WHEN COALESCE(pmr.revenue, 0) > 0 THEN 
            ROUND(((COALESCE(cmr.revenue, 0) - COALESCE(pmr.revenue, 0)) * 100.0 / COALESCE(pmr.revenue, 0)), 2)
        ELSE 0 
    END as revenue_growth_percentage,
    
    CASE 
        WHEN COALESCE(pme.expenses, 0) > 0 THEN 
            ROUND(((COALESCE(cme.expenses, 0) - COALESCE(pme.expenses, 0)) * 100.0 / COALESCE(pme.expenses, 0)), 2)
        ELSE 0 
    END as expense_growth_percentage,
    
    -- Outstanding invoices
    (SELECT COUNT(*) FROM invoices WHERE user_id = mm.user_id AND status IN ('draft', 'sent')) as pending_invoices_count,
    (SELECT COALESCE(SUM(total), 0) FROM invoices WHERE user_id = mm.user_id AND status IN ('draft', 'sent')) as pending_invoices_amount,
    
    -- Overdue invoices
    (SELECT COUNT(*) FROM invoices WHERE user_id = mm.user_id AND status = 'overdue') as overdue_invoices_count,
    (SELECT COALESCE(SUM(total), 0) FROM invoices WHERE user_id = mm.user_id AND status = 'overdue') as overdue_invoices_amount
    
FROM monthly_metrics mm
LEFT JOIN current_month_revenue cmr ON mm.user_id = cmr.user_id
LEFT JOIN previous_month_revenue pmr ON mm.user_id = pmr.user_id
LEFT JOIN current_month_expenses cme ON mm.user_id = cme.user_id
LEFT JOIN previous_month_expenses pme ON mm.user_id = pme.user_id;

-- Aging Report View (Accounts Receivable)
CREATE OR REPLACE VIEW accounts_receivable_aging AS
SELECT 
    i.user_id,
    c.name as client_name,
    i.invoice_number,
    i.date as invoice_date,
    i.due_date,
    i.total as amount,
    i.status,
    CASE 
        WHEN i.due_date IS NULL THEN 'No Due Date'
        WHEN i.due_date >= CURRENT_DATE THEN 'Current'
        WHEN i.due_date >= CURRENT_DATE - INTERVAL '30 days' THEN '1-30 Days'
        WHEN i.due_date >= CURRENT_DATE - INTERVAL '60 days' THEN '31-60 Days'
        WHEN i.due_date >= CURRENT_DATE - INTERVAL '90 days' THEN '61-90 Days'
        ELSE '90+ Days'
    END as aging_bucket,
    CASE 
        WHEN i.due_date IS NULL THEN 0
        ELSE CURRENT_DATE - i.due_date
    END as days_overdue
FROM invoices i
JOIN clients c ON i.client_id = c.id
WHERE i.status IN ('sent', 'overdue')
ORDER BY i.user_id, days_overdue DESC;

-- Cash Flow Summary View (Updated with payments)
CREATE OR REPLACE VIEW cash_flow_summary AS
WITH daily_transactions AS (
    -- Payments (actual income)
    SELECT 
        p.user_id,
        p.payment_date as transaction_date,
        'income' as transaction_type,
        CONCAT('payment_', p.payment_method) as source,
        CONCAT(i.invoice_number, ' - ', COALESCE(p.reference_number, 'Sin ref.')) as reference,
        p.amount as amount,
        pa.name as account_name
    FROM payments p
    JOIN invoices i ON p.invoice_id = i.id
    LEFT JOIN payment_accounts pa ON p.payment_account_id = pa.id
    
    UNION ALL
    
    -- Expenses (outgoing)
    SELECT 
        user_id,
        date as transaction_date,
        'expense' as transaction_type,
        category as source,
        description as reference,
        -amount as amount,
        NULL as account_name
    FROM expenses
)
SELECT 
    user_id,
    transaction_date,
    transaction_type,
    source,
    reference,
    amount,
    account_name,
    SUM(amount) OVER (
        PARTITION BY user_id 
        ORDER BY transaction_date, transaction_type 
        ROWS UNBOUNDED PRECEDING
    ) as running_balance
FROM daily_transactions
ORDER BY user_id, transaction_date DESC, transaction_type;

-- Payment Summary by Method View
CREATE OR REPLACE VIEW payment_summary_by_method AS
SELECT 
    user_id,
    payment_method,
    COUNT(*) as payment_count,
    SUM(amount) as total_amount,
    AVG(amount) as average_amount,
    MIN(payment_date) as first_payment_date,
    MAX(payment_date) as last_payment_date,
    -- This month vs last month
    COUNT(CASE WHEN payment_date >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as current_month_count,
    SUM(CASE WHEN payment_date >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END) as current_month_amount,
    COUNT(CASE WHEN payment_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') 
                AND payment_date < DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as previous_month_count,
    SUM(CASE WHEN payment_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') 
              AND payment_date < DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END) as previous_month_amount
FROM payments
GROUP BY user_id, payment_method
ORDER BY user_id, total_amount DESC;

-- Top Clients by Revenue View
CREATE OR REPLACE VIEW top_clients_by_revenue AS
SELECT 
    c.user_id,
    c.id as client_id,
    c.name as client_name,
    c.email,
    COUNT(i.id) as invoice_count,
    SUM(i.total) as total_invoiced,
    -- Actual payments received
    COUNT(p.id) as payment_count,
    SUM(p.amount) as total_payments_received,
    AVG(i.total) as average_invoice_amount,
    MAX(i.date) as last_invoice_date,
    MAX(p.payment_date) as last_payment_date,
    -- Calculate payment ratio
    CASE 
        WHEN SUM(i.total) > 0 THEN 
            ROUND((SUM(p.amount) * 100.0 / SUM(i.total)), 2)
        ELSE 0 
    END as payment_percentage,
    RANK() OVER (PARTITION BY c.user_id ORDER BY SUM(p.amount) DESC) as revenue_rank
FROM clients c
JOIN invoices i ON c.id = i.client_id
LEFT JOIN payments p ON i.id = p.invoice_id
GROUP BY c.user_id, c.id, c.name, c.email
HAVING COUNT(i.id) > 0
ORDER BY c.user_id, total_payments_received DESC NULLS LAST;

-- Grant permissions on views
GRANT SELECT ON monthly_revenue_summary TO authenticated;
GRANT SELECT ON client_performance_report TO authenticated;
GRANT SELECT ON product_sales_analysis TO authenticated;
GRANT SELECT ON financial_dashboard_summary TO authenticated;
GRANT SELECT ON accounts_receivable_aging TO authenticated;
GRANT SELECT ON cash_flow_summary TO authenticated;
GRANT SELECT ON payment_summary_by_method TO authenticated;
GRANT SELECT ON top_clients_by_revenue TO authenticated;

-- Create RLS policies for views
ALTER VIEW monthly_revenue_summary ENABLE ROW LEVEL SECURITY;
ALTER VIEW client_performance_report ENABLE ROW LEVEL SECURITY;
ALTER VIEW product_sales_analysis ENABLE ROW LEVEL SECURITY;
ALTER VIEW financial_dashboard_summary ENABLE ROW LEVEL SECURITY;
ALTER VIEW accounts_receivable_aging ENABLE ROW LEVEL SECURITY;
ALTER VIEW cash_flow_summary ENABLE ROW LEVEL SECURITY;
ALTER VIEW payment_summary_by_method ENABLE ROW LEVEL SECURITY;
ALTER VIEW top_clients_by_revenue ENABLE ROW LEVEL SECURITY;

-- RLS policies to ensure users only see their own data
CREATE POLICY "Users can view their own monthly revenue" ON monthly_revenue_summary
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own client performance" ON client_performance_report
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own product sales" ON product_sales_analysis
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own financial dashboard" ON financial_dashboard_summary
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own aging report" ON accounts_receivable_aging
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own cash flow" ON cash_flow_summary
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own payment summary" ON payment_summary_by_method
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own top clients" ON top_clients_by_revenue
    FOR SELECT USING (auth.uid() = user_id);