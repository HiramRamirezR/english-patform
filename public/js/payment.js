// public/js/payment.js
// Mercado Pago Checkout Integration

/**
 * Inicia el flujo de suscripción premium ($300/mes)
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
                        <div style="font-size: 2rem; font-weight: 800; color: #38bdf8; line-height: 1;">$300</div>
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
            icon: 'info',
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

        const returnUrl = window.location.origin + '/mapa.html';

        const response = await fetch('/.netlify/functions/mercadopago/create-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId,
                userName,
                email,
                returnUrl
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
        Swal.fire({
            title: '💳 Pago manual disponible',
            html: `
                <div style="text-align: left; font-family: 'Outfit', sans-serif;">
                    <p style="font-size:0.9rem; color:#475569; margin-bottom:1rem;">
                        El pago en línea no está disponible temporalmente. Para activar tu acceso:
                    </p>
                    <div style="background:#f0fdf4; border-radius:12px; padding:1rem; margin-bottom:1rem;">
                        <p style="font-size:0.85rem; color:#166534; margin-bottom:0.5rem; font-weight:600;">1. Transfiere $300 MXN</p>
                        <p style="font-size:0.85rem; color:#166534;">Cuenta: <strong>Hiram Morales</strong></p>
                        <p style="font-size:0.85rem; color:#166534;">CLABE: <strong>0121 8001 5820 7709 91</strong> (BBVA)</p>
                    </div>
                    <div style="background:#eff6ff; border-radius:12px; padding:1rem; margin-bottom:1rem;">
                        <p style="font-size:0.85rem; color:#1e40af; margin-bottom:0.5rem; font-weight:600;">2. Envía tu comprobante por WhatsApp</p>
                        <a href="https://wa.me/5219931172956?text=Hola%20quiero%20activar%20mi%20cuenta%20Premium%20de%20Moonsforest"
                           target="_blank"
                           style="display:inline-block; background:#22c55e; color:white; text-decoration:none; padding:0.6rem 1.2rem; border-radius:8px; font-weight:600; font-size:0.85rem;">
                            📱 Enviar comprobante
                        </a>
                    </div>
                    <p style="font-size:0.8rem; color:#94a3b8; text-align:center;">Activaré tu acceso en menos de 24 hrs</p>
                </div>
            `,
            icon: 'info',
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#22c55e'
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
