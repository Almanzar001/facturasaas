import { lazy, Suspense } from 'react'
import LoadingSpinner from './LoadingSpinner'

// Lazy load PDF components
const PDFViewer = lazy(() => import('@/pdf/generateInvoicePDF').then(module => ({ default: module.generateInvoicePDF })))
const QuotePDFViewer = lazy(() => import('@/pdf/generateQuotePDF').then(module => ({ default: module.generateQuotePDF })))

interface LazyPDFProps {
  type: 'invoice' | 'quote'
  data: any
  onGenerate: (pdfBlob: Blob) => void
}

export default function LazyPDF({ type, data, onGenerate }: LazyPDFProps) {
  const PDFComponent = type === 'invoice' ? PDFViewer : QuotePDFViewer

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <PDFComponent data={data} onGenerate={onGenerate} />
    </Suspense>
  )
}

// Dynamic import helpers
export const generateInvoicePDFAsync = async (data: any) => {
  const { generateInvoicePDF } = await import('@/pdf/generateInvoicePDF')
  return generateInvoicePDF(data)
}

export const generateQuotePDFAsync = async (data: any) => {
  const { generateQuotePDF } = await import('@/pdf/generateQuotePDF')
  return generateQuotePDF(data)
}