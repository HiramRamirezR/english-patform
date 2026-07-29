// functions/mercadopago.js
// Netlify Function: Mercado Pago subscription + webhook handler

const MERCADO_PAGO_API = 'https://api.mercadopago.com';

// Firebase lazy init
let firebaseApp = null;
function getFirestoreDB() {
    if (firebaseApp) return require('firebase-admin/firestore').getFirestore();
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    const { initializeApp, cert } = require('firebase-admin/app');
    firebaseApp = initializeApp({ credential: cert(serviceAccount) });
    return require('firebase-admin/firestore').getFirestore();
}

exports.handler = async function (event, context) {
    const path = event.path.replace('/.netlify/functions/mercadopago', '');
    const MP_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;

    if (!MP_ACCESS_TOKEN) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Mercado Pago no configurado. Falta MERCADO_PAGO_ACCESS_TOKEN' })
        };
    }

    try {
        // --- VALIDAR PREMIUM (server-side) ---
        if (path === '/validate-premium' && event.httpMethod === 'POST') {
            const { userId } = JSON.parse(event.body);
            if (!userId) {
                return { statusCode: 400, body: JSON.stringify({ valid: false, error: 'userId requerido' }) };
            }

            const db = getFirestoreDB();
            const userDoc = await db.collection('users').doc(userId).get();
            if (!userDoc.exists) {
                return { statusCode: 404, body: JSON.stringify({ valid: false, error: 'Usuario no encontrado' }) };
            }

            const data = userDoc.data();
            const now = new Date();
            const premiumUntil = data.premiumUntil ? new Date(data.premiumUntil) : null;
            const isValid = data.isPremium === true && premiumUntil && premiumUntil > now;

            return {
                statusCode: 200,
                body: JSON.stringify({ valid: isValid, premiumUntil: premiumUntil?.toISOString() || null })
            };
        }

        // --- WEBHOOK: Recibir notificaciones de pago ---
        if (path === '/webhook' && event.httpMethod === 'POST') {
            const body = JSON.parse(event.body);

            // Verificar firma HMAC-SHA256
            const webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
            if (webhookSecret) {
                const signature = event.headers['x-signature'];
                if (!signature) {
                    console.warn("⚠️ Webhook MP sin firma — rechazado");
                    return { statusCode: 401, body: JSON.stringify({ error: 'Firma requerida' }) };
                }
                const parts = Object.fromEntries(
                    signature.split(',').map(p => p.split('='))
                );
                const dataId = body.data?.id || body.resource?.id || '';
                const manifest = `id:${dataId};request-id:${event.headers['x-request-id'] || ''};ts:${parts.ts || ''};`;
                const crypto = require('crypto');
                const expected = crypto.createHmac('sha256', webhookSecret).update(manifest).digest('hex');
                if (parts.v1 !== expected) {
                    console.warn("⚠️ Firma MP inválida — rechazado");
                    return { statusCode: 401, body: JSON.stringify({ error: 'Firma inválida' }) };
                }
            }

            console.log("📡 Webhook MP recibido:", JSON.stringify(body, null, 2));

            const topic = body.topic || body.type;
            const resourceId = body.resource?.id || body.data?.id;

            if (!resourceId) {
                return { statusCode: 200, body: 'OK' };
            }

            // Obtener datos del pago/aprobación
            let paymentData = null;

            if (topic === 'preapproval' || topic === 'subscription') {
                const resp = await fetch(`${MERCADO_PAGO_API}/preapproval/${resourceId}`, {
                    headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
                });
                paymentData = await resp.json();
            } else if (topic === 'payment') {
                const resp = await fetch(`${MERCADO_PAGO_API}/v1/payments/${resourceId}`, {
                    headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
                });
                const payment = await resp.json();
                const prefResp = await fetch(`${MERCADO_PAGO_API}/preapproval/${payment.preapproval_id}`, {
                    headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
                });
                paymentData = await prefResp.json();
            }

            if (paymentData && paymentData.status === 'authorized') {
                const externalRef = paymentData.external_reference;
                if (externalRef) {
                    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
                        console.error("No FIREBASE_SERVICE_ACCOUNT configured");
                        return { statusCode: 200, body: 'OK' };
                    }

                    const db = getFirestoreDB();
                    const userRef = db.collection('users').doc(externalRef);

                    const premiumUntil = new Date();
                    premiumUntil.setMonth(premiumUntil.getMonth() + 1);

                    await userRef.update({
                        isPremium: true,
                        premiumUntil: premiumUntil.toISOString(),
                        mpSubscriptionId: resourceId,
                        updatedAt: new Date().toISOString()
                    });

                    console.log(`✅ Premium activado para usuario: ${externalRef} hasta ${premiumUntil.toISOString()}`);
                }
            }

            return { statusCode: 200, body: 'OK' };
        }

        // --- CREAR SUSCRIPCIÓN ---
        if (path === '/create-subscription' && event.httpMethod === 'POST') {
            const { userId, userName, email, returnUrl } = JSON.parse(event.body);

            if (!userId || !email) {
                return { statusCode: 400, body: JSON.stringify({ error: 'userId y email requeridos' }) };
            }

            const successUrl = returnUrl || `${process.env.URL || 'https://moonsforest.com'}/mapa.html?payment=success`;
            const failureUrl = returnUrl || `${process.env.URL || 'https://moonsforest.com'}/mapa.html?payment=failed`;

            const preference = {
                preapproval_plan_id: null,
                reason: 'Suscripción Mensual Moonsforest 🌲',
                external_reference: userId,
                payer_email: email,
                auto_recurring: {
                    frequency: 1,
                    frequency_type: 'months',
                    transaction_amount: 300,
                    currency_id: 'MXN',
                    repetitions: null,
                    free_trial: null
                },
                back_url: {
                    success: successUrl,
                    failure: failureUrl
                },
                status: 'authorized'
            };

            const resp = await fetch(`${MERCADO_PAGO_API}/preapproval`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(preference)
            });

            const data = await resp.json();

            if (!resp.ok) {
                console.error("MP Error:", data);
                return {
                    statusCode: 500,
                    body: JSON.stringify({ error: 'Error al crear suscripción', detail: data })
                };
            }

            return {
                statusCode: 200,
                body: JSON.stringify({
                    init_point: data.init_point,
                    preapproval_id: data.id
                })
            };
        }

        return { statusCode: 404, body: 'Not found' };

    } catch (error) {
        console.error("Mercado Pago function error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
