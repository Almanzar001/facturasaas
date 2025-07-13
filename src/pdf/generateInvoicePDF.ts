import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { Invoice, InvoiceItem } from '@/services/invoices'
import { Client } from '@/services/clients'
import { Payment } from '@/services/payments'
import { formatCurrency } from '@/utils/formatCurrency'

export interface InvoicePDFData {
  invoice: Invoice
  client: Client
  items: InvoiceItem[]
  payments: Payment[]
  company: {
    name: string
    rnc?: string
    address?: string
    phone?: string
    email?: string
    logo?: string
    tax_rate?: number
  }
}

export class InvoicePDFGenerator {
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

  async generateInvoicePDF(data: InvoicePDFData): Promise<Uint8Array> {
    this.doc = await PDFDocument.create()
    this.font = await this.doc.embedFont(StandardFonts.Helvetica)
    this.boldFont = await this.doc.embedFont(StandardFonts.HelveticaBold)
    
    this.currentPage = this.doc.addPage([this.pageWidth, this.pageHeight])
    this.currentY = this.pageHeight - this.margin

    // Generate PDF content
    await this.drawHeader(data.company)
    await this.drawInvoiceInfo(data.invoice)
    await this.drawClientInfo(data.client, data.invoice)
    await this.drawItemsTable(data.items)
    await this.drawPaymentsTable(data.payments)
    await this.drawTotals(data.invoice, data.payments, data.company.tax_rate || 18)
    await this.drawFooter(data.company)

    return this.doc.save()
  }

  private async drawHeader(company: any) {
    const { name, rnc, address, phone, email, logo } = company
    
    let logoY = this.currentY
    
    // Logo si existe
    if (logo) {
      try {
        const logoImage = await fetch(logo).then(res => res.arrayBuffer())
        let logoImageEmbed
        
        // Intentar diferentes formatos
        try {
          // Primero intentar como PNG
          logoImageEmbed = await this.doc.embedPng(new Uint8Array(logoImage))
        } catch {
          try {
            // Si falla, intentar como JPEG
            logoImageEmbed = await this.doc.embedJpg(new Uint8Array(logoImage))
          } catch (error) {
            console.error('Error embedding logo:', error)
            logoImageEmbed = null
          }
        }
        
        if (logoImageEmbed) {
          const maxLogoHeight = 60
          const scale = maxLogoHeight / logoImageEmbed.height
          const logoDims = logoImageEmbed.scale(scale)
          
          this.currentPage.drawImage(logoImageEmbed, {
            x: this.margin,
            y: logoY - logoDims.height,
            width: logoDims.width,
            height: logoDims.height,
          })
          
          // Ajustar posición para el texto
          this.margin += logoDims.width + 20
        }
      } catch (error) {
        console.error('Error loading logo:', error)
      }
    }
    
    // Company name
    this.currentPage.drawText(name || 'Mi Empresa', {
      x: this.margin,
      y: this.currentY,
      size: 24,
      font: this.boldFont,
      color: rgb(0.12, 0.25, 0.69)
    })
    this.currentY -= 35

    // RNC
    if (rnc) {
      this.currentPage.drawText(`RNC: ${rnc}`, {
        x: this.margin,
        y: this.currentY,
        size: 10,
        font: this.font,
        color: rgb(0.4, 0.4, 0.4)
      })
      this.currentY -= 15
    }

    // Address
    if (address) {
      this.currentPage.drawText(address, {
        x: this.margin,
        y: this.currentY,
        size: 10,
        font: this.font,
        color: rgb(0.4, 0.4, 0.4)
      })
      this.currentY -= 15
    }

    // Contact info
    const contactInfo = []
    if (phone) contactInfo.push(`Tel: ${phone}`)
    if (email) contactInfo.push(`Email: ${email}`)
    
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

    this.currentY -= 25

    // Reset margin if logo was added
    if (logo) {
      this.margin = 50
    }

    // Title
    this.currentPage.drawText('FACTURA', {
      x: this.pageWidth - 150,
      y: this.pageHeight - this.margin,
      size: 18,
      font: this.boldFont,
      color: rgb(0.12, 0.25, 0.69)
    })
  }

  private async drawInvoiceInfo(invoice: Invoice) {
    const rightX = this.pageWidth - 200

    // Invoice number
    this.currentPage.drawText(`Factura No: ${invoice.invoice_number}`, {
      x: rightX,
      y: this.pageHeight - this.margin - 35,
      size: 12,
      font: this.boldFont,
      color: rgb(0, 0, 0)
    })

    // NCF (Número de Comprobante Fiscal)
    if (invoice.fiscal_number) {
      this.currentPage.drawText(`NCF: ${invoice.fiscal_number}`, {
        x: rightX,
        y: this.pageHeight - this.margin - 50,
        size: 11,
        font: this.boldFont,
        color: rgb(0.8, 0, 0)
      })
    }

    // Invoice date
    const dateY = invoice.fiscal_number ? this.pageHeight - this.margin - 70 : this.pageHeight - this.margin - 55
    this.currentPage.drawText(`Fecha: ${new Date(invoice.date).toLocaleDateString('es-DO')}`, {
      x: rightX,
      y: dateY,
      size: 10,
      font: this.font,
      color: rgb(0.4, 0.4, 0.4)
    })

    // Due date
    if (invoice.due_date) {
      this.currentPage.drawText(`Vence: ${new Date(invoice.due_date).toLocaleDateString('es-DO')}`, {
        x: rightX,
        y: dateY - 20,
        size: 10,
        font: this.font,
        color: rgb(0.4, 0.4, 0.4)
      })
    }

    // Status
    const statusText = this.getStatusText(invoice.status)
    const statusColor = this.getStatusColor(invoice.status)
    
    this.currentPage.drawText(`Estado: ${statusText}`, {
      x: rightX,
      y: this.pageHeight - this.margin - 95,
      size: 10,
      font: this.boldFont,
      color: statusColor
    })
  }

  private async drawClientInfo(client: Client, invoice: Invoice) {
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

    // Client tax ID (RNC/Cédula)
    const taxId = invoice.client_tax_id || client.identification
    if (taxId) {
      this.currentPage.drawText(`RNC/Cédula: ${taxId}`, {
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

  private async drawItemsTable(items: InvoiceItem[]) {
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

  private async drawPaymentsTable(payments: Payment[]) {
    if (payments.length === 0) {
      return
    }

    const tableY = this.currentY
    const tableWidth = this.pageWidth - (this.margin * 2)
    const rowHeight = 25
    const headerHeight = 30

    // Section title
    this.currentPage.drawText('HISTORIAL DE PAGOS', {
      x: this.margin,
      y: tableY,
      size: 12,
      font: this.boldFont,
      color: rgb(0, 0, 0)
    })
    this.currentY = tableY - 25

    // Table header background
    this.currentPage.drawRectangle({
      x: this.margin,
      y: this.currentY - headerHeight,
      width: tableWidth,
      height: headerHeight,
      color: rgb(0.95, 0.95, 0.95)
    })

    // Table border
    this.currentPage.drawRectangle({
      x: this.margin,
      y: this.currentY - headerHeight,
      width: tableWidth,
      height: headerHeight,
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 1
    })

    // Column widths
    const col1Width = tableWidth * 0.2  // Date
    const col2Width = tableWidth * 0.25 // Method
    const col3Width = tableWidth * 0.2  // Amount
    const col4Width = tableWidth * 0.35 // Notes

    // Headers
    this.currentPage.drawText('FECHA', {
      x: this.margin + 10,
      y: this.currentY - 20,
      size: 10,
      font: this.boldFont,
      color: rgb(0, 0, 0)
    })

    this.currentPage.drawText('MÉTODO', {
      x: this.margin + col1Width + 10,
      y: this.currentY - 20,
      size: 10,
      font: this.boldFont,
      color: rgb(0, 0, 0)
    })

    this.currentPage.drawText('MONTO', {
      x: this.margin + col1Width + col2Width + 10,
      y: this.currentY - 20,
      size: 10,
      font: this.boldFont,
      color: rgb(0, 0, 0)
    })

    this.currentPage.drawText('NOTAS', {
      x: this.margin + col1Width + col2Width + col3Width + 10,
      y: this.currentY - 20,
      size: 10,
      font: this.boldFont,
      color: rgb(0, 0, 0)
    })

    this.currentY = this.currentY - headerHeight

    // Payment rows
    payments.forEach((payment, index) => {
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

      // Payment date
      this.currentPage.drawText(new Date(payment.payment_date).toLocaleDateString('es-CO'), {
        x: this.margin + 10,
        y: itemY + 8,
        size: 10,
        font: this.font,
        color: rgb(0, 0, 0)
      })

      // Payment method
      const methodText = this.getPaymentMethodText(payment.payment_method)
      this.currentPage.drawText(methodText, {
        x: this.margin + col1Width + 10,
        y: itemY + 8,
        size: 10,
        font: this.font,
        color: rgb(0, 0, 0)
      })

      // Amount
      this.currentPage.drawText(formatCurrency(payment.amount), {
        x: this.margin + col1Width + col2Width + 10,
        y: itemY + 8,
        size: 10,
        font: this.font,
        color: rgb(0, 0, 0)
      })

      // Notes
      const notes = payment.notes || '-'
      const maxNotesLength = 35
      const truncatedNotes = notes.length > maxNotesLength ? notes.substring(0, maxNotesLength) + '...' : notes
      this.currentPage.drawText(truncatedNotes, {
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
    const finalY = this.currentY - (rowHeight * payments.length)
    this.currentPage.drawRectangle({
      x: this.margin,
      y: finalY,
      width: tableWidth,
      height: headerHeight + (rowHeight * payments.length),
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 1
    })

    this.currentY = finalY - 30
  }

  private async drawTotals(invoice: Invoice, payments: Payment[], taxRate: number) {
    const rightX = this.pageWidth - 200

    // Background for totals section
    this.currentPage.drawRectangle({
      x: rightX - 10,
      y: this.currentY - 150,
      width: 210,
      height: 150,
      color: rgb(0.98, 0.98, 0.98)
    })

    // Subtotal
    this.currentPage.drawText('Subtotal:', {
      x: rightX,
      y: this.currentY,
      size: 10,
      font: this.font,
      color: rgb(0, 0, 0)
    })

    this.currentPage.drawText(formatCurrency(invoice.subtotal), {
      x: rightX + 100,
      y: this.currentY,
      size: 10,
      font: this.font,
      color: rgb(0, 0, 0)
    })
    this.currentY -= 20

    // Tax
    const taxLabel = invoice.tax_amount > 0 ? `ITBIS (${taxRate}%):` : 'ITBIS:'
    this.currentPage.drawText(taxLabel, {
      x: rightX,
      y: this.currentY,
      size: 10,
      font: this.font,
      color: rgb(0, 0, 0)
    })

    this.currentPage.drawText(formatCurrency(invoice.tax_amount), {
      x: rightX + 100,
      y: this.currentY,
      size: 10,
      font: this.font,
      color: rgb(0, 0, 0)
    })
    this.currentY -= 20

    // Total
    this.currentPage.drawRectangle({
      x: rightX - 10,
      y: this.currentY - 10,
      width: 160,
      height: 25,
      color: rgb(0.12, 0.25, 0.69)
    })

    this.currentPage.drawText('TOTAL:', {
      x: rightX,
      y: this.currentY,
      size: 12,
      font: this.boldFont,
      color: rgb(1, 1, 1)
    })

    this.currentPage.drawText(formatCurrency(invoice.total), {
      x: rightX + 80,
      y: this.currentY,
      size: 12,
      font: this.boldFont,
      color: rgb(1, 1, 1)
    })
    this.currentY -= 30

    // Calculate total paid from payments
    const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0)
    
    // Total paid
    if (totalPaid > 0) {
      this.currentPage.drawText('Total Pagado:', {
        x: rightX,
        y: this.currentY,
        size: 10,
        font: this.font,
        color: rgb(0, 0, 0)
      })

      this.currentPage.drawText(formatCurrency(totalPaid), {
        x: rightX + 100,
        y: this.currentY,
        size: 10,
        font: this.font,
        color: rgb(0, 0, 0)
      })
      this.currentY -= 20

      // Balance due
      const balanceDue = invoice.total - totalPaid
      if (balanceDue > 0) {
        // Línea separadora
        this.currentPage.drawLine({
          start: { x: rightX, y: this.currentY + 5 },
          end: { x: rightX + 190, y: this.currentY + 5 },
          color: rgb(0.6, 0.6, 0.6),
          thickness: 0.5
        })
        this.currentY -= 5

        this.currentPage.drawRectangle({
          x: rightX - 10,
          y: this.currentY - 15,
          width: 210,
          height: 30,
          color: rgb(1, 0.9, 0.9)
        })

        this.currentPage.drawRectangle({
          x: rightX - 10,
          y: this.currentY - 15,
          width: 210,
          height: 30,
          borderColor: rgb(0.8, 0.2, 0.2),
          borderWidth: 1
        })

        this.currentPage.drawText('SALDO PENDIENTE:', {
          x: rightX,
          y: this.currentY,
          size: 12,
          font: this.boldFont,
          color: rgb(0.8, 0.2, 0.2)
        })

        this.currentPage.drawText(formatCurrency(balanceDue), {
          x: rightX + 110,
          y: this.currentY,
          size: 12,
          font: this.boldFont,
          color: rgb(0.8, 0.2, 0.2)
        })
        this.currentY -= 35
      } else {
        // Show "PAGADO" if balance is zero or negative
        this.currentPage.drawRectangle({
          x: rightX - 10,
          y: this.currentY - 10,
          width: 160,
          height: 25,
          color: rgb(0, 0.7, 0.3)
        })

        this.currentPage.drawText('PAGADO', {
          x: rightX + 40,
          y: this.currentY,
          size: 11,
          font: this.boldFont,
          color: rgb(1, 1, 1)
        })
        this.currentY -= 30
      }
    } else {
      this.currentY -= 10
    }
  }

  private async drawFooter(company: any) {
    if (this.currentY < 100) {
      this.currentY = 100
    }

    // Notes section
    this.currentPage.drawText('NOTAS:', {
      x: this.margin,
      y: this.currentY,
      size: 10,
      font: this.boldFont,
      color: rgb(0, 0, 0)
    })
    this.currentY -= 20

    this.currentPage.drawText('Gracias por su compra. Para cualquier consulta, contáctenos.', {
      x: this.margin,
      y: this.currentY,
      size: 9,
      font: this.font,
      color: rgb(0.4, 0.4, 0.4)
    })
    this.currentY -= 30

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
  }

  private getPaymentMethodText(method: string): string {
    const methodMap = {
      'efectivo': 'Efectivo',
      'transferencia': 'Transferencia',
      'tarjeta': 'Tarjeta',
      'cheque': 'Cheque',
      'otro': 'Otro'
    }
    return methodMap[method as keyof typeof methodMap] || method
  }

  private getStatusText(status: string): string {
    const statusMap = {
      'draft': 'Borrador',
      'sent': 'Enviada',
      'paid': 'Pagada',
      'overdue': 'Vencida'
    }
    return statusMap[status as keyof typeof statusMap] || status
  }

  private getStatusColor(status: string) {
    const colorMap = {
      'draft': rgb(0.5, 0.5, 0.5),
      'sent': rgb(0, 0.5, 1),
      'paid': rgb(0, 0.7, 0.3),
      'overdue': rgb(1, 0.3, 0.3)
    }
    return colorMap[status as keyof typeof colorMap] || rgb(0, 0, 0)
  }
}

// Helper function to generate invoice PDF
export async function generateInvoicePDF(invoiceData: InvoicePDFData): Promise<Uint8Array> {
  const generator = new InvoicePDFGenerator()
  return generator.generateInvoicePDF(invoiceData)
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