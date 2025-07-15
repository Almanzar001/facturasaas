export * from './supabaseClient'
export * from './clients'
export * from './products'
export * from './invoices'
export * from './quotes'
export * from './expenses'
export * from './dashboard'
export * from './payments'

export type { 
  Client, 
  CreateClientData, 
  UpdateClientData 
} from './clients'

export type { 
  Product, 
  CreateProductData, 
  UpdateProductData 
} from './products'

export type { 
  Invoice, 
  InvoiceItem, 
  CreateInvoiceData, 
  UpdateInvoiceData 
} from './invoices'

export type { 
  Quote, 
  QuoteItem, 
  CreateQuoteData, 
  UpdateQuoteData 
} from './quotes'

export type { 
  Expense, 
  CreateExpenseData, 
  UpdateExpenseData, 
  ExpenseCategory 
} from './expenses'

export type { 
  DashboardMetrics, 
  RevenueByMonth, 
  TopClient, 
  TopProduct, 
  DashboardData 
} from './dashboard'

export type {
  Payment,
  CreatePaymentData
} from './payments'
