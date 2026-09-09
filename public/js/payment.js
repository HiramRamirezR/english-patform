// public/js/payment.js
// Mercado Pago Checkout Integration
import { sendDiscordNotification } from './discord.js';

/**
 * Inicia el flujo de suscripción premium ($100/mes)
 * Llama a la Netlify Function y redirige a Mercado Pago
 */
export async function startSubscription(userId, userName, email) {
    try {
        const result = await Swal.fire({
            title: '🌲 Suscripción Premium',
            html: `
                <div style="text-align: left; font-family: 'Outfit', sans-serif;">
                    <p style="font-size:0.9rem; color:#475569; margin-bottom:1rem;">
                        Estás a punto de suscribirte a <strong>Moonsforest Premium</strong>.
                    </p>
                    <div style="background: linear-gradient(135deg, #0f172a, #1e3a5f); border-radius: 16px; padding: 1.5rem; margin-bottom: 1rem; text-align: center;">
                        <div style="font-size: 2rem; font-weight: 800; color: #38bdf8; line-height: 1;">$100</div>
                        <div style="font-size: 0.85rem; color: #94a3b8;">MXN al mes</div>
                    </div>
                    <ul style="list-style: none; padding: 0; margin: 0; font-size: 0.85rem; color: #475569;">
                        <li style="padding: 0.3rem 0;">🎙️ <strong>4 evaluaciones al mes</strong> con feedback personalizado</li>
                        <li style="padding: 0.3rem 0;">🗂️ Avance progresivo por módulos</li>
                        <li style="padding: 0.3rem 0;">📊 Tu progreso guardado para siempre</li>
                        <li style="padding: 0.3rem 0;">🔄 Cancela cuando quieras</li>
                    </ul>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: '💳 Ir a pagar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#38bdf8',
            cancelButtonColor: '#64748b',
            allowOutsideClick: false
        });

        if (!result.isConfirmed) return;

        Swal.fire({
            title: 'Conectando con Mercado Pago...',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        const response = await fetch('/.netlify/functions/mercadopago/create-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId,
                userName,
                email
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Error al conectar con Mercado Pago');
        }

        Swal.close();

        // Redirigir a Mercado Pago Checkout
        window.location.href = data.init_point;

    } catch (error) {
        window.devWarn("Error en suscripción:", error);

        sendDiscordNotification(
            '❌ Error al iniciar pago',
            `**Usuario:** ${userName || 'Desconocido'}\n**UID:** ${userId}\n**Error:** ${error.message}`,
            15548997,
            null,
            'errores'
        );

        Swal.fire({
            title: 'Algo salió mal',
            html: `
                <div style="text-align: center; font-family: 'Outfit', sans-serif;">
                    <p style="font-size: 0.9rem; color: #475569; margin-bottom: 0.5rem;">
                        No pudimos conectar con el sistema de pagos.
                    </p>
                    <p style="font-size: 0.85rem; color: #94a3b8;">
                        Estamos trabajando para solucionarlo. Intenta de nuevo en unos minutos.
                    </p>
                </div>
            `,
            icon: 'error',
            confirmButtonColor: '#38bdf8',
            confirmButtonText: 'Entendido'
        });
    }
}

/**
 * Procesa el retorno de Mercado Pago (success/failure)
 * Se llama desde mapa.js al cargar la página con ?payment=success
 */
export async function handlePaymentReturn(userId) {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('payment');

    if (status === 'success') {
        Swal.fire({
            title: '🎉 ¡Suscripción Activada!',
            html: `
                <p style="font-size:0.95rem; color:#475569;">
                    Bienvenido a Moonsforest Premium. Ya puedes solicitar tus evaluaciones y avanzar en el bosque.
                </p>
            `,
            icon: 'success',
            confirmButtonColor: '#22c55e',
            confirmButtonText: '🌲 ¡Comenzar!'
        });

        // Limpiar URL sin recargar
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);

        // Recargar perfil desde Firestore
        if (window.location.pathname.includes('mapa.html')) {
            window.location.reload();
        }
    } else if (status === 'failed') {
        Swal.fire({
            title: 'Pago no completado',
            text: 'La suscripción no se procesó. Si crees que es un error, intenta de nuevo.',
            icon: 'warning',
            confirmButtonColor: '#f97316'
        });

        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
    }
}
