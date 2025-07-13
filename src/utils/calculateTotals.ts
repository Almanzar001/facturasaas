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

export const calculateTax = (subtotal: number, taxRate: number = 0.19): number => {
  return subtotal * taxRate
}

export const calculateTotal = (subtotal: number, tax: number): number => {
  return subtotal + tax
}