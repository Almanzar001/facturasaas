// Dynamic import helpers for PDF generation
export const generateInvoicePDFAsync = async (data: any) => {
  const { generateInvoicePDF } = await import('@/pdf/generateInvoicePDF')
  return generateInvoicePDF(data)
}

export const generateQuotePDFAsync = async (data: any) => {
  const { generateQuotePDF } = await import('@/pdf/generateQuotePDF')
  return generateQuotePDF(data)
}