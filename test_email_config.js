// =====================================================
// SCRIPT DE PRUEBA PARA CONFIGURACIÓN DE EMAIL
// =====================================================

const { Resend } = require('resend');
require('dotenv').config({ path: '.env.local' });

async function testEmailConfig() {
    console.log('🔍 Probando configuración de email...\n');
    
    // 1. Verificar variables de entorno
    console.log('📧 Variables de entorno:');
    console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'Configurada ✅' : 'No configurada ❌');
    console.log('RESEND_FROM_EMAIL:', process.env.RESEND_FROM_EMAIL || 'No configurada ❌');
    console.log('NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL || 'No configurada ❌');
    console.log('');
    
    // 2. Verificar API key
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'dummy-key') {
        console.log('❌ API key de Resend no configurada correctamente');
        return;
    }
    
    // 3. Inicializar Resend
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    // 4. Probar envío de email simple
    try {
        console.log('📤 Enviando email de prueba...');
        
        const result = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
            to: 'test@example.com', // Email de prueba
            subject: 'Prueba de configuración de email',
            html: `
                <h1>Prueba de configuración</h1>
                <p>Este es un email de prueba para verificar la configuración de Resend.</p>
                <p>Enviado desde: ${process.env.RESEND_FROM_EMAIL}</p>
                <p>Fecha: ${new Date().toISOString()}</p>
            `
        });
        
        console.log('✅ Email enviado exitosamente!');
        console.log('ID del email:', result.data?.id);
        console.log('Resultado completo:', JSON.stringify(result, null, 2));
        
    } catch (error) {
        console.log('❌ Error al enviar email:');
        console.error(error);
        
        // Mostrar detalles del error
        if (error.response) {
            console.log('Response status:', error.response.status);
            console.log('Response data:', error.response.data);
        }
    }
}

// Ejecutar test
testEmailConfig().catch(console.error);