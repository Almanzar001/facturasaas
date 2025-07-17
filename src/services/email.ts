import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 'dummy-key');

export interface InvitationEmailData {
  invitedEmail: string;
  invitedByName: string;
  invitedByEmail: string;
  organizationName: string;
  invitationToken: string;
  expiresAt: string;
  role: string;
}

export class EmailService {
  private static getBaseUrl(): string {
    if (process.env.NODE_ENV === 'production') {
      return process.env.NEXT_PUBLIC_APP_URL || 'https://yourapp.com';
    }
    return 'http://localhost:3000';
  }

  private static getInvitationUrl(token: string): string {
    return `${this.getBaseUrl()}/invitations?token=${token}`;
  }

  static async sendInvitationEmail(data: InvitationEmailData): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if Resend API key is configured
      if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'dummy-key') {
        console.warn('RESEND_API_KEY not configured, skipping email send');
        return { success: true }; // Return success to not break the flow
      }

      const invitationUrl = this.getInvitationUrl(data.invitationToken);
      
      const expirationDate = new Date(data.expiresAt).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const emailContent = this.generateInvitationEmailHTML({
        ...data,
        invitationUrl,
        expirationDate
      });

      const result = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@yourapp.com',
        to: data.invitedEmail,
        subject: `Invitación a ${data.organizationName}`,
        html: emailContent
      });

      if (result.error) {
        console.error('Error sending invitation email:', result.error);
        return { success: false, error: result.error.message };
      }

      console.log('Invitation email sent successfully:', result.data?.id);
      return { success: true };
    } catch (error) {
      console.error('Error in sendInvitationEmail:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  private static generateInvitationEmailHTML(data: InvitationEmailData & { invitationUrl: string; expirationDate: string }): string {
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invitación a ${data.organizationName}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8fafc;
          }
          
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }
          
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
          }
          
          .header h1 {
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 10px;
          }
          
          .header p {
            font-size: 16px;
            opacity: 0.9;
          }
          
          .content {
            padding: 40px 30px;
          }
          
          .invitation-details {
            background-color: #f8fafc;
            border-radius: 8px;
            padding: 25px;
            margin: 25px 0;
            border-left: 4px solid #667eea;
          }
          
          .invitation-details h3 {
            color: #374151;
            font-size: 18px;
            margin-bottom: 15px;
          }
          
          .detail-item {
            margin-bottom: 10px;
          }
          
          .detail-label {
            font-weight: 600;
            color: #4b5563;
          }
          
          .detail-value {
            color: #6b7280;
          }
          
          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 16px 32px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            margin: 25px 0;
            transition: transform 0.2s;
          }
          
          .cta-button:hover {
            transform: translateY(-2px);
          }
          
          .expiration-warning {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 6px;
            padding: 15px;
            margin: 25px 0;
            color: #92400e;
          }
          
          .expiration-warning strong {
            color: #b45309;
          }
          
          .footer {
            background-color: #f8fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
          }
          
          .footer p {
            color: #6b7280;
            font-size: 14px;
            margin-bottom: 10px;
          }
          
          .footer a {
            color: #667eea;
            text-decoration: none;
          }
          
          .security-note {
            background-color: #f0f9ff;
            border: 1px solid #0284c7;
            border-radius: 6px;
            padding: 15px;
            margin: 25px 0;
            color: #0c4a6e;
          }
          
          @media (max-width: 600px) {
            .container {
              margin: 0;
              box-shadow: none;
            }
            
            .header, .content, .footer {
              padding: 20px;
            }
            
            .header h1 {
              font-size: 24px;
            }
            
            .cta-button {
              display: block;
              padding: 14px 20px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>¡Has sido invitado!</h1>
            <p>Únete a ${data.organizationName}</p>
          </div>
          
          <div class="content">
            <p>Hola,</p>
            
            <p style="margin: 20px 0;">
              <strong>${data.invitedByName}</strong> (${data.invitedByEmail}) te ha invitado a unirte a <strong>${data.organizationName}</strong>.
            </p>
            
            <div class="invitation-details">
              <h3>📋 Detalles de la Invitación</h3>
              <div class="detail-item">
                <span class="detail-label">Organización:</span>
                <span class="detail-value">${data.organizationName}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Invitado por:</span>
                <span class="detail-value">${data.invitedByName} (${data.invitedByEmail})</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Tu email:</span>
                <span class="detail-value">${data.invitedEmail}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Rol asignado:</span>
                <span class="detail-value">${data.role === 'admin' ? 'Administrador' : 'Miembro'}</span>
              </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.invitationUrl}" class="cta-button">
                🚀 Aceptar Invitación
              </a>
            </div>
            
            <div class="expiration-warning">
              <strong>⏰ Importante:</strong> Esta invitación expira el <strong>${data.expirationDate}</strong>. 
              Asegúrate de aceptarla antes de esa fecha.
            </div>
            
            <div class="security-note">
              <strong>🔒 Nota de Seguridad:</strong> Si no esperabas esta invitación o no conoces al remitente, 
              puedes ignorar este email de forma segura.
            </div>
            
            <p style="margin-top: 30px; color: #6b7280;">
              Si tienes problemas con el botón, también puedes copiar y pegar este enlace en tu navegador:
            </p>
            <p style="word-break: break-all; color: #667eea; font-size: 14px; margin-top: 10px;">
              ${data.invitationUrl}
            </p>
          </div>
          
          <div class="footer">
            <p>Este email fue enviado desde el sistema de invitaciones de ${data.organizationName}.</p>
            <p>Si tienes preguntas, contacta con ${data.invitedByEmail}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}