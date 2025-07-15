export interface InvoiceItem {
  id: string
  product_name: string
  quantity: number
  price: number
  total: number
}

export const calculateItemTotal = (quantity: number, price: number): number => {
  return quantity * price
}

export const calculateSubTotal = (items: InvoiceItem[]): number => {
  return items.reduce((sum, item) => sum + item.total, 0)
}

export const calculateTax = (subtotal: number, taxRate: number = 0.18): number => {
  return subtotal * taxRate
}

export const calculateTotal = (subtotal: number, tax: number): number => {
  return subtotal + tax
}

// Helper function to calculate quote totals with settings
export const calculateQuoteTotals = (items: any[], taxRate: number = 18) => {
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0)
  const tax = subtotal * (taxRate / 100)
  const total = subtotal + tax
  return { subtotal, tax, total }
}