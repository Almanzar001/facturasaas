import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { Quote, QuoteItem } from '@/services/quotes'
import { Client } from '@/services/clients'
import { formatCurrency } from '@/utils/formatCurrency'

export interface QuotePDFData {
  quote: Quote
  client: Client
  items: QuoteItem[]
  company: {
    name: string
    address: string
    phone: string
    email: string
    nit: string
    logo?: string
  }
}

export class QuotePDFGenerator {
  private doc: PDFDocument
  private currentPage: any
  private currentY: number
  private margin: number
  private pageWidth: number
  private pageHeight: number
  private font: any
  private boldFont: any

  constructor() {
    this.doc = null as any
    this.currentPage = null
    this.currentY = 0
    this.margin = 50
    this.pageWidth = 595.28 // A4 width
    this.pageHeight = 841.89 // A4 height
  }

  async generateQuotePDF(data: QuotePDFData): Promise<Uint8Array> {
    this.doc = await PDFDocument.create()
    this.font = await this.doc.embedFont(StandardFonts.Helvetica)
    this.boldFont = await this.doc.embedFont(StandardFonts.HelveticaBold)
    
    this.currentPage = this.doc.addPage([this.pageWidth, this.pageHeight])
    this.currentY = this.pageHeight - this.margin

    // Generate PDF content
    await this.drawHeader(data.company)
    await this.drawQuoteInfo(data.quote)
    await this.drawClientInfo(data.client)
    await this.drawItemsTable(data.items)
    await this.drawTotals(data.quote)
    await this.drawTermsAndConditions()
    await this.drawFooter(data.company)

    return this.doc.save()
  }

  private async drawHeader(company: any) {
    const { name, address, phone, email, nit } = company
    
    // Company name
    this.currentPage.drawText(name, {
      x: this.margin,
      y: this.currentY,
      size: 24,
      font: this.boldFont,
      color: rgb(0.12, 0.25, 0.69) // Primary color
    })
    this.currentY -= 35

    // Company info
    this.currentPage.drawText(`NIT: ${nit}`, {
      x: this.margin,
      y: this.currentY,
      size: 10,
      font: this.font,
      color: rgb(0.4, 0.4, 0.4)
    })
    this.currentY -= 15

    this.currentPage.drawText(address, {
      x: this.margin,
      y: this.currentY,
      size: 10,
      font: this.font,
      color: rgb(0.4, 0.4, 0.4)
    })
    this.currentY -= 15

    this.currentPage.drawText(`Tel: ${phone} | Email: ${email}`, {
      x: this.margin,
      y: this.currentY,
      size: 10,
      font: this.font,
      color: rgb(0.4, 0.4, 0.4)
    })
    this.currentY -= 40

    // Title
    this.currentPage.drawText('COTIZACIÓN', {
      x: this.pageWidth - 160,
      y: this.pageHeight - this.margin,
      size: 18,
      font: this.boldFont,
      color: rgb(0.96, 0.62, 0.04) // Secondary color
    })
  }

  private async drawQuoteInfo(quote: Quote) {
    const rightX = this.pageWidth - 200

    // Quote number
    this.currentPage.drawText(`Cotización No: ${quote.quote_number}`, {
      x: rightX,
      y: this.pageHeight - this.margin - 35,
      size: 12,
      font: this.boldFont,
      color: rgb(0, 0, 0)
    })

    // Quote date
    this.currentPage.drawText(`Fecha: ${new Date(quote.date).toLocaleDateString('es-CO')}`, {
      x: rightX,
      y: this.pageHeight - this.margin - 55,
      size: 10,
      font: this.font,
      color: rgb(0.4, 0.4, 0.4)
    })

    // Expiry date
    if (quote.expiry_date) {
      this.currentPage.drawText(`Válida hasta: ${new Date(quote.expiry_date).toLocaleDateString('es-CO')}`, {
        x: rightX,
        y: this.pageHeight - this.margin - 75,
        size: 10,
        font: this.boldFont,
        color: rgb(0.96, 0.62, 0.04)
      })
    }

    // Status
    const statusText = this.getStatusText(quote.status)
    const statusColor = this.getStatusColor(quote.status)
    
    this.currentPage.drawText(`Estado: ${statusText}`, {
      x: rightX,
      y: this.pageHeight - this.margin - 95,
      size: 10,
      font: this.boldFont,
      color: statusColor
    })
  }

  private async drawClientInfo(client: Client) {
    // Client section title
    this.currentPage.drawText('CLIENTE:', {
      x: this.margin,
      y: this.currentY,
      size: 12,
      font: this.boldFont,
      color: rgb(0, 0, 0)
    })
    this.currentY -= 25

    // Client name
    this.currentPage.drawText(client.name, {
      x: this.margin,
      y: this.currentY,
      size: 12,
      font: this.boldFont,
      color: rgb(0, 0, 0)
    })
    this.currentY -= 20

    // Client identification
    if (client.identification) {
      this.currentPage.drawText(`${client.identification_type}: ${client.identification}`, {
        x: this.margin,
        y: this.currentY,
        size: 10,
        font: this.font,
        color: rgb(0.4, 0.4, 0.4)
      })
      this.currentY -= 15
    }

    // Client address
    if (client.address) {
      this.currentPage.drawText(`Dirección: ${client.address}`, {
        x: this.margin,
        y: this.currentY,
        size: 10,
        font: this.font,
        color: rgb(0.4, 0.4, 0.4)
      })
      this.currentY -= 15
    }

    // Client city
    if (client.city) {
      this.currentPage.drawText(`Ciudad: ${client.city}`, {
        x: this.margin,
        y: this.currentY,
        size: 10,
        font: this.font,
        color: rgb(0.4, 0.4, 0.4)
      })
      this.currentY -= 15
    }

    // Client contact
    const contactInfo = []
    if (client.phone) contactInfo.push(`Tel: ${client.phone}`)
    if (client.email) contactInfo.push(`Email: ${client.email}`)
    
    if (contactInfo.length > 0) {
      this.currentPage.drawText(contactInfo.join(' | '), {
        x: this.margin,
        y: this.currentY,
        size: 10,
        font: this.font,
        color: rgb(0.4, 0.4, 0.4)
      })
      this.currentY -= 15
    }

    this.currentY -= 20
  }

  private async drawItemsTable(items: QuoteItem[]) {
    const tableY = this.currentY
    const tableWidth = this.pageWidth - (this.margin * 2)
    const rowHeight = 25
    const headerHeight = 30

    // Table header background
    this.currentPage.drawRectangle({
      x: this.margin,
      y: tableY - headerHeight,
      width: tableWidth,
      height: headerHeight,
      color: rgb(0.95, 0.95, 0.95)
    })

    // Table border
    this.currentPage.drawRectangle({
      x: this.margin,
      y: tableY - headerHeight,
      width: tableWidth,
      height: headerHeight,
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 1
    })

    // Column widths
    const col1Width = tableWidth * 0.45 // Description
    const col2Width = tableWidth * 0.15 // Quantity
    const col3Width = tableWidth * 0.2  // Price
    const col4Width = tableWidth * 0.2  // Total

    // Headers
    this.currentPage.drawText('DESCRIPCIÓN', {
      x: this.margin + 10,
      y: tableY - 20,
      size: 10,
      font: this.boldFont,
      color: rgb(0, 0, 0)
    })

    this.currentPage.drawText('CANT.', {
      x: this.margin + col1Width + 10,
      y: tableY - 20,
      size: 10,
      font: this.boldFont,
      color: rgb(0, 0, 0)
    })

    this.currentPage.drawText('PRECIO', {
      x: this.margin + col1Width + col2Width + 10,
      y: tableY - 20,
      size: 10,
      font: this.boldFont,
      color: rgb(0, 0, 0)
    })

    this.currentPage.drawText('TOTAL', {
      x: this.margin + col1Width + col2Width + col3Width + 10,
      y: tableY - 20,
      size: 10,
      font: this.boldFont,
      color: rgb(0, 0, 0)
    })

    this.currentY = tableY - headerHeight

    // Items
    items.forEach((item, index) => {
      const itemY = this.currentY - (rowHeight * (index + 1))
      
      // Alternate row background
      if (index % 2 === 0) {
        this.currentPage.drawRectangle({
          x: this.margin,
          y: itemY,
          width: tableWidth,
          height: rowHeight,
          color: rgb(0.98, 0.98, 0.98)
        })
      }

      // Item description
      this.currentPage.drawText(item.product_name, {
        x: this.margin + 10,
        y: itemY + 8,
        size: 10,
        font: this.font,
        color: rgb(0, 0, 0)
      })

      // Quantity
      this.currentPage.drawText(item.quantity.toString(), {
        x: this.margin + col1Width + 10,
        y: itemY + 8,
        size: 10,
        font: this.font,
        color: rgb(0, 0, 0)
      })

      // Price
      this.currentPage.drawText(formatCurrency(item.price), {
        x: this.margin + col1Width + col2Width + 10,
        y: itemY + 8,
        size: 10,
        font: this.font,
        color: rgb(0, 0, 0)
      })

      // Total
      this.currentPage.drawText(formatCurrency(item.total), {
        x: this.margin + col1Width + col2Width + col3Width + 10,
        y: itemY + 8,
        size: 10,
        font: this.font,
        color: rgb(0, 0, 0)
      })

      // Row border
      this.currentPage.drawLine({
        start: { x: this.margin, y: itemY },
        end: { x: this.margin + tableWidth, y: itemY },
        color: rgb(0.9, 0.9, 0.9),
        thickness: 0.5
      })
    })

    // Final table border
    const finalY = this.currentY - (rowHeight * items.length)
    this.currentPage.drawRectangle({
      x: this.margin,
      y: finalY,
      width: tableWidth,
      height: headerHeight + (rowHeight * items.length),
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 1
    })

    this.currentY = finalY - 30
  }

  private async drawTotals(quote: Quote) {
    const rightX = this.pageWidth - 200

    // Subtotal
    this.currentPage.drawText('Subtotal:', {
      x: rightX,
      y: this.currentY,
      size: 10,
      font: this.font,
      color: rgb(0, 0, 0)
    })

    this.currentPage.drawText(formatCurrency(quote.subtotal), {
      x: rightX + 100,
      y: this.currentY,
      size: 10,
      font: this.font,
      color: rgb(0, 0, 0)
    })
    this.currentY -= 20

    // Tax
    this.currentPage.drawText('IVA (19%):', {
      x: rightX,
      y: this.currentY,
      size: 10,
      font: this.font,
      color: rgb(0, 0, 0)
    })

    this.currentPage.drawText(formatCurrency(quote.tax_amount), {
      x: rightX + 100,
      y: this.currentY,
      size: 10,
      font: this.font,
      color: rgb(0, 0, 0)
    })
    this.currentY -= 30

    // Total
    this.currentPage.drawRectangle({
      x: rightX - 10,
      y: this.currentY - 10,
      width: 160,
      height: 25,
      color: rgb(0.96, 0.62, 0.04) // Secondary color
    })

    this.currentPage.drawText('TOTAL:', {
      x: rightX,
      y: this.currentY,
      size: 12,
      font: this.boldFont,
      color: rgb(1, 1, 1)
    })

    this.currentPage.drawText(formatCurrency(quote.total), {
      x: rightX + 80,
      y: this.currentY,
      size: 12,
      font: this.boldFont,
      color: rgb(1, 1, 1)
    })
    this.currentY -= 60
  }

  private async drawTermsAndConditions() {
    // Terms section
    this.currentPage.drawText('TÉRMINOS Y CONDICIONES:', {
      x: this.margin,
      y: this.currentY,
      size: 12,
      font: this.boldFont,
      color: rgb(0, 0, 0)
    })
    this.currentY -= 20

    const terms = [
      '• Esta cotización es válida por 30 días desde la fecha de emisión.',
      '• Los precios incluyen IVA cuando aplica.',
      '• Para proceder con el pedido, debe aceptar formalmente esta cotización.',
      '• Los tiempos de entrega se confirmarán al momento de la orden.',
      '• Forma de pago: Según acuerdo comercial.'
    ]

    terms.forEach(term => {
      this.currentPage.drawText(term, {
        x: this.margin,
        y: this.currentY,
        size: 9,
        font: this.font,
        color: rgb(0.2, 0.2, 0.2)
      })
      this.currentY -= 15
    })

    this.currentY -= 20
  }

  private async drawFooter(company: any) {
    if (this.currentY < 150) {
      this.currentY = 150
    }

    // Acceptance section
    this.currentPage.drawRectangle({
      x: this.margin,
      y: this.currentY - 60,
      width: this.pageWidth - (this.margin * 2),
      height: 50,
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 1
    })

    this.currentPage.drawText('ACEPTACIÓN DE COTIZACIÓN:', {
      x: this.margin + 10,
      y: this.currentY - 20,
      size: 10,
      font: this.boldFont,
      color: rgb(0, 0, 0)
    })

    this.currentPage.drawText('Nombre y Firma: _________________________    Fecha: _____________', {
      x: this.margin + 10,
      y: this.currentY - 40,
      size: 9,
      font: this.font,
      color: rgb(0.4, 0.4, 0.4)
    })

    this.currentY -= 80

    // Footer line
    this.currentPage.drawLine({
      start: { x: this.margin, y: 50 },
      end: { x: this.pageWidth - this.margin, y: 50 },
      color: rgb(0.8, 0.8, 0.8),
      thickness: 1
    })

    // Footer text
    this.currentPage.drawText(`Generado por FacturaSaaS - ${new Date().toLocaleDateString('es-CO')}`, {
      x: this.margin,
      y: 30,
      size: 8,
      font: this.font,
      color: rgb(0.6, 0.6, 0.6)
    })

    this.currentPage.drawText('Gracias por considerar nuestros servicios', {
      x: this.pageWidth - 250,
      y: 30,
      size: 8,
      font: this.font,
      color: rgb(0.6, 0.6, 0.6)
    })
  }

  private getStatusText(status: string): string {
    const statusMap = {
      'draft': 'Borrador',
      'sent': 'Enviada',
      'accepted': 'Aceptada',
      'rejected': 'Rechazada',
      'expired': 'Vencida'
    }
    return statusMap[status as keyof typeof statusMap] || status
  }

  private getStatusColor(status: string) {
    const colorMap = {
      'draft': rgb(0.5, 0.5, 0.5),
      'sent': rgb(0, 0.5, 1),
      'accepted': rgb(0, 0.7, 0.3),
      'rejected': rgb(1, 0.3, 0.3),
      'expired': rgb(1, 0.6, 0)
    }
    return colorMap[status as keyof typeof colorMap] || rgb(0, 0, 0)
  }
}

// Helper function to generate quote PDF
export async function generateQuotePDF(quoteData: QuotePDFData): Promise<Uint8Array> {
  const generator = new QuotePDFGenerator()
  return generator.generateQuotePDF(quoteData)
}

// Helper function to download PDF
export function downloadPDF(pdfBytes: Uint8Array, filename: string) {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}