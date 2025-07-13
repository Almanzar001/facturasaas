export const formatCurrency = (amount: number): string => {
  // Handle invalid numbers
  if (isNaN(amount) || amount === null || amount === undefined) {
    amount = 0
  }
  
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 0,
  }).format(amount)
}

export const parseCurrency = (value: string): number => {
  const cleanValue = value.replace(/[^\d.-]/g, '')
  return parseFloat(cleanValue) || 0
}